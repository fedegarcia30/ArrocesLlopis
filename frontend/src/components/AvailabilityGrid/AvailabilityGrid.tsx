import { SlotCard } from './SlotCard';
import type { Slot } from '../../types';
import './AvailabilityGrid.css';

interface AvailabilityGridProps {
  selectedSlot: Slot | null;
  onSlotSelect: (slot: Slot) => void;
  onDropOrder?: (orderId: number, clientName: string, sourceTime: string, targetTime: string) => void;
  slots: Slot[];
  loading: boolean;
  error: string | null;
}

export function AvailabilityGrid({
  selectedSlot,
  onSlotSelect,
  onDropOrder,
  slots,
  loading,
  error
}: AvailabilityGridProps) {

  return (
    <div className="availability-container">
      {loading && <div className="availability-loading">Cargando slots...</div>}
      {error && <div className="availability-error">{error}</div>}

      {!loading && !error && (
        <div className="availability-grid">
          {slots.map((slot) => (
            <SlotCard
              key={slot.time}
              slot={slot}
              selected={selectedSlot?.time === slot.time}
              onSelect={onSlotSelect}
              onDropOrder={onDropOrder}
            />
          ))}
          {slots.length === 0 && (
            <div className="availability-loading">No hay slots para esta fecha</div>
          )}
        </div>
      )}
    </div>
  );
}
