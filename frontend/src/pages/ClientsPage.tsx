import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getClientes, getClientStats, updateCliente, deleteCliente } from '../api/clientes';
import { AdminStatCard } from '../components/Stats/AdminStatCard';
import type { Cliente } from '../types';
import './ClientsPage.css';

export function ClientsPage() {
    const { user } = useAuth();
    // Role check: Admin if user exists and has admin email or just for dev
    const isAdmin = user?.email?.includes('admin') || true;

    const [clients, setClients] = useState<Cliente[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [period, setPeriod] = useState<string>('quarter');
    const [editingClient, setEditingClient] = useState<Cliente | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getClientes(search, page);
            setClients(response.clients);
            setTotalPages(response.pages);
        } catch (err) {
            console.error('[ClientsPage] Error loading clients:', err);
        } finally {
            setLoading(false);
        }
    }, [search, page]);

    const loadStats = useCallback(async () => {
        if (isAdmin) {
            try {
                const statsData = await getClientStats(period);
                setStats(statsData);
            } catch (err) {
                console.error('Error loading stats:', err);
            }
        }
    }, [isAdmin, period]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadData();
        }, 300);
        return () => clearTimeout(timer);
    }, [loadData]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    const handleUpdateClient = async (updated: Partial<Cliente>) => {
        if (!editingClient) return;
        try {
            // Check if we are "deleting" from the modal (it passes activo: false)
            if (updated.activo === false) {
                await handleDeleteClient(editingClient.id);
                return;
            }
            const result = await updateCliente(editingClient.id, updated);
            setClients(prev => prev.map(c => c.id === result.id ? result : c));
            setEditingClient(null);
        } catch (err) {
            alert('Error al actualizar cliente');
        }
    };

    const handleDeleteClient = async (id: number) => {
        if (!window.confirm('¿Seguro que quieres borrar este cliente?')) return;
        try {
            await deleteCliente(id);
            setClients(prev => prev.filter(c => c.id !== id));
            setEditingClient(null);
        } catch (err) {
            alert('Error al borrar cliente');
        }
    };

    return (
        <div className="clients-page">
            <header className="page-header">
                <h1>Gestión de Clientes</h1>
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Buscar por nombre o teléfono..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        autoFocus
                    />
                </div>
            </header>

            <div className="period-filters">
                {['month', 'quarter', 'semester', 'ytd'].map((p) => (
                    <button
                        key={p}
                        className={period === p ? 'active' : ''}
                        onClick={() => setPeriod(p)}
                    >
                        {p === 'month' ? 'Mes' : p === 'quarter' ? 'Trimestre' : p === 'semester' ? 'Semestre' : 'Año Actual (YTD)'}
                    </button>
                ))}
            </div>

            {isAdmin && stats && (
                <section className="stats-section">
                    <AdminStatCard data={stats.total_clients} />
                    <AdminStatCard data={stats.active_clients} />
                    <AdminStatCard data={stats.churn_clients} />
                    <AdminStatCard data={stats.power_users} />
                </section>
            )}

            <div className="clients-grid glass-card">
                <table className="clients-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Teléfono</th>
                            <th>Dirección</th>
                            <th>Pedidos</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="loading-row">Cargando...</td></tr>
                        ) : clients.length === 0 ? (
                            <tr><td colSpan={5} className="empty-row">No se encontraron clientes</td></tr>
                        ) : (
                            clients.map(client => (
                                <tr key={client.id} onClick={() => setEditingClient(client)}>
                                    <td className="client-name-cell">{client.nombre}</td>
                                    <td>{client.telefono || '—'}</td>
                                    <td>{client.direccion ? `${client.direccion} (${client.codigo_postal || ''})` : '—'}</td>
                                    <td>{client.num_pedidos}</td>
                                    <td>
                                        <div className="actions-cell">
                                            <button className="edit-btn" title="Editar">✏️</button>
                                            <button
                                                className="delete-btn"
                                                title="Borrar"
                                                onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {totalPages > 1 && (
                    <div className="pagination">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
                        <span>Página {page} de {totalPages}</span>
                        <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
                    </div>
                )}
            </div>

            {editingClient && (
                <ClientEditModal
                    client={editingClient}
                    onSave={handleUpdateClient}
                    onClose={() => setEditingClient(null)}
                />
            )}
        </div>
    );
}

function ClientEditModal({ client, onSave, onClose }: { client: Cliente, onSave: (d: Partial<Cliente>) => void, onClose: () => void }) {
    const [formData, setFormData] = useState({
        nombre: client.nombre,
        telefono: client.telefono || '',
        direccion: client.direccion || '',
        codigo_postal: client.codigo_postal || '',
        observaciones: client.observaciones || ''
    });

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
                <h2 className="modal-title">Editar Cliente</h2>
                <div className="modal-body edit-form">
                    <div className="form-group">
                        <label>Nombre</label>
                        <input
                            value={formData.nombre}
                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Teléfono</label>
                        <input
                            value={formData.telefono}
                            onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Dirección</label>
                        <input
                            value={formData.direccion}
                            onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Código Postal</label>
                        <input
                            value={formData.codigo_postal}
                            onChange={e => setFormData({ ...formData, codigo_postal: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Observaciones</label>
                        <textarea
                            value={formData.observaciones}
                            onChange={e => setFormData({ ...formData, observaciones: e.target.value })}
                            rows={3}
                        />
                    </div>
                </div>
                <div className="modal-actions">
                    <button className="btn-modal-delete" onClick={() => onSave({ activo: false })}>Borrar Cliente</button>
                    <div style={{ flex: 1 }} />
                    <button className="btn-modal-cancel" onClick={onClose}>Cancelar</button>
                    <button className="btn-modal-confirm" onClick={() => onSave(formData)}>Guardar Cambios</button>
                </div>
            </div>
        </div>
    );
}
