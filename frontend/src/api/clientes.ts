import { get, post, put, del } from './client';
import type { Cliente, ClientLookupResponse } from '../types';

export async function lookupClient(phone: string): Promise<ClientLookupResponse> {
  return post<ClientLookupResponse>('/clients/lookup', { phone });
}

export interface ClientsListResponse {
  clients: Cliente[];
  total: number;
  pages: number;
  current_page: number;
}

export async function getClientes(search?: string, page: number = 1, sort_by?: string, sort_order?: string): Promise<ClientsListResponse> {
  const query = `?page=${page}${search ? `&search=${encodeURIComponent(search)}` : ''}${sort_by ? `&sort_by=${sort_by}` : ''}${sort_order ? `&sort_order=${sort_order}` : ''}`;
  return get<ClientsListResponse>(`/clients${query}`);
}

export async function getClient(id: number): Promise<Cliente> {
  return get<Cliente>(`/clients/${id}`);
}

export async function createCliente(data: Omit<Cliente, 'id'>): Promise<Cliente> {
  return post<Cliente>('/clients', data);
}

export async function updateCliente(id: number, data: Partial<Cliente>): Promise<Cliente> {
  return put<Cliente>(`/clients/${id}`, data);
}

export async function getClientStats(period: string = 'quarter', startDate?: string, endDate?: string): Promise<any> {
  let query = `/clients/stats?period=${period}`;
  if (startDate) query += `&start_date=${startDate}`;
  if (endDate) query += `&end_date=${endDate}`;
  return get<any>(query);
}

export async function getClientWeeklyStats(id: number): Promise<any[]> {
  return get<any[]>(`/clients/${id}/per-week`);
}

export async function getAnalysisDashboard(period: string = 'quarter', startDate?: string, endDate?: string): Promise<any> {
  let query = `/clients/analysis?period=${period}`;
  if (startDate) query += `&start_date=${startDate}`;
  if (endDate) query += `&end_date=${endDate}`;
  return get<any>(query);
}

export async function getClientFullHistory(id: number): Promise<any> {
  return get<any>(`/clients/${id}/full-history`);
}

export interface GeoCliente {
  cliente_id: number;
  nombre: string;
  lat: number | null;
  lng: number | null;
  direccion_limpia: string;
  codigo_postal: string;
}

export async function getClientesGeo(ids: number[]): Promise<GeoCliente[]> {
  if (ids.length === 0) return [];
  return post<GeoCliente[]>('/clients/geo', { ids });
}

export async function deleteCliente(id: number): Promise<{ success: boolean; message: string }> {
  return del<{ success: boolean; message: string }>(`/clients/${id}`);
}
