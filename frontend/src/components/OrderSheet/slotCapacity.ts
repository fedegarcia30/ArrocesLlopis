import type { Slot } from '../../types';

/** Consumo del propio pedido (modo edición) para no contarlo como ocupado. */
export interface OwnUsage {
  date: string;
  time: string;
  pax: number;
}

export function slotCapacity(slot: Slot, date: string, own?: OwnUsage | null) {
  const mine = own && own.date === date && own.time === slot.time;
  return {
    orders: slot.remaining_orders + (mine ? 1 : 0),
    pax: slot.remaining_pax + (mine ? own!.pax : 0),
  };
}

export function slotFits(slot: Slot, date: string, neededPax: number, own?: OwnUsage | null) {
  const cap = slotCapacity(slot, date, own);
  return cap.orders >= 1 && cap.pax >= Math.max(neededPax, 2);
}
