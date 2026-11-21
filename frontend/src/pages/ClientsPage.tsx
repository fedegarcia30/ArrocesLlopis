import { useState, useEffect, useCallback } from 'react';
import { getClientes, updateCliente, deleteCliente } from '../api/clientes';
import { getPedidos } from '../api/pedidos';
import { ClientAnalysisModal } from '../components/Clients/ClientAnalysisModal';
import type { Cliente, Pedido } from '../types';
import { eur, fechaCorta, fechaPedido, horaPedido, resumenLineas, totalPedido } from '../utils/pedidos';
import './ClientsPage.css';

type Orden = 'nombre' | 'num_pedidos';

const ESTADO_LABEL: Record<string, string> = {
    nuevo: 'Confirmado', preparando: 'Preparando', listo: 'Listo', entregado: 'Entregado', cancelado: 'Cancelado',
};

function iniciales(nombre: string): string {
    return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

/**
 * Clientes en formato lista + ficha.
 * iPad/PC: lista a la izquierda y ficha a la derecha. Móvil: la ficha se abre a pantalla completa.
 */
export function ClientsPage() {
    const [clients, setClients] = useState<Cliente[]>([]);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [orden, setOrden] = useState<Orden>('nombre');
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<Cliente | null>(null);
    const [analyzing, setAnalyzing] = useState<Cliente | null>(null);

    const load = useCallback(async (p: number) => {
        setLoading(true);
        try {
            const r = await getClientes(search, p, orden, orden === 'num_pedidos' ? 'desc' : 'asc');
            setClients(prev => (p === 1 ? r.clients : [...prev, ...r.clients]));
            setPages(r.pages);
            setTotal(r.total);
            setPage(p);
        } catch (err) {
            console.error('[ClientsPage] Error loading clients:', err);
        } finally {
            setLoading(false);
        }
    }, [search, orden]);

    // Búsqueda con debounce; al cambiar filtro se vuelve a la primera página
    useEffect(() => {
        const t = setTimeout(() => load(1), 250);
        return () => clearTimeout(t);
    }, [load]);

    function handleSaved(c: Cliente) {
        setClients(prev => prev.map(x => (x.id === c.id ? c : x)));
        setSelected(c);
    }

    function handleDeleted(id: number) {
        setClients(prev => prev.filter(c => c.id !== id));
        setTotal(t => t - 1);
        setSelected(null);
    }

    return (
        <div className={`cl-page ${selected ? 'has-selection' : ''}`}>
            <section className="cl-list-pane">
                <header className="cl-header">
                    <h1>Clientes <span className="cl-count">{total}</span></h1>
                    <input
                        type="search"
                        className="cl-search"
                        placeholder="Buscar por nombre o teléfono…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <div className="cl-sort" role="tablist" aria-label="Ordenar">
                        <button role="tab" aria-selected={orden === 'nombre'} className={orden === 'nombre' ? 'active' : ''} onClick={() => setOrden('nombre')}>A–Z</button>
                        <button role="tab" aria-selected={orden === 'num_pedidos'} className={orden === 'num_pedidos' ? 'active' : ''} onClick={() => setOrden('num_pedidos')}>Más pedidos</button>
                    </div>
                </header>

                <div className="cl-list">
                    {clients.map(c => (
                        <button key={c.id} className={`cl-row ${selected?.id === c.id ? 'selected' : ''}`} onClick={() => setSelected(c)}>
                            <span className="cl-avatar">{iniciales(c.nombre)}</span>
                            <span className="cl-row-main">
                                <span className="cl-row-name">{c.nombre}{c.observaciones && <span className="cl-warn" title={c.observaciones}>⚠</span>}</span>
                                <span className="cl-row-sub">{c.telefono || 'Sin teléfono'}{c.direccion ? ` · ${c.direccion}` : ''}</span>
                            </span>
                            <span className="cl-row-orders" title="Pedidos">{c.num_pedidos ?? 0}</span>
                        </button>
                    ))}
                    {!loading && clients.length === 0 && <p className="cl-empty">No se encontraron clientes</p>}
                    {loading && <p className="cl-empty">Cargando…</p>}
                    {!loading && page < pages && (
                        <button className="cl-more" onClick={() => load(page + 1)}>Cargar más ({total - clients.length} restantes)</button>
                    )}
                </div>
            </section>

            <section className="cl-detail-pane">
                {selected ? (
                    <ClientDetail
                        key={selected.id}
                        client={selected}
                        onBack={() => setSelected(null)}
                        onSaved={handleSaved}
                        onDeleted={handleDeleted}
                        onAnalyze={() => setAnalyzing(selected)}
                    />
                ) : (
                    <div className="cl-placeholder">
                        <span>👥</span>
                        <p>Selecciona un cliente para ver su ficha y sus pedidos</p>
                    </div>
                )}
            </section>

            {analyzing && <ClientAnalysisModal client={analyzing} onClose={() => setAnalyzing(null)} />}
        </div>
    );
}

/* ── Ficha de cliente ───────────────────────────── */

interface DetailProps {
    client: Cliente;
    onBack: () => void;
    onSaved: (c: Cliente) => void;
    onDeleted: (id: number) => void;
    onAnalyze: () => void;
}

function ClientDetail({ client, onBack, onSaved, onDeleted, onAnalyze }: DetailProps) {
    const [form, setForm] = useState({
        nombre: client.nombre,
        telefono: client.telefono || '',
        direccion: client.direccion || '',
        codigo_postal: client.codigo_postal || '',
        observaciones: client.observaciones || '',
    });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [pedidos, setPedidos] = useState<Pedido[] | null>(null);

    useEffect(() => {
        getPedidos({ cliente_id: client.id })
            .then(ps => setPedidos(ps.slice(0, 8)))
            .catch(() => setPedidos([]));
    }, [client.id]);

    const dirty =
        form.nombre !== client.nombre ||
        form.telefono !== (client.telefono || '') ||
        form.direccion !== (client.direccion || '') ||
        form.codigo_postal !== (client.codigo_postal || '') ||
        form.observaciones !== (client.observaciones || '');

    async function save() {
        setSaving(true);
        setMsg('');
        try {
            const updated = await updateCliente(client.id, form);
            onSaved(updated);
            setMsg('Cambios guardados');
        } catch {
            setMsg('Error al guardar');
        } finally {
            setSaving(false);
        }
    }

    async function remove() {
        try {
            await deleteCliente(client.id);
            onDeleted(client.id);
        } catch {
            setMsg('Error al borrar el cliente');
        }
    }

    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [k]: e.target.value });
        setMsg('');
    };

    return (
        <div className="cl-detail">
            <header className="cl-detail-head">
                <button className="cl-back" onClick={onBack} aria-label="Volver a la lista">‹</button>
                <span className="cl-avatar cl-avatar-lg">{iniciales(client.nombre)}</span>
                <div className="cl-detail-title">
                    <h2>{client.nombre}</h2>
                    <span>{client.num_pedidos ?? 0} pedidos</span>
                </div>
                {client.telefono && <a className="cl-btn" href={`tel:${client.telefono}`}>📞 Llamar</a>}
                <button className="cl-btn" onClick={onAnalyze}>📈 Análisis</button>
            </header>

            <div className="cl-detail-body">
                <section className="cl-card">
                    <h3>Datos</h3>
                    <div className="cl-form">
                        <label className="cl-field cl-span2"><span>Nombre</span><input value={form.nombre} onChange={set('nombre')} /></label>
                        <label className="cl-field"><span>Teléfono</span><input type="tel" inputMode="tel" value={form.telefono} onChange={set('telefono')} /></label>
                        <label className="cl-field"><span>Código postal</span><input inputMode="numeric" maxLength={5} value={form.codigo_postal} onChange={set('codigo_postal')} /></label>
                        <label className="cl-field cl-span2"><span>Dirección</span><input value={form.direccion} onChange={set('direccion')} /></label>
                        <label className="cl-field cl-span2"><span>Observaciones (alergias, avisos…)</span><textarea rows={2} value={form.observaciones} onChange={set('observaciones')} /></label>
                    </div>
                    <div className="cl-form-actions">
                        {confirmDelete ? (
                            <>
                                <span className="cl-confirm-text">¿Borrar este cliente? Su historial se conserva.</span>
                                <button className="cl-btn cl-btn-danger" onClick={remove}>Sí, borrar</button>
                                <button className="cl-btn" onClick={() => setConfirmDelete(false)}>No</button>
                            </>
                        ) : (
                            <>
                                <button className="cl-btn cl-btn-danger-outline" onClick={() => setConfirmDelete(true)}>Borrar cliente</button>
                                <span className="cl-msg">{msg}</span>
                                <button className="cl-btn cl-btn-primary" disabled={!dirty || saving} onClick={save}>
                                    {saving ? 'Guardando…' : 'Guardar cambios'}
                                </button>
                            </>
                        )}
                    </div>
                </section>

                <section className="cl-card">
                    <h3>Últimos pedidos</h3>
                    {pedidos === null && <p className="cl-empty">Cargando…</p>}
                    {pedidos?.length === 0 && <p className="cl-empty">Sin pedidos</p>}
                    <ul className="cl-orders">
                        {pedidos?.map(p => (
                            <li key={p.id} className={p.status === 'cancelado' ? 'cancelled' : ''}>
                                <span className="cl-order-date">{fechaCorta(fechaPedido(p.fecha_pedido))}<small>{horaPedido(p.fecha_pedido)}</small></span>
                                <span className="cl-order-lines">{p.local_recogida ? '🏠' : '🛵'} {resumenLineas(p)}</span>
                                <span className="cl-order-total">{eur(totalPedido(p))}</span>
                                <span className={`cl-order-status s-${p.status}`}>{ESTADO_LABEL[p.status] ?? p.status}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </div>
    );
}
