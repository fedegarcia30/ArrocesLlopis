import { useRef } from 'react';
import type { Pedido } from '../../types';
import { horaPedido } from '../../utils/pedidos';

interface Props {
  pedido: Pedido;
  dimmed: boolean;
  dragging: boolean;
  /** false en días pasados (salvo admin): no se puede arrastrar a otra franja */
  movable?: boolean;
  onOpen: (p: Pedido) => void;
  onDragStartTouch: (p: Pedido, x: number, y: number) => void;
}

const LONG_PRESS_MS = 450;

/** Abreviatura para pantallas estrechas: "Paella" → "PAE". */
function abreviar(nombre: string): string {
  const palabra = nombre.replace(/^(arroz|paella)\s+(de\s+|a\s+la\s+|al\s+)?/i, '') || nombre;
  return palabra.slice(0, 3).toUpperCase();
}

/** Casilla de pedido en el tablero. Toque → detalle. Pulsación larga / arrastre → mover. */
export function OrderTile({ pedido, dimmed, dragging, movable = true, onOpen, onDragStartTouch }: Props) {
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

  const lineas = pedido.lineas ?? [];
  const resumen = lineas.length
    ? lineas.map(l => `${l.arroz_nombre || 'Arroz'} ${l.raciones}`).join(' · ')
    : `Arroz ${pedido.pax}`;
  const abrev = lineas.length ? lineas.map(l => abreviar(l.arroz_nombre || 'Arroz')).join('+') : 'ARR';

  function clearTimer() {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  }

  return (
    <button
      type="button"
      className={`tile ${dimmed ? 'dimmed' : ''} ${dragging ? 'dragging' : ''}`}
      data-status={pedido.status}
      draggable={movable}
      onDragStart={e => {
        e.dataTransfer.setData('text/plain', JSON.stringify({
          orderId: pedido.id,
          clientName: pedido.cliente_nombre || '',
          sourceTime: horaPedido(pedido.fecha_pedido),
        }));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onTouchStart={e => {
        const t = e.touches[0];
        start.current = { x: t.clientX, y: t.clientY };
        suppressClick.current = false;
        if (!movable) return;
        timer.current = window.setTimeout(() => {
          suppressClick.current = true;
          navigator.vibrate?.(40);
          onDragStartTouch(pedido, t.clientX, t.clientY);
        }, LONG_PRESS_MS);
      }}
      onTouchMove={e => {
        const t = e.touches[0];
        if (start.current && Math.hypot(t.clientX - start.current.x, t.clientY - start.current.y) > 10) clearTimer();
      }}
      onTouchEnd={clearTimer}
      onContextMenu={e => e.preventDefault()}
      onClick={() => {
        if (suppressClick.current) { suppressClick.current = false; return; }
        onOpen(pedido);
      }}
      title={`${pedido.cliente_nombre ?? ''} · ${resumen}`}
    >
      <span className="tile-top">
        <span className="tile-name">{pedido.cliente_nombre || `Cliente #${pedido.cliente_id}`}</span>
        <span className="tile-pax">{pedido.pax}</span>
      </span>
      <span className="tile-bottom">
        <span className="tile-rice">{resumen}</span>
        <span className="tile-abbr">{abrev}</span>
        <span className="tile-icons">
          {!pedido.local_recogida && '🛵'}
          {pedido.observaciones && '📝'}
        </span>
      </span>
    </button>
  );
}
