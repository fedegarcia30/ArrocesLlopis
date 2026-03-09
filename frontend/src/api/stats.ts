import { get } from './client';

export interface DashboardStats {
    summary: {
        revenue: Metric;
        rations: Metric;
        orders: Metric;
        avg_ticket: Metric;
    };
    period_info: {
        current: { label: string };
        previous: { label: string };
    };
    top_arroces: TopRice[];
    top_clients: TopClient[];
    top_zipcodes: TopZipCode[];
    busiest_month: string | null;
    history: {
        revenue: TrendData;
        rations: TrendData;
        orders: TrendData;
        clients: TrendData;
    };
}

interface TrendData {
    current: number[];
    prev1: number[];
    prev2: number[];
    prev3: number[];
}

interface Metric {
    value: number;
    growth: number;
    label: string;
    sublabel: string;
    sparkline?: number[];
}

interface TopRice {
    nombre: string;
    rations: number;
    subtotal: number;
}

interface TopClient {
    nombre: string;
    orders: number;
    spent: number;
    rations: number;
}

interface TopZipCode {
    cp: string;
    orders: number;
    revenue: number;
}

export interface ExpenseStats {
    summary: {
        total_expense: Metric;
        purchases_count: Metric;
        stock_alerts: Metric & { status?: "warning" | "ok" };
    };
    top_ingredients: {
        nombre: string;
        qty: number;
        spent: number;
        unit: string;
    }[];
    top_providers: {
        nombre: string;
        count: number;
        spent: number;
    }[];
}

export async function getDashboardStats(period: string = 'quarter', mode: string = 'full'): Promise<DashboardStats> {
    return get<DashboardStats>(`/stats/dashboard?period=${period}&mode=${mode}`);
}

export async function getExpenseStats(period: string = 'quarter', mode: string = 'full'): Promise<ExpenseStats> {
    return get<ExpenseStats>(`/stats/expenses?period=${period}&mode=${mode}`);
}

export interface MapaCliente {
    cliente_id: number;
    nombre: string;
    lat: number | null;
    lng: number | null;
    direccion_limpia: string;
    codigo_postal: string;
    pedidos_local: number;
    pedidos_reparto: number;
    total_raciones: number;
}

export type MapaPeriod = 'month' | 'quarter' | 'semester' | 'year';

export interface MapaResponse {
    current:  { label: string; data: MapaCliente[] };
    previous: { label: string; data: MapaCliente[] };
}

export async function getMapaStats(
    period: MapaPeriod,
    year: number,
    opts: { month?: number; quarter?: number; semester?: number } = {}
): Promise<MapaResponse> {
    const p = new URLSearchParams({ period, year: String(year) });
    if (opts.month    != null) p.set('month',    String(opts.month));
    if (opts.quarter  != null) p.set('quarter',  String(opts.quarter));
    if (opts.semester != null) p.set('semester', String(opts.semester));
    return get<MapaResponse>(`/stats/mapa?${p}`);
}
