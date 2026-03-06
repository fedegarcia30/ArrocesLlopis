import { SlotCard } from './SlotCard';
import type { Slot } from '../../types';
import './AvailabilityGrid.css';

interface AvailabilityGridProps {
  date: string;
  onDateChange: (newDate: string) => void;
  selectedSlot: Slot | null;
  onSlotSelect: (slot: Slot) => void;
  onDropOrder?: (orderId: number, clientName: string, sourceTime: string, targetTime: string) => void;
  slots: Slot[];
  loading: boolean;
  error: string | null;
}

export function AvailabilityGrid({
  date,
  onDateChange,
  selectedSlot,
  onSlotSelect,
  onDropOrder,
  slots,
  loading,
  error
}: AvailabilityGridProps) {

  return (
    <div>
      <div className="availability-header">
        <h2 className="availability-title">Disponibilidad</h2>
        <input
          type="date"
          className="availability-date-input"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
        />
      </div>

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
