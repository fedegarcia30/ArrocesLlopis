import { useState, useRef } from 'react';
import type { TouchEvent } from 'react';
import type { Pedido } from '../../types';
import { updateOrderStatus } from '../../api/pedidos';
import './OrderCard.css';

interface OrderCardProps {
  pedido: Pedido;
  onStatusChange?: () => void;
  onDragStartTouch?: (pedido: Pedido, x: number, y: number) => void;
  isDragging?: boolean;
}

export function OrderCard({ pedido, onStatusChange, onDragStartTouch, isDragging }: OrderCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isNativeDragging, setIsNativeDragging] = useState(false);

  const longPressTimerRef = useRef<number | null>(null);
  const isDraggingTouchRef = useRef(false);

  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const hasDeterminedDirectionRef = useRef<boolean>(false);
  const actionThreshold = 80;

  const time = pedido.fecha_pedido ? new Date(pedido.fecha_pedido).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  }) : '';

  const riceName = pedido.lineas?.[0]?.arroz_nombre || 'Arroz';

  function handleTouchStart(e: TouchEvent) {
    if (isUpdating) return;
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    setIsSwiping(true);
    hasDeterminedDirectionRef.current = false;
    isDraggingTouchRef.current = false;

    // Set timer for long press (Drag & Drop on mobile)
    longPressTimerRef.current = window.setTimeout(() => {
      if (!hasDeterminedDirectionRef.current) {
        isDraggingTouchRef.current = true;
        setIsSwiping(false);
        if (onDragStartTouch) {
          onDragStartTouch(pedido, touch.clientX, touch.clientY);
        }
        if (navigator.vibrate) navigator.vibrate(50);
      }
    }, 500);
  }

  function handleTouchMove(e: TouchEvent) {
    if (isDraggingTouchRef.current) return;
    if (!isSwiping || startXRef.current === null || startYRef.current === null) return;

    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    const diffX = x - startXRef.current;
    const diffY = y - startYRef.current;

    // If they moved significantly, it's a scroll or swipe, not a long press
    if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    // Only determine direction once per swipe gesture to prevent locking up native scroll
    if (!hasDeterminedDirectionRef.current) {
      // Small threshold to allow finger to move a bit before locking direction
      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        hasDeterminedDirectionRef.current = true;
        // If they moved more vertically than horizontally, cancel the swipe tracking
        if (Math.abs(diffY) > Math.abs(diffX)) {
          setIsSwiping(false);
          return;
        }
      } else {
        return; // Haven't moved far enough to determine yet
      }
    }

    // Limits
    if (diffX > 120) setTranslateX(120);
    else if (diffX < -120) setTranslateX(-120);
    else setTranslateX(diffX);
  }

  async function handleTouchEnd() {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!isSwiping) return;
    setIsSwiping(false);
    startXRef.current = null;

    if (translateX > actionThreshold) {
      // Swipe Right -> Toggle Entregado / Confirmado
      const newStatus = pedido.status === 'entregado' ? 'nuevo' : 'entregado';
      setIsUpdating(true);
      try {
        await updateOrderStatus(pedido.id, newStatus);
        if (onStatusChange) onStatusChange();
      } catch (err) {
        console.error('Error updating status:', err);
      }
      setIsUpdating(false);
      setTranslateX(0);

    } else if (translateX < -actionThreshold) {
      // Swipe Left -> Edit
      // TODO: Open Edit Modal
      alert('Modal de edición próximamente');
      setTranslateX(0);
    } else {
      setTranslateX(0);
    }
  }

  const deliverOpacity = Math.min(Math.max(translateX / actionThreshold, 0), 1);
  const editOpacity = Math.min(Math.max(-translateX / actionThreshold, 0), 1);

  return (
    <div className="order-card-wrapper">
      <div className="order-card-actions">
        <span
          className="action-deliver"
          style={{
            opacity: deliverOpacity,
            transform: `scale(${0.8 + (0.2 * deliverOpacity)})`
          }}
        >
          {pedido.status === 'entregado' ? 'Marcar Confirmado' : 'Entregar'}
        </span>
        <span
          className="action-edit"
          style={{
            opacity: editOpacity,
            transform: `scale(${0.8 + (0.2 * editOpacity)})`
          }}
        >
          Editar
        </span>
      </div>
      <div
        className={`order-card glass-card ${isSwiping ? 'swiping' : ''} ${isUpdating ? 'loading' : ''} ${isDragging || isNativeDragging ? 'dragging' : ''}`}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        draggable={!isUpdating}
        onDragStart={(e) => {
          setIsNativeDragging(true);
          const dragData = {
            orderId: pedido.id,
            clientName: pedido.cliente_nombre || '',
            sourceTime: time
          };
          e.dataTransfer.setData('text/plain', JSON.stringify(dragData));

          // Fallback legacy support
          e.dataTransfer.setData('orderId', String(pedido.id));
          e.dataTransfer.setData('clientName', pedido.cliente_nombre || '');
          e.dataTransfer.setData('sourceTime', time);

          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnd={() => setIsNativeDragging(false)}
      >
        <div>
          <span className="order-id">#{String(pedido.id).padStart(4, '0')}</span>
        </div>
        <div className="order-card-body">
          <div className="order-client-name">{pedido.cliente_nombre || `Cliente #${pedido.cliente_id}`}</div>
          <div className="order-details">
            <span className="order-rice-badge">{riceName}</span>
            <span className="order-pax-badge">{pedido.pax} PAX</span>
            <span className="order-time">{time}</span>
          </div>
        </div>
        <span className={`order-status-badge ${pedido.status}`}>
          {pedido.status === 'nuevo' ? 'Confirmado' : pedido.status}
        </span>
      </div>
    </div>
  );
}
