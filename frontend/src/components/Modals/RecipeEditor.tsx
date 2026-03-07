import { useState, useEffect, useMemo } from 'react';
import { getIngredients, getRiceRecipe, updateRiceRecipe } from '../../api/ingredients';
import type { Ingrediente, ArrozIngrediente } from '../../types';
import './RecipeEditor.css';

interface RecipeEditorProps {
    riceId: number;
    onClose: () => void;
}

export function RecipeEditor({ riceId, onClose }: RecipeEditorProps) {
    const [allIngredients, setAllIngredients] = useState<Ingrediente[]>([]);
    const [recipe, setRecipe] = useState<ArrozIngrediente[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const [ingredientsData, recipeData] = await Promise.all([
                    getIngredients(),
                    getRiceRecipe(riceId)
                ]);
                setAllIngredients(ingredientsData);
                setRecipe(recipeData.ingredients);
            } catch (err) {
                console.error('Error loading recipe data:', err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [riceId]);

    const filteredIngredients = useMemo(() => {
        return allIngredients.filter(i =>
            i.nombre.toLowerCase().includes(search.toLowerCase()) &&
            !recipe.some(r => r.ingrediente_id === i.id)
        );
    }, [allIngredients, recipe, search]);

    const handleDragStart = (e: React.DragEvent, ingredient: Ingrediente) => {
        e.dataTransfer.setData('ingredientId', ingredient.id.toString());
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const ingredientId = parseInt(e.dataTransfer.getData('ingredientId'));
        const ingredient = allIngredients.find(i => i.id === ingredientId);
        if (ingredient) {
            addIngredient(ingredient);
        }
    };

    const addIngredient = (ingredient: Ingrediente) => {
        if (recipe.some(r => r.ingrediente_id === ingredient.id)) return;

        const newEntry: ArrozIngrediente = {
            ingrediente_id: ingredient.id,
            nombre: ingredient.nombre,
            cantidad_por_racion: 0, // Default to 0, user will edit in-line
            unidad_medida: ingredient.unidad_medida
        };

        setRecipe([...recipe, newEntry]);
    };

    const removeIngredient = (id: number) => {
        setRecipe(recipe.filter(r => r.ingrediente_id !== id));
    };

    const handleQuantityChange = (id: number, value: string) => {
        const numValue = parseFloat(value.replace(',', '.')) || 0;
        setRecipe(recipe.map(r =>
            r.ingrediente_id === id ? { ...r, cantidad_por_racion: numValue } : r
        ));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateRiceRecipe(riceId, recipe.map(r => ({
                ingrediente_id: r.ingrediente_id,
                cantidad_por_racion: r.cantidad_por_racion
            })));
            alert('Receta guardada correctamente');
        } catch (err) {
            console.error('Error saving recipe:', err);
            alert('Error al guardar la receta');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="recipe-loading">Cargando receta...</div>;

    return (
        <div className="recipe-editor">
            <div className="recipe-layout">
                {/* Panel Izquierdo: Ingredientes disponibles */}
                <aside className="ingredients-panel">
                    <h3>Ingredientes Disponibles</h3>
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="Buscar ingrediente..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="ingredients-pills">
                        {filteredIngredients.map(ing => (
                            <div
                                key={ing.id}
                                className="ingredient-pill"
                                draggable
                                onDragStart={(e) => handleDragStart(e, ing)}
                                onClick={() => addIngredient(ing)}
                            >
                                {ing.nombre}
                                <span className="unit-tag">{ing.unidad_medida}</span>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Panel Derecho: La Receta (Bandeja de Arroz) */}
                <main
                    className="recipe-basket"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                >
                    <h3>Ingredientes en la Receta</h3>
                    {recipe.length === 0 ? (
                        <div className="basket-empty">
                            <p>Arrastra ingredientes aquí o pulsa en ellos para añadirlos.</p>
                        </div>
                    ) : (
                        <div className="basket-list">
                            {recipe.map(item => (
                                <div key={item.ingrediente_id} className="basket-item glass-card">
                                    <div className="item-info">
                                        <span className="item-name">{item.nombre}</span>
                                        <span className="item-unit">({item.unidad_medida})</span>
                                    </div>
                                    <div className="item-controls">
                                        <input
                                            type="number"
                                            className="inline-qty-input"
                                            value={item.cantidad_por_racion === 0 ? '' : item.cantidad_por_racion}
                                            onChange={(e) => handleQuantityChange(item.ingrediente_id, e.target.value)}
                                            placeholder="0"
                                            step="0.001"
                                        />
                                        <button
                                            className="btn-remove"
                                            onClick={() => removeIngredient(item.ingrediente_id)}
                                            title="Eliminar"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            <footer className="recipe-footer">
                <button className="btn-secondary" onClick={onClose}>Cerrar</button>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar Receta'}
                </button>
            </footer>
        </div>
    );
}
