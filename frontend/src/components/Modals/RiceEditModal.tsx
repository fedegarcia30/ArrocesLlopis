import { useState, useEffect } from 'react';
import type { Arroz } from '../../types';
import { RecipeEditor } from './RecipeEditor';
import './RiceEditModal.css';

interface RiceEditModalProps {
    rice: Arroz | null;
    onClose: () => void;
    onSave: (data: Partial<Arroz>) => void;
    isSaving: boolean;
}

export function RiceEditModal({ rice, onClose, onSave, isSaving }: RiceEditModalProps) {
    const [nombre, setNombre] = useState(rice?.nombre || '');
    const [precio, setPrecio] = useState(rice?.precio.toString() || '');
    const [disponible, setDisponible] = useState(rice?.disponible !== false);
    const [view, setView] = useState<'info' | 'recipe'>('info');

    useEffect(() => {
        if (rice) {
            setNombre(rice.nombre);
            setPrecio(rice.precio.toString());
            setDisponible(!!rice.disponible);
        }
    }, [rice]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            nombre,
            precio: parseFloat(precio.replace(',', '.')),
            disponible
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className={`modal-content glass-card ${view === 'recipe' ? 'recipe-view' : ''}`} onClick={(e) => e.stopPropagation()}>
                <header className="modal-header">
                    <h2>{view === 'info' ? (rice ? 'Editar Arroz' : 'Nuevo Arroz') : `Receta: ${nombre}`}</h2>
                    <div className="header-tabs">
                        {rice && (
                            <>
                                <button
                                    className={`tab-btn ${view === 'info' ? 'active' : ''}`}
                                    onClick={() => setView('info')}
                                >
                                    Información
                                </button>
                                <button
                                    className={`tab-btn ${view === 'recipe' ? 'active' : ''}`}
                                    onClick={() => setView('recipe')}
                                >
                                    Receta
                                </button>
                            </>
                        )}
                    </div>
                    <button className="modal-close" onClick={onClose}>×</button>
                </header>

                {view === 'info' ? (
                    <form onSubmit={handleSubmit} className="modal-form">
                        <div className="form-group">
                            <label>Nombre del Arroz</label>
                            <input
                                type="text"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                required
                                placeholder="Ej: Paella Valenciana"
                            />
                        </div>

                        <div className="form-group">
                            <label>Precio (por ración)</label>
                            <input
                                type="text"
                                value={precio}
                                onChange={(e) => setPrecio(e.target.value)}
                                required
                                placeholder="Ej: 13.50"
                            />
                        </div>


                        <div className="form-group checkbox-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={disponible}
                                    onChange={(e) => setDisponible(e.target.checked)}
                                />
                                Disponible para pedidos
                            </label>
                        </div>

                        <div className="modal-footer">
                            <button type="button" className="btn-secondary" onClick={onClose}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn-primary" disabled={isSaving}>
                                {isSaving ? 'Guardando...' : rice ? 'Actualizar' : 'Crear Arroz'}
                            </button>
                        </div>
                    </form>
                ) : (
                    rice && <RecipeEditor riceId={rice.id} onClose={onClose} />
                )}
            </div>
        </div>
    );
}
