import { useState, useEffect } from 'react';
import { getIngredients, updateIngredient, recordPurchase, createIngredient } from '../api/ingredients';
import type { Ingrediente } from '../types';
import './StockPage.css';

type TipoTab = 'alimentacion' | 'otros';

export function StockPage() {
    const [ingredients, setIngredients] = useState<Ingrediente[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<TipoTab>('alimentacion');
    const [statusFilter, setStatusFilter] = useState<'todos' | 'critical' | 'warning'>('todos');
    const [editingItem, setEditingItem] = useState<Ingrediente | null>(null);
    const [isPurchaseMode, setIsPurchaseMode] = useState(false);
    const [isAddMode, setIsAddMode] = useState(false);

    // New ingredient state
    const [newItem, setNewItem] = useState<Partial<Ingrediente>>({
        nombre: '',
        unidad_medida: 'g',
        stock_actual: 0,
        stock_minimo: 0,
        precio_actual: 0,
        tipo: 'alimentacion'
    });

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

    const getStockStatus = (item: Ingrediente): 'critical' | 'warning' | 'ok' => {
        const { stock_actual, stock_minimo } = item;
        if (stock_actual <= stock_minimo) return 'critical';
        if (stock_actual <= stock_minimo * 1.2) return 'warning';
        return 'ok';
    };

    const STATUS_ORDER = { critical: 0, warning: 1, ok: 2 } as const;
    const byCriticality = (a: Ingrediente, b: Ingrediente) =>
        STATUS_ORDER[getStockStatus(a)] - STATUS_ORDER[getStockStatus(b)] || a.nombre.localeCompare(b.nombre);

    const tabIngredients = ingredients.filter(i => (i.tipo || 'alimentacion') === activeTab);

    const counts = {
        critical: tabIngredients.filter(i => getStockStatus(i) === 'critical').length,
        warning: tabIngredients.filter(i => getStockStatus(i) === 'warning').length,
        alimentacion: ingredients.filter(i => (i.tipo || 'alimentacion') === 'alimentacion').length,
        otros: ingredients.filter(i => i.tipo === 'otros').length,
    };

    // Lo que hay que reponer, primero
    const filteredIngredients = tabIngredients
        .filter(i => i.nombre.toLowerCase().includes(search.toLowerCase()))
        .filter(i => statusFilter === 'todos' || getStockStatus(i) === statusFilter)
        .sort(byCriticality);

    const purchaseIngredients = [...tabIngredients].sort(byCriticality);

    const purchaseTotal = Object.values(purchaseItems).reduce((sum, it) => {
        const q = parseFloat((it?.qty || '').replace(',', '.'));
        const pr = parseFloat((it?.price || '').replace(',', '.'));
        return sum + (isNaN(q) || isNaN(pr) ? 0 : q * pr);
    }, 0);

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'critical': return 'Bajo mínimo';
            case 'warning': return 'Próximo a mínimo';
            default: return 'Suficiente';
        }
    };

    const num = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 3 });
    const eur = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

    const handleSaveIngredient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;
        try {
            await updateIngredient(editingItem.id, editingItem);
            setEditingItem(null);
            loadIngredients();
        } catch {
            alert('Error al guardar ingrediente');
        }
    };

    const handleCreateIngredient = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createIngredient(newItem);
            setIsAddMode(false);
            setNewItem({
                nombre: '',
                unidad_medida: 'g',
                stock_actual: 0,
                stock_minimo: 0,
                precio_actual: 0,
                tipo: activeTab
            });
            loadIngredients();
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Error al crear ingrediente');
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
                proveedor_id: 1,
                items,
                observaciones: `Registro manual desde StockPage`
            });
            setPurchaseItems({});
            setIsPurchaseMode(false);
            loadIngredients();
        } catch {
            alert('Error al registrar compra');
        }
    };

    const handleOpenAdd = () => {
        setNewItem({
            nombre: '',
            unidad_medida: activeTab === 'alimentacion' ? 'g' : 'ud',
            stock_actual: 0,
            stock_minimo: 0,
            precio_actual: 0,
            tipo: activeTab
        });
        setIsAddMode(true);
    };

    if (loading) return <div className="loading-container">Cargando stock...</div>;

    return (
        <div className="stock-page">
            <header className="st-header">
                <h1>Stock</h1>
                <div className="st-actions">
                    <button className="st-btn" onClick={handleOpenAdd}>+ Ingrediente</button>
                    <button className="st-btn st-btn-primary" onClick={() => setIsPurchaseMode(true)}>🛒 Registrar compra</button>
                </div>
            </header>

            <div className="st-toolbar">
                <div className="st-seg" role="tablist" aria-label="Tipo">
                    <button role="tab" aria-selected={activeTab === 'alimentacion'} className={activeTab === 'alimentacion' ? 'active' : ''} onClick={() => setActiveTab('alimentacion')}>
                        Alimentación <span>{counts.alimentacion}</span>
                    </button>
                    <button role="tab" aria-selected={activeTab === 'otros'} className={activeTab === 'otros' ? 'active' : ''} onClick={() => setActiveTab('otros')}>
                        Otros <span>{counts.otros}</span>
                    </button>
                </div>
                <div className="st-filters">
                    <button className={statusFilter === 'todos' ? 'active' : ''} onClick={() => setStatusFilter('todos')}>Todos</button>
                    <button className={'st-f-critical' + (statusFilter === 'critical' ? ' active' : '')} onClick={() => setStatusFilter(statusFilter === 'critical' ? 'todos' : 'critical')}>
                        Bajo mínimo <strong>{counts.critical}</strong>
                    </button>
                    <button className={'st-f-warning' + (statusFilter === 'warning' ? ' active' : '')} onClick={() => setStatusFilter(statusFilter === 'warning' ? 'todos' : 'warning')}>
                        Próximo <strong>{counts.warning}</strong>
                    </button>
                </div>
                <input
                    type="search"
                    placeholder="Buscar ingrediente…"
                    className="st-search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            <main className="st-grid">
                {filteredIngredients.length === 0 && (
                    <div className="st-empty">
                        No hay ingredientes{statusFilter !== 'todos' ? ' ' + getStatusLabel(statusFilter).toLowerCase() : ''}{search ? ' que coincidan con «' + search + '»' : ''}
                    </div>
                )}

                {filteredIngredients.map(item => {
                    const status = getStockStatus(item);
                    // Barra: el mínimo queda a la mitad, así se ve cuánto margen hay
                    const pct = item.stock_minimo > 0 ? Math.min(100, (item.stock_actual / (item.stock_minimo * 2)) * 100) : 100;
                    return (
                        <button key={item.id} className={'st-item status-' + status} onClick={() => setEditingItem(item)}>
                            <span className="st-item-top">
                                <span className="st-item-name">{item.nombre}</span>
                                <span className="st-item-qty"><strong>{num(item.stock_actual)}</strong> {item.unidad_medida}</span>
                            </span>
                            <span className="st-bar" aria-hidden="true"><span style={{ width: pct + '%' }} /><i /></span>
                            <span className="st-item-meta">
                                <span className="st-item-status">{getStatusLabel(status)}</span>
                                <span>mín {num(item.stock_minimo)} {item.unidad_medida} · {eur(item.precio_actual ?? 0)}/{item.unidad_medida}</span>
                            </span>
                        </button>
                    );
                })}
            </main>

            {/* Modal de Edición Individual */}
            {editingItem && (
                <div className="modal-overlay">
                    <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
                        <header className="modal-header">
                            <h2>Editar {editingItem.nombre}</h2>
                            <button className="modal-close" onClick={() => setEditingItem(null)}>×</button>
                        </header>
                        <form onSubmit={handleSaveIngredient} className="modal-form">
                            <div className="form-row">
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
                            </div>
                            <div className="form-row">
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
                            </div>
                            <div className="form-row">
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
                                <div className="form-group">
                                    <label>Tipo</label>
                                    <select
                                        value={editingItem.tipo || 'alimentacion'}
                                        onChange={e => setEditingItem({ ...editingItem, tipo: e.target.value as 'alimentacion' | 'otros' })}
                                    >
                                        <option value="alimentacion">Alimentación</option>
                                        <option value="otros">Otros</option>
                                    </select>
                                </div>
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
                <div className="modal-overlay">
                    <div className="modal-content glass-card st-purchase" onClick={e => e.stopPropagation()}>
                        <header className="modal-header">
                            <h2>Registrar compra · {activeTab === 'alimentacion' ? 'Alimentación' : 'Otros'}</h2>
                            <button className="modal-close" onClick={() => setIsPurchaseMode(false)}>×</button>
                        </header>
                        <p className="st-purchase-hint">Rellena solo lo que has comprado. Lo que está bajo mínimo aparece primero.</p>
                        <div className="st-purchase-list">
                            <div className="st-purchase-row st-purchase-head">
                                <span>Ingrediente</span><span>Cantidad</span><span>Precio/ud</span>
                            </div>
                            {purchaseIngredients.map(ing => (
                                <div key={ing.id} className={'st-purchase-row status-' + getStockStatus(ing)}>
                                    <span className="st-purchase-name">
                                        {ing.nombre}
                                        <small>Hay {num(ing.stock_actual)} {ing.unidad_medida} · último {eur(ing.precio_actual ?? 0)}</small>
                                    </span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder={ing.unidad_medida}
                                        value={purchaseItems[ing.id]?.qty || ''}
                                        onChange={e => setPurchaseItems({ ...purchaseItems, [ing.id]: { ...purchaseItems[ing.id], qty: e.target.value } })}
                                    />
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="€"
                                        value={purchaseItems[ing.id]?.price || ''}
                                        onChange={e => setPurchaseItems({ ...purchaseItems, [ing.id]: { ...purchaseItems[ing.id], price: e.target.value } })}
                                    />
                                </div>
                            ))}
                        </div>
                        <footer className="modal-footer st-purchase-footer">
                            <span className="st-purchase-total">Total: <strong>{eur(purchaseTotal)}</strong></span>
                            <button className="btn-secondary" onClick={() => setIsPurchaseMode(false)}>Cancelar</button>
                            <button className="btn-primary" onClick={handleCompletePurchase}>Confirmar compra</button>
                        </footer>
                    </div>
                </div>
            )}

            {/* Modal de Nuevo Ingrediente */}
            {isAddMode && (
                <div className="modal-overlay">
                    <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
                        <header className="modal-header">
                            <h2>Añadir Nuevo Ingrediente</h2>
                            <button className="modal-close" onClick={() => setIsAddMode(false)}>×</button>
                        </header>
                        <form onSubmit={handleCreateIngredient} className="modal-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Nombre</label>
                                    <input
                                        type="text"
                                        value={newItem.nombre}
                                        onChange={e => setNewItem({ ...newItem, nombre: e.target.value })}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Unidad (g, ml, ud, kg...)</label>
                                    <input
                                        type="text"
                                        value={newItem.unidad_medida}
                                        onChange={e => setNewItem({ ...newItem, unidad_medida: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Stock Inicial</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        value={newItem.stock_actual}
                                        onChange={e => setNewItem({ ...newItem, stock_actual: parseFloat(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Stock Mínimo</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        value={newItem.stock_minimo}
                                        onChange={e => setNewItem({ ...newItem, stock_minimo: parseFloat(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Precio de Coste Referencia (€)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newItem.precio_actual}
                                        onChange={e => setNewItem({ ...newItem, precio_actual: parseFloat(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Tipo</label>
                                    <select
                                        value={newItem.tipo || 'alimentacion'}
                                        onChange={e => setNewItem({ ...newItem, tipo: e.target.value as 'alimentacion' | 'otros' })}
                                    >
                                        <option value="alimentacion">Alimentación</option>
                                        <option value="otros">Otros</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setIsAddMode(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary">Crear Ingrediente</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
