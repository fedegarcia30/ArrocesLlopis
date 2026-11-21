import { useState, useEffect, useCallback } from 'react';
import { getRices, createArroz, updateArroz } from '../api/arroces';
import { RiceEditModal } from '../components/Modals/RiceEditModal';
import type { Arroz } from '../types';
import { eur } from '../utils/pedidos';
import './RicesPage.css';

/**
 * Catálogo de arroces. El interruptor "Disponible" es la acción diaria
 * (p. ej. "hoy no hay bogavante"): un arroz no disponible no aparece al crear pedidos.
 * Tocar la tarjeta abre la edición (datos y receta).
 */
export function RicesPage() {
    const [rices, setRices] = useState<Arroz[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editingRice, setEditingRice] = useState<Arroz | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [toggling, setToggling] = useState<number | null>(null);

    const loadRices = useCallback(async () => {
        try {
            setRices(await getRices());
        } catch (err) {
            console.error('Error loading rices:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRices();
    }, [loadRices]);

    const handleSave = async (data: Partial<Arroz>) => {
        setIsSaving(true);
        try {
            if (editingRice) await updateArroz(editingRice.id, data);
            else await createArroz(data);
            setIsAdding(false);
            setEditingRice(null);
            loadRices();
        } catch (err) {
            console.error('Error saving rice:', err);
            alert('Error al guardar el arroz');
        } finally {
            setIsSaving(false);
        }
    };

    async function toggleDisponible(rice: Arroz) {
        const disponible = rice.disponible === false;
        setToggling(rice.id);
        // Optimista: el cambio se ve al instante y se revierte si falla
        setRices(prev => prev.map(r => (r.id === rice.id ? { ...r, disponible } : r)));
        try {
            await updateArroz(rice.id, { disponible });
        } catch {
            setRices(prev => prev.map(r => (r.id === rice.id ? { ...r, disponible: !disponible } : r)));
            alert('No se pudo cambiar la disponibilidad');
        } finally {
            setToggling(null);
        }
    }

    const q = search.toLowerCase();
    const filtered = rices
        .filter(r => r.nombre.toLowerCase().includes(q) || (r.caldo || '').toLowerCase().includes(q))
        .sort((a, b) => Number(b.disponible !== false) - Number(a.disponible !== false) || a.nombre.localeCompare(b.nombre));
    const nDisponibles = rices.filter(r => r.disponible !== false).length;

    return (
        <div className="rz-page">
            <header className="rz-header">
                <h1>Arroces <span className="rz-count">{nDisponibles}/{rices.length} disponibles</span></h1>
                <div className="rz-actions">
                    <input
                        type="search"
                        className="rz-search"
                        placeholder="Buscar arroz o caldo…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <button className="rz-btn-add" onClick={() => setIsAdding(true)}>+ Nuevo arroz</button>
                </div>
            </header>

            {loading ? (
                <div className="loading-screen">Cargando catálogo…</div>
            ) : (
                <div className="rz-grid">
                    {filtered.map(rice => {
                        const on = rice.disponible !== false;
                        return (
                            <div key={rice.id} className={`rz-card ${on ? '' : 'off'}`}>
                                <button className="rz-card-main" onClick={() => setEditingRice(rice)} aria-label={`Editar ${rice.nombre}`}>
                                    <span className="rz-name">{rice.nombre}</span>
                                    <span className="rz-meta">
                                        {rice.caldo && <span className="rz-caldo">{rice.caldo}</span>}
                                        <span className="rz-price">{eur(rice.precio)}<small> /ración</small></span>
                                    </span>
                                </button>
                                <label className={`rz-switch ${toggling === rice.id ? 'busy' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={on}
                                        onChange={() => toggleDisponible(rice)}
                                        disabled={toggling === rice.id}
                                    />
                                    <span className="rz-switch-track" aria-hidden="true"><span /></span>
                                    <span className="rz-switch-label">{on ? 'Disponible' : 'No disponible'}</span>
                                </label>
                            </div>
                        );
                    })}
                    {filtered.length === 0 && <p className="rz-empty">No hay arroces que coincidan con «{search}»</p>}
                </div>
            )}

            {(isAdding || editingRice) && (
                <RiceEditModal
                    rice={editingRice}
                    onClose={() => { setIsAdding(false); setEditingRice(null); }}
                    onSave={handleSave}
                    isSaving={isSaving}
                />
            )}
        </div>
    );
}
