import type { ReactNode } from 'react';
import type { Slot } from '../../types';

export const MAX_ORDERS = 6;
const MAX_PAX = 72;

interface Props {
  slot: Slot;
  isNow: boolean;
  /** Casillas de pedido ya renderizadas (máx. 6). */
  tiles: ReactNode[];
  canCreate: boolean;
  onCreate: (time: string) => void;
  onDropOrder: (orderId: number, sourceTime: string, targetTime: string) => void;
}

/**
 * Fila fija del tablero: franja + 6 casillas. Las casillas vacías son el hueco
 * libre de la franja, así la capacidad se ve sin leer números.
 */
export function SlotRow({ slot, isNow, tiles, canCreate, onCreate, onDropOrder }: Props) {
  const paxPct = Math.min(100, (slot.pax_total / MAX_PAX) * 100);
  const free = Math.max(0, MAX_ORDERS - tiles.length);
  // Puede quedar sitio en nº de pedidos pero no en raciones
  const canAdd = canCreate && slot.available && slot.remaining_pax >= 2;

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    try {
      const { orderId, sourceTime } = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (orderId && sourceTime !== slot.time) onDropOrder(orderId, sourceTime, slot.time);
    } catch {
      /* arrastre ajeno a un pedido */
    }
  }

  return (
    <div
      className={`board-row ${isNow ? 'is-now' : ''}`}
      data-status={slot.status}
      data-slot-time={slot.time}
      // Datos antiguos pueden superar 6 pedidos: la fila se ensancha en vez de partirse
      style={tiles.length > MAX_ORDERS ? { gridTemplateColumns: `var(--slot-col) repeat(${tiles.length}, minmax(0, 1fr))` } : undefined}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
      onDragEnter={e => e.currentTarget.classList.add('drag-over')}
      onDragLeave={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) e.currentTarget.classList.remove('drag-over');
      }}
      onDrop={handleDrop}
    >
      <div className="board-slot">
        <span className="board-slot-time">{slot.time}</span>
        {isNow && <span className="board-now">ahora</span>}
        <span className="board-slot-bar" aria-hidden="true"><span style={{ width: `${paxPct}%` }} /></span>
        <span className="board-slot-cap">{slot.pax_total}<small>/{MAX_PAX}</small></span>
      </div>

      {tiles}

      {Array.from({ length: free }, (_, i) =>
        canAdd ? (
          <button
            type="button"
            key={`free-${i}`}
            className="tile-free"
            onClick={() => onCreate(slot.time)}
            aria-label={`Nuevo pedido a las ${slot.time}`}
          >
            +
          </button>
        ) : (
          <span key={`free-${i}`} className={`tile-free ${slot.available ? '' : 'blocked'}`} aria-hidden="true" />
        ),
      )}
    </div>
  );
}
