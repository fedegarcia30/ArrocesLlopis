import type { Slot } from '../../types';
import { slotCapacity, slotFits, type OwnUsage } from './slotCapacity';
import { addDaysIso, fechaCorta, todayIso } from '../../utils/pedidos';

interface Props {
  date: string;
  onDateChange: (d: string) => void;
  time: string | null;
  onTimeChange: (t: string) => void;
  slots: Slot[];
  loading: boolean;
  neededPax: number;
  own?: OwnUsage | null;
  /** Fecha mínima seleccionable (hoy, salvo para el admin) */
  minDate?: string;
}

const DAYS_AHEAD = 7;

export function SlotPicker({ date, onDateChange, time, onTimeChange, slots, loading, neededPax, own, minDate }: Props) {
  const today = todayIso();
  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => addDaysIso(today, i));
  const dateInChips = days.includes(date);

  return (
    <div className="os-slots">
      <div className="os-days">
        {days.map((d, i) => (
          <button
            type="button"
            key={d}
            className={`os-day ${d === date ? 'selected' : ''}`}
            onClick={() => onDateChange(d)}
          >
            <span className="os-day-top">{i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : fechaCorta(d).split(' ')[0]}</span>
            <span className="os-day-num">{Number(d.slice(8))}</span>
          </button>
        ))}
        <label className={`os-day os-day-other ${!dateInChips ? 'selected' : ''}`}>
          <span className="os-day-top">Otra</span>
          <span className="os-day-num">{dateInChips ? '📅' : fechaCorta(date)}</span>
          <input type="date" value={date} min={minDate} onChange={e => e.target.value && (!minDate || e.target.value >= minDate) && onDateChange(e.target.value)} />
        </label>
      </div>

      {loading ? (
        <p className="os-hint">Cargando disponibilidad…</p>
      ) : slots.length === 0 ? (
        <p className="os-hint">No hay franjas disponibles para este día.</p>
      ) : (
        <div className="os-slot-grid">
          {slots.map(s => {
            const cap = slotCapacity(s, date, own);
            const fits = slotFits(s, date, neededPax, own);
            const full = cap.orders < 1 || cap.pax < 2;
            const level = full ? 'red' : s.status;
            return (
              <button
                type="button"
                key={s.time}
                className={`os-slot ${time === s.time ? 'selected' : ''}`}
                data-status={level}
                disabled={!fits}
                onClick={() => onTimeChange(s.time)}
              >
                <span className="os-slot-time">{s.time}</span>
                <span className="os-slot-info">
                  {full ? 'Completo' : !fits ? `No caben ${neededPax}` : `${cap.pax} rac · ${cap.orders} ped`}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
