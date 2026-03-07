import { useState, useEffect, useMemo } from 'react';
import { getIngredients, updateIngredient, recordPurchase } from '../api/ingredients';
import type { Ingrediente } from '../types';
import './StockPage.css';

// Modal components initialized later or defined inline
// For brevity and to follow user request for responsive visual, I'll implement logic here

export function StockPage() {
    const [ingredients, setIngredients] = useState<Ingrediente[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editingItem, setEditingItem] = useState<Ingrediente | null>(null);
    const [isPurchaseMode, setIsPurchaseMode] = useState(false);

    // Purchase state
    const [purchaseItems, setPurchaseItems] = useState<Record<number, { qty: string; price: string }>>({});

    useEffect(() => {
        loadIngredients();
    }, []);

    const loadIngredients = async () => {
        setLoading(true);
        try {
            const data = await getIngredients();
            setIngredients(data);
        } catch (error) {
            console.error('Error loading ingredients:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredIngredients = useMemo(() => {
        return ingredients.filter(i =>
            i.nombre.toLowerCase().includes(search.toLowerCase())
        );
    }, [ingredients, search]);

    const getStockStatus = (item: Ingrediente) => {
        const { stock_actual, stock_minimo } = item;
        if (stock_actual <= stock_minimo) return 'critical';
        if (stock_actual <= stock_minimo * 1.2) return 'warning';
        return 'ok';
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'critical': return 'Bajo Mínimo';
            case 'warning': return 'Próximo a Mínimo';
            default: return 'Stock Suficiente';
        }
    };

    const handleSaveIngredient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;
        try {
            await updateIngredient(editingItem.id, editingItem);
            setEditingItem(null);
            loadIngredients();
        } catch (error) {
            alert('Error al guardar ingrediente');
        }
    };

    const handleCompletePurchase = async () => {
        const items = Object.entries(purchaseItems)
            .map(([id, data]) => ({
                ingrediente_id: parseInt(id),
                cantidad: parseFloat(data.qty.replace(',', '.')),
                precio_unitario: parseFloat(data.price.replace(',', '.'))
            }))
            .filter(item => !isNaN(item.cantidad) && item.cantidad > 0 && !isNaN(item.precio_unitario));

        if (items.length === 0) {
            setIsPurchaseMode(false);
            return;
        }

        try {
            await recordPurchase({
                proveedor_id: 1, // Defaulting for now
                items,
                observaciones: `Registro manual desde StockPage`
            });
            setPurchaseItems({});
            setIsPurchaseMode(false);
            loadIngredients();
        } catch (error) {
            alert('Error al registrar compra');
        }
    };

    if (loading) return <div className="loading-container">Cargando stock...</div>;

    return (
        <div className="stock-page">
            <header className="stock-header">
                <div>
                    <h1>Gestión de Stock</h1>
                    <p className="subtitle">Visualización y control de inventario</p>
                </div>

                <div className="stock-actions">
                    <div className="stock-filters">
                        <input
                            type="text"
                            placeholder="Buscar ingrediente..."
                            className="stock-search"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button className="btn-primary" onClick={() => setIsPurchaseMode(true)}>
                        🛒 Registrar Compra
                    </button>
                </div>
            </header>

            <main className="stock-grid">
                {filteredIngredients.map(item => {
                    const status = getStockStatus(item);
                    return (
                        <div
                            key={item.id}
                            className={`ingredient-card glass-card status-${status}`}
                            onClick={() => setEditingItem(item)}
                        >
                            <div className="card-header">
                                <h3>{item.nombre}</h3>
                                <span className="status-label">{getStatusLabel(status)}</span>
                            </div>

                            <div className="card-body">
                                <div className="stock-levels">
                                    <span className="current-stock">{item.stock_actual}</span>
                                    <span className="unit">{item.unidad_medida}</span>
                                </div>
                                <div className="stock-meta">
                                    <span className="min-stock">Mínimo: {item.stock_minimo} {item.unidad_medida}</span>
                                    <div className="price-tag">Precio Coste: {item.precio_actual?.toFixed(2)}€</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </main>

            {/* Modal de Edición Individual */}
            {editingItem && (
                <div className="modal-overlay" onClick={() => setEditingItem(null)}>
                    <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
                        <header className="modal-header">
                            <h2>Editar {editingItem.nombre}</h2>
                            <button className="modal-close" onClick={() => setEditingItem(null)}>×</button>
                        </header>
                        <form onSubmit={handleSaveIngredient} className="modal-form">
                            <div className="form-group">
                                <label>Nombre</label>
                                <input
                                    type="text"
                                    value={editingItem.nombre}
                                    onChange={e => setEditingItem({ ...editingItem, nombre: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Unidad</label>
                                <input
                                    type="text"
                                    value={editingItem.unidad_medida}
                                    onChange={e => setEditingItem({ ...editingItem, unidad_medida: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Stock Actual</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    value={editingItem.stock_actual}
                                    onChange={e => setEditingItem({ ...editingItem, stock_actual: parseFloat(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Stock Mínimo</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    value={editingItem.stock_minimo}
                                    onChange={e => setEditingItem({ ...editingItem, stock_minimo: parseFloat(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Precio de Coste Referencia (€)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editingItem.precio_actual}
                                    onChange={e => setEditingItem({ ...editingItem, precio_actual: parseFloat(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setEditingItem(null)}>Cancelar</button>
                                <button type="submit" className="btn-primary">Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Compra (Bulk) */}
            {isPurchaseMode && (
                <div className="modal-overlay" onClick={() => setIsPurchaseMode(false)}>
                    <div className="modal-content glass-card" style={{ width: '700px', maxWidth: '95vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                        <header className="modal-header" style={{ padding: '24px 24px 0 24px' }}>
                            <h2>Registrar Compra</h2>
                            <button className="modal-close" onClick={() => setIsPurchaseMode(false)}>×</button>
                        </header>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                            <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
                                Introduce las cantidades compradas y el precio por unidad.
                            </p>
                            <div className="purchase-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {ingredients.map(ing => (
                                    <div key={ing.id} className="glass-card" style={{ padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <span>{ing.nombre}</span>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>Último: {ing.precio_actual}€/{ing.unidad_medida}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                type="text"
                                                placeholder={`Cant (${ing.unidad_medida})`}
                                                style={{ width: '90px', textAlign: 'right' }}
                                                value={purchaseItems[ing.id]?.qty || ''}
                                                onChange={e => setPurchaseItems({
                                                    ...purchaseItems,
                                                    [ing.id]: { ...purchaseItems[ing.id], qty: e.target.value }
                                                })}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Precio €"
                                                style={{ width: '80px', textAlign: 'right' }}
                                                value={purchaseItems[ing.id]?.price || ''}
                                                onChange={e => setPurchaseItems({
                                                    ...purchaseItems,
                                                    [ing.id]: { ...purchaseItems[ing.id], price: e.target.value }
                                                })}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <footer className="modal-footer" style={{ padding: '20px 24px', borderTop: '1px solid var(--border-subtle)' }}>
                            <button className="btn-secondary" onClick={() => setIsPurchaseMode(false)}>Cancelar</button>
                            <button className="btn-primary" onClick={handleCompletePurchase}>Confirmar Compra</button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
}
