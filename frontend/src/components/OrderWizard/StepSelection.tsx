import { useEffect, useState } from 'react';
import { getRices } from '../../api/arroces';
import type { Arroz } from '../../types';

const MIN_PAX = 2;
const MAX_PAX = 12;

interface StepSelectionProps {
  selectedRice: Arroz | null;
  onRiceSelect: (rice: Arroz) => void;
  pax: number;
  onPaxChange: (pax: number) => void;
  remainingPax: number;
}

export function StepSelection({
  selectedRice,
  onRiceSelect,
  pax,
  onPaxChange,
  remainingPax,
}: StepSelectionProps) {
  const [rices, setRices] = useState<Arroz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRices()
      .then(setRices)
      .catch(() => setRices([]))
      .finally(() => setLoading(false));
  }, []);

  const totalMax = Math.min(MAX_PAX, remainingPax);
  const paxOptions = Array.from({ length: totalMax - MIN_PAX + 1 }, (_, i) => i + MIN_PAX);

  return (
    <div className="wizard-step">
      <div>
        <label>Tipo de arroz</label>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Cargando...</p>
        ) : (
          <div className="rice-grid">
            {rices.map((rice) => (
              <button
                key={rice.id}
                className={`rice-btn ${selectedRice?.id === rice.id ? 'selected' : ''}`}
                onClick={() => onRiceSelect(rice)}
              >
                <span className="rice-name">{rice.nombre}</span>
                <span className="rice-price">
                  {rice.precio.toFixed(2)}
                  <span className="rice-unit"> €/rac</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label>Raciones (PAX)</label>

        <div className="pax-grid">
          {paxOptions.map(p => (
            <button
              key={p}
              className={`pax-grid-btn ${pax === p ? 'selected' : ''}`}
              onClick={() => onPaxChange(p)}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="pax-stepper">
          <button
            className="pax-btn"
            onClick={() => onPaxChange(Math.max(MIN_PAX, pax - 1))}
            disabled={pax <= MIN_PAX}
          >
            −
          </button>
          <div>
            <div className="pax-value">{pax}</div>
            <div className="pax-label">máx {totalMax}</div>
          </div>
          <button
            className="pax-btn"
            onClick={() => onPaxChange(Math.min(totalMax, pax + 1))}
            disabled={pax >= totalMax}
          >
            +
          </button>
        </div>
        {remainingPax < 12 && (
          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Quedan {remainingPax} raciones disponibles en este slot
          </p>
        )}
      </div>
    </div>
  );
}
