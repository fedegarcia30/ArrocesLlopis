import { get, post, put, del } from './client';
import type { Arroz } from '../types';

export async function getRices(): Promise<Arroz[]> {
  return get<Arroz[]>('/rices');
}

export async function getArroz(id: number): Promise<Arroz> {
  return get<Arroz>(`/rices/${id}`);
}

export async function createArroz(data: Partial<Arroz>): Promise<{ id: number; message: string }> {
  return post<{ id: number; message: string }>('/rices', data);
}

export async function updateArroz(id: number, data: Partial<Arroz>): Promise<{ message: string }> {
  return put<{ message: string }>(`/rices/${id}`, data);
}

export async function deleteArroz(id: number): Promise<{ message: string }> {
  return del<{ message: string }>(`/rices/${id}`);
}
