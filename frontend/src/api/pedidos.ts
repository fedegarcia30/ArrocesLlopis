import { post, get, patch } from './client';
import type {
  OrderCreateRequest,
  OrderCreateResponse,
  Pedido,
  PedidosFilters,
  OrderStatus,
  CalendarMonthResponse,
} from '../types';

export async function createOrder(data: OrderCreateRequest): Promise<OrderCreateResponse> {
  return post<OrderCreateResponse>('/orders/create', data);
}

export async function getPedidos(filters?: PedidosFilters): Promise<Pedido[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.fecha) params.set('fecha', filters.fecha);
  if (filters?.cliente_id) params.set('cliente_id', String(filters.cliente_id));
  const query = params.toString() ? `?${params.toString()}` : '';
  return get<Pedido[]>(`/pedidos${query}`);
}

export async function getPedido(id: number): Promise<Pedido> {
  return get<Pedido>(`/pedidos/${id}`);
}

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<Pedido> {
  return patch<Pedido>(`/pedidos/${id}/status`, { status });
}

export async function getMonthlySummary(year: number, month: number): Promise<CalendarMonthResponse> {
  return get<CalendarMonthResponse>(`/pedidos/calendar?year=${year}&month=${month}`);
}

export async function updatePedido(id: number, data: Partial<Pedido>): Promise<Pedido> {
  return patch<Pedido>(`/pedidos/${id}`, data);
}
