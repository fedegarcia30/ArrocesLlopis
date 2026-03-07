const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
import { getAuth } from 'firebase/auth';
import type { Ingrediente, RecetaResponse, CompraRequest } from '../types';

async function getAuthToken() {
    const auth = getAuth();
    if (auth.currentUser) {
        return await auth.currentUser.getIdToken();
    }
    return null;
}

export async function getIngredients(): Promise<Ingrediente[]> {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/ingredients`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error('Failed to fetch ingredients');
    return await response.ok ? response.json() : [];
}

export async function getRiceRecipe(riceId: number): Promise<RecetaResponse> {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/rices/${riceId}/recipe`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error('Failed to fetch rice recipe');
    return await response.json();
}

export async function updateRiceRecipe(riceId: number, ingredients: { ingrediente_id: number; cantidad_por_racion: number }[]): Promise<void> {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/rices/${riceId}/recipe`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(ingredients)
    });
    if (!response.ok) throw new Error('Failed to update rice recipe');
}

export async function updateIngredient(id: number, data: Partial<Ingrediente>): Promise<void> {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/ingredients/${id}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update ingredient');
}

export async function recordPurchase(data: CompraRequest): Promise<void> {
    const token = await getAuthToken();
    const url = data.fecha ? `${API_BASE_URL}/ingredients/purchase?fecha=${data.fecha}` : `${API_BASE_URL}/ingredients/purchase`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to record purchase');
}
