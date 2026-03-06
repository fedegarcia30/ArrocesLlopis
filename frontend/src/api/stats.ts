import { get } from './client';

export interface DashboardStats {
    summary: {
        revenue: Metric;
        rations: Metric;
        orders: Metric;
        avg_ticket: Metric;
    };
    top_arroces: TopRice[];
    top_clients: TopClient[];
    top_zipcodes: TopZipCode[];
    busiest_month: string | null;
    history: {
        current: number[];
        prev1: number[];
        prev2: number[];
        prev3: number[];
    };
}

interface Metric {
    value: number;
    growth: number;
    label: string;
    sublabel: string;
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
}

interface TopZipCode {
    cp: string;
    orders: number;
    revenue: number;
}

export async function getDashboardStats(period: string = 'quarter'): Promise<DashboardStats> {
    return get<DashboardStats>(`/stats/dashboard?period=${period}`);
}
