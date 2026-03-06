import type { Arroz, Cliente, Slot } from '../../types';

export interface OrderItem {
  rice: Arroz;
  pax: number;
}

interface StepConfirmProps {
  client: Cliente | null;
  clientName: string;
  phone: string;
  clientAddress: string;
  items: OrderItem[];
  recogida: boolean;
  observaciones: string;
  slotTime: string;
  date: string;
  onAddAnother: () => void;
  remainingPax: number;
  allSlots: Slot[];
  onSlotChange: (slot: Slot) => void;
}

export function StepConfirm({
  client,
  clientName,
  phone,
  clientAddress,
  items,
  recogida,
  observaciones,
  slotTime,
  date,
  onAddAnother,
  remainingPax,
  allSlots,
  onSlotChange
}: StepConfirmProps) {
  const total = items.reduce((acc, item) => acc + (item.rice.precio * item.pax), 0);
  const nombre = client?.nombre || clientName;
  const canAddMore = remainingPax >= 2;

  // Find neighboring slots for suggestions
  const currentIdx = allSlots.findIndex(s => s.time === slotTime);
  const suggestions = [
    allSlots[currentIdx - 1],
    allSlots[currentIdx + 1]
  ].filter(s => s && s.available && s.remaining_pax >= 2);

  return (
    <div className="wizard-step">
      <div className="confirm-summary glass-card" style={{ padding: '16px' }}>
        <div className="confirm-row">
          <span className="confirm-label">Cliente</span>
          <span className="confirm-value">{nombre}</span>
        </div>
        <div className="confirm-row">
          <span className="confirm-label">Teléfono</span>
          <span className="confirm-value">{phone}</span>
        </div>
        <div className="confirm-row">
          <span className="confirm-label">Dirección</span>
          <span className="confirm-value">{clientAddress || client?.direccion || '—'}</span>
        </div>
        <div className="confirm-row">
          <span className="confirm-label">Fecha / Hora</span>
          <span className="confirm-value">{date} <strong style={{ color: 'var(--gold)' }}>{slotTime}</strong></span>
        </div>

        <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Líneas del pedido
          </label>
          {items.map((item, idx) => (
            <div key={idx} className="confirm-row" style={{ borderBottom: 'none', padding: '4px 0' }}>
              <span className="confirm-value">{item.rice.nombre} x {item.pax}</span>
              <span className="confirm-value">{(item.rice.precio * item.pax).toFixed(2)} €</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '12px' }}>
          {!canAddMore && (
            <p style={{ color: 'var(--status-yellow)', fontSize: '0.8rem', textAlign: 'center', marginBottom: '10px' }}>
              Intervalo {slotTime} completo. Selecciona otro para añadir más:
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              className="wizard-btn-next"
              onClick={onAddAnother}
              disabled={!canAddMore}
              style={{ width: '100%', padding: '10px', background: canAddMore ? undefined : 'var(--bg-secondary)', color: canAddMore ? undefined : 'var(--text-muted)' }}
            >
              + Añadir otro arroz {canAddMore ? `(quedan ${remainingPax} raciones)` : '(Lleno)'}
            </button>

            {suggestions.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                {suggestions.map(s => (
                  <button
                    key={s.time}
                    className="pax-grid-btn"
                    style={{ flex: 1, fontSize: '0.8rem', padding: '8px' }}
                    onClick={() => onSlotChange(s)}
                  >
                    Usar {s.time}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="confirm-row" style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <span className="confirm-label">Entrega</span>
          <span className="confirm-value">{recogida ? 'Recogida' : 'A domicilio'}</span>
        </div>
        {observaciones && (
          <div className="confirm-row">
            <span className="confirm-label">Notas</span>
            <span className="confirm-value">{observaciones}</span>
          </div>
        )}
        <div className="confirm-total">
          Total: {total.toFixed(2)} €
        </div>
      </div>
    </div>
  );
}
