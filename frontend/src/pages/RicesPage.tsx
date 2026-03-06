import { useState, useEffect, useCallback } from 'react';
import { getRices, createArroz, updateArroz, deleteArroz } from '../api/arroces';
import { RiceEditModal } from '../components/Modals/RiceEditModal';
import type { Arroz } from '../types';
import './RicesPage.css';

export function RicesPage() {
    const [rices, setRices] = useState<Arroz[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editingRice, setEditingRice] = useState<Arroz | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const loadRices = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getRices();
            setRices(data);
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
            if (editingRice) {
                await updateArroz(editingRice.id, data);
            } else {
                await createArroz(data);
            }
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

    const handleDelete = async (id: number) => {
        if (!confirm('¿Seguro que quieres marcar este arroz como no disponible?')) return;
        try {
            await deleteArroz(id);
            loadRices();
        } catch (err) {
            console.error('Error deleting rice:', err);
        }
    };

    const filteredRices = rices.filter(r =>
        r.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (r.caldo || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="rices-page">
            <header className="rices-header">
                <h1>Gestión de Arroces</h1>
                <div className="header-actions">
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Buscar arroz..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button className="btn-add-rice" onClick={() => setIsAdding(true)}>
                        + Nuevo Arroz
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="loading-screen">Cargando catálogo...</div>
            ) : (
                <div className="rices-grid">
                    {filteredRices.map((rice) => (
                        <div key={rice.id} className={`rice-card glass-card ${!rice.disponible ? 'inactive' : ''}`}>
                            {!rice.disponible && <span className="rice-badge">No disponible</span>}
                            <h3 className="rice-name">{rice.nombre}</h3>
                            <p className="rice-caldo">{rice.caldo || 'Sin caldo especificado'}</p>
                            <div className="rice-price">
                                {rice.precio.toFixed(2)}€
                                <span>/ ración</span>
                            </div>
                            <div className="rice-actions">
                                <button className="btn-edit" onClick={() => setEditingRice(rice)}>
                                    ✎ Editar
                                </button>
                                <button className="btn-delete" onClick={() => handleDelete(rice.id)}>
                                    🗑
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {(isAdding || editingRice) && (
                <RiceEditModal
                    rice={editingRice}
                    onClose={() => {
                        setIsAdding(false);
                        setEditingRice(null);
                    }}
                    onSave={handleSave}
                    isSaving={isSaving}
                />
            )}
        </div>
    );
}
