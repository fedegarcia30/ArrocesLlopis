// === Entidades de dominio ===

export interface Cliente {
  id: number;
  nombre: string;
  telefono?: string;
  direccion?: string;
  codigo_postal?: string;
  observaciones?: string;
  num_pedidos?: number;
  activo?: boolean;
}

export interface Arroz {
  id: number;
  nombre: string;
  precio: number;
  caldo?: string;
  disponible?: boolean;
}

export interface Usuario {
  id: number;
  username: string;
  rol: 'admin' | 'cocinero' | 'repartidor' | 'gerente';
  activo: boolean;
}

export type OrderStatus = 'nuevo' | 'preparando' | 'listo' | 'entregado' | 'cancelado';

export interface PedidoLinea {
  id: number;
  pedido_id: number;
  arroz_id: number;
  precio_unitario: number;
  arroz_nombre?: string;
}

export interface Pedido {
  id: number;
  cliente_id: number;
  cliente_nombre?: string;
  telefono?: string;
  direccion?: string;
  usuario_asignado_id?: number;
  pax: number;
  fecha_pedido: string;
  observaciones?: string;
  status: OrderStatus;
  entregado: boolean;
  recogido: boolean;
  local_recogida: boolean;
  review?: number;
  comentarios_recogida?: string;
  lineas?: PedidoLinea[];
  created_at?: string;
}

// === Availability ===

export type SlotStatus = 'green' | 'yellow' | 'red';

export interface Slot {
  time: string;
  orders_count: number;
  pax_total: number;
  available: boolean;
  remaining_orders: number;
  remaining_pax: number;
  status: SlotStatus;
}

export interface AvailabilityResponse {
  date: string;
  slots: Slot[];
}

// === Client Lookup ===

export interface ClientLookupResponse {
  found: boolean;
  clients?: Cliente[];
}

// === Order Creation ===

export interface OrderCreateRequest {
  date: string;
  time: string;
  client: {
    id: number | null;
    nombre: string;
    telefono: string;
    direccion: string;
    codigo_postal: string;
  };
  order: {
    arroz_id: number;
    pax: number;
    recogida: boolean;
    observaciones?: string;
  };
}

export interface OrderCreateResponse {
  success: boolean;
  order_id?: number;
  message: string;
  error_code?: string;
}

// === Pedidos List Filters ===

export interface PedidosFilters {
  status?: OrderStatus;
  fecha?: string;
  cliente_id?: number;
}

// === Auth ===

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

// === Calendar ===

export interface CalendarDaySummary {
  count: number;
  total_pax: number;
}

export interface CalendarMonthResponse {
  [date: string]: CalendarDaySummary;
}
