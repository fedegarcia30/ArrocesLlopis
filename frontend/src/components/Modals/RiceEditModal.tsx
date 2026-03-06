import { useState, useEffect } from 'react';
import type { Arroz } from '../../types';

interface RiceEditModalProps {
    rice: Arroz | null;
    onClose: () => void;
    onSave: (data: Partial<Arroz>) => void;
    isSaving: boolean;
}

export function RiceEditModal({ rice, onClose, onSave, isSaving }: RiceEditModalProps) {
    const [nombre, setNombre] = useState(rice?.nombre || '');
    const [precio, setPrecio] = useState(rice?.precio.toString() || '');
    const [caldo, setCaldo] = useState(rice?.caldo || '');
    const [disponible, setDisponible] = useState(rice?.disponible !== false);

    useEffect(() => {
        if (rice) {
            setNombre(rice.nombre);
            setPrecio(rice.precio.toString());
            setCaldo(rice.caldo || '');
            setDisponible(!!rice.disponible);
        }
    }, [rice]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            nombre,
            precio: parseFloat(precio.replace(',', '.')),
            caldo,
            disponible
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
                <header className="modal-header">
                    <h2>{rice ? 'Editar Arroz' : 'Nuevo Arroz'}</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </header>

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

                    <div className="form-group">
                        <label>Tipo de Caldo / Base</label>
                        <input
                            type="text"
                            value={caldo}
                            onChange={(e) => setCaldo(e.target.value)}
                            placeholder="Ej: Caldo de pescado"
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
            </div>
        </div>
    );
}
