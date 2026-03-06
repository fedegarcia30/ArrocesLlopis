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

export async function getClientes(search?: string, page: number = 1): Promise<ClientsListResponse> {
  const query = `?page=${page}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
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

export async function getClientStats(period: string = 'quarter'): Promise<any> {
  return get<any>(`/clients/stats?period=${period}`);
}

export async function deleteCliente(id: number): Promise<{ success: boolean; message: string }> {
  return del<{ success: boolean; message: string }>(`/clients/${id}`);
}
