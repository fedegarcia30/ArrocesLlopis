import { useState } from 'react';
import type { Arroz } from '../../types';
import { eur } from '../../utils/pedidos';

export interface CartLine {
  rice: Arroz;
  pax: number;
}

interface Props {
  rices: Arroz[];
  loading: boolean;
  lines: CartLine[];
  onChange: (lines: CartLine[]) => void;
}

export const MIN_PAX_LINE = 2;
const QUICK_PAX = [2, 4, 6, 8, 10, 12];

export function RiceCart({ rices, loading, lines, onChange }: Props) {
  const [activeId, setActiveId] = useState<number | null>(null);

  function toggleRice(rice: Arroz) {
    if (lines.some(l => l.rice.id === rice.id)) {
      setActiveId(rice.id);
      return;
    }
    onChange([...lines, { rice, pax: MIN_PAX_LINE }]);
    setActiveId(rice.id);
  }

  function setPax(id: number, pax: number) {
    onChange(lines.map(l => (l.rice.id === id ? { ...l, pax: Math.max(MIN_PAX_LINE, pax) } : l)));
    setActiveId(id);
  }

  function remove(id: number) {
    onChange(lines.filter(l => l.rice.id !== id));
    if (activeId === id) setActiveId(null);
  }

  const totalPax = lines.reduce((s, l) => s + l.pax, 0);
  const total = lines.reduce((s, l) => s + l.pax * l.rice.precio, 0);
  // Por defecto la línea activa es la última añadida
  const active = activeId ?? lines[lines.length - 1]?.rice.id ?? null;

  return (
    <div className="os-cart">
      {loading ? (
        <p className="os-hint">Cargando arroces…</p>
      ) : (
        <div className="os-rice-grid">
          {rices.map(r => {
            const line = lines.find(l => l.rice.id === r.id);
            return (
              <button
                type="button"
                key={r.id}
                className={`os-rice ${line ? 'in-cart' : ''}`}
                onClick={() => toggleRice(r)}
              >
                <span className="os-rice-name">{r.nombre}</span>
                <span className="os-rice-price">{eur(r.precio)}</span>
                {line && <span className="os-rice-badge">×{line.pax}</span>}
              </button>
            );
          })}
        </div>
      )}

      {lines.length === 0 ? (
        <p className="os-hint">Toca un arroz para añadirlo. Puedes añadir varios al mismo pedido.</p>
      ) : (
        <div className="os-lines">
          {lines.map(l => (
            <div
              key={l.rice.id}
              className={`os-line ${active === l.rice.id ? 'active' : ''}`}
              onClick={() => setActiveId(l.rice.id)}
            >
              <div className="os-line-main">
                <span className="os-line-name">{l.rice.nombre}</span>
                <div className="os-stepper" onClick={e => e.stopPropagation()}>
                  <button type="button" onClick={() => setPax(l.rice.id, l.pax - 1)} disabled={l.pax <= MIN_PAX_LINE} aria-label="Quitar ración">−</button>
                  <span className="os-stepper-val">{l.pax}</span>
                  <button type="button" onClick={() => setPax(l.rice.id, l.pax + 1)} aria-label="Añadir ración">+</button>
                </div>
                <span className="os-line-sub">{eur(l.pax * l.rice.precio)}</span>
                <button
                  type="button"
                  className="os-line-remove"
                  onClick={e => { e.stopPropagation(); remove(l.rice.id); }}
                  aria-label={`Quitar ${l.rice.nombre}`}
                >
                  ×
                </button>
              </div>
              {active === l.rice.id && (
                <div className="os-quick-pax" onClick={e => e.stopPropagation()}>
                  {QUICK_PAX.map(p => (
                    <button
                      type="button"
                      key={p}
                      className={`os-chip ${l.pax === p ? 'selected' : ''}`}
                      onClick={() => setPax(l.rice.id, p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="os-cart-total">
            <span>{totalPax} raciones</span>
            <strong>{eur(total)}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
