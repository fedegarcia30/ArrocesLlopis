import type { Pedido } from '../types';

/** Hora "HH:MM" de un ISO datetime, en hora local. */
export function horaPedido(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

/** Fecha "YYYY-MM-DD" (local) de un ISO datetime. */
export function fechaPedido(iso: string): string {
  const d = new Date(iso);
  return toIsoDate(d);
}

export function toIsoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

/** Regla de negocio: solo el admin puede crear o modificar pedidos de fechas pasadas. */
export function puedeEditarFecha(fechaIso: string, rol?: string): boolean {
  return rol === 'admin' || fechaIso >= todayIso();
}

export const AVISO_PASADO = 'Pedido de un día pasado: solo el administrador puede modificarlo.';

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toIsoDate(new Date(y, m - 1, d + days));
}

/** "sáb 23 nov" */
export function fechaCorta(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "Paella ×6 · Negro ×4" — todas las líneas del pedido. */
export function resumenLineas(p: Pedido): string {
  if (!p.lineas || p.lineas.length === 0) return `Arroz ×${p.pax}`;
  return p.lineas
    .map(l => `${l.arroz_nombre || 'Arroz'} ×${l.raciones ?? p.pax}`)
    .join(' · ');
}

/** Importe total de un pedido multi-línea. */
export function totalPedido(p: Pedido): number {
  return (p.lineas ?? []).reduce((s, l) => s + l.precio_unitario * (l.raciones ?? 0), 0);
}

export const eur = (n: number) =>
  n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
