import type { Slot } from '../../types';

const MAX_ORDERS = 6;

interface SlotCardProps {
  slot: Slot;
  selected: boolean;
  onSelect: (slot: Slot) => void;
  onDropOrder?: (orderId: number, clientName: string, sourceTime: string, targetTime: string) => void;
}

export function SlotCard({ slot, selected, onSelect, onDropOrder }: SlotCardProps) {
  const dots = Array.from({ length: MAX_ORDERS }, (_, i) => i < slot.orders_count);

  function handleDragOver(e: React.DragEvent) {
    if (!onDropOrder) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDragEnter(e: React.DragEvent) {
    if (!onDropOrder) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.add('drag-over');
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only remove if we're actually leaving the container, not just entering a child
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      (e.currentTarget as HTMLElement).classList.remove('drag-over');
    }
  }

  function handleDrop(e: React.DragEvent) {
    if (!onDropOrder) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('drag-over');

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const { orderId, clientName, sourceTime } = data;

      if (orderId && sourceTime !== slot.time) {
        onDropOrder(orderId, clientName, sourceTime, slot.time);
      }
    } catch (err) {
      // Fallback for old way if needed
      const orderId = Number(e.dataTransfer.getData('orderId'));
      const clientName = e.dataTransfer.getData('clientName');
      const sourceTime = e.dataTransfer.getData('sourceTime');

      if (orderId && sourceTime !== slot.time) {
        onDropOrder(orderId, clientName, sourceTime, slot.time);
      }
    }
  }

  return (
    <div
      className={`slot-card glass-card ${selected ? 'selected' : ''}`}
      data-status={slot.status}
      data-slot-time={slot.time}
      onClick={() => onSelect(slot)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(slot)}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <span className="slot-time">{slot.time}</span>

      <div className="slot-dots">
        {dots.map((filled, i) => (
          <span key={i} className={`slot-dot ${filled ? 'filled' : ''}`} />
        ))}
      </div>

      <div className="slot-info">
        {slot.available ? (
          <>
            <span className="slot-info-orders">
              {slot.orders_count}/{MAX_ORDERS} Ped
            </span>
            <br />
            {slot.pax_total}/72 Rac
          </>
        ) : (
          <span className="slot-full-badge">Completo</span>
        )}
      </div>
    </div>
  );
}
