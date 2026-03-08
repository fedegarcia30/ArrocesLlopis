import { useState, useEffect, useMemo, useRef } from 'react';
import { getPedidos, updateOrderStatus, updatePedido, savePedidoFeedback } from '../api/pedidos';
import type { Pedido } from '../types';
import './RepartosPage.css';

/* ── Utilities ──────────────────────────────────────────────────── */

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getWeekDates(): string[] {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function getTimeString(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return monday.toISOString().slice(0, 10);
}

function formatWeekLabel(weekStart: string): string {
  const monday = new Date(weekStart + 'T12:00:00');
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

// Groups delivery orders by a key (time or date), then by client
function groupByTimeAndClient(
  pedidos: Pedido[],
  keyFn: (p: Pedido) => string,
): Record<string, Pedido[][]> {
  const byKey: Record<string, Record<string, Pedido[]>> = {};
  for (const p of pedidos.filter(p => !p.local_recogida)) {
    const k = keyFn(p);
    const clientKey = String(p.cliente_id);
    if (!byKey[k]) byKey[k] = {};
    if (!byKey[k][clientKey]) byKey[k][clientKey] = [];
    byKey[k][clientKey].push(p);
  }
  const result: Record<string, Pedido[][]> = {};
  for (const k of Object.keys(byKey)) result[k] = Object.values(byKey[k]);
  return result;
}

/* ── Main container with tabs + swipe ───────────────────────────── */

export function RepartosPage() {
  const defaultView = (): 'repartos' | 'recogidas' => {
    const day = new Date().getDay(); // 1=Mon … 4=Thu → recogidas
    return [1, 2, 3, 4].includes(day) ? 'recogidas' : 'repartos';
  };

  const [activeView, setActiveView] = useState<'repartos' | 'recogidas'>(defaultView);
  const touchStartX = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 60) {
      if (dx > 0 && activeView === 'repartos') setActiveView('recogidas');
      if (dx < 0 && activeView === 'recogidas') setActiveView('repartos');
    }
    touchStartX.current = null;
  }

  return (
    <div className="repartos-page" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="logistics-tabs">
        <button
          className={`logistics-tab${activeView === 'recogidas' ? ' active' : ''}`}
          onClick={() => setActiveView('recogidas')}
        >
          Recogidas
        </button>
        <button
          className={`logistics-tab${activeView === 'repartos' ? ' active' : ''}`}
          onClick={() => setActiveView('repartos')}
        >
          Repartos
        </button>
      </div>

      {/* Both views stay mounted to preserve state */}
      <div className={`logistics-view${activeView === 'repartos' ? '' : ' hidden'}`}>
        <RepartosView />
      </div>
      <div className={`logistics-view${activeView === 'recogidas' ? '' : ' hidden'}`}>
        <RecogidасView />
      </div>
    </div>
  );
}

/* ── Repartos view ──────────────────────────────────────────────── */

function RepartosView() {
  const weekDates = useMemo(getWeekDates, []);
  const today = todayString();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [weekData, setWeekData] = useState<Record<string, Pedido[]>>({});
  const [loadingWeek, setLoadingWeek] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [confirmAnular, setConfirmAnular] = useState<{
    ids: number[]; key: string; clientName: string;
  } | null>(null);
  const [forceExpanded, setForceExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoadingWeek(true);
    Promise.all(
      weekDates.map(d =>
        getPedidos({ fecha: d })
          .then(data => ({ d, data }))
          .catch(() => ({ d, data: [] as Pedido[] }))
      )
    ).then(results => {
      const map: Record<string, Pedido[]> = {};
      for (const { d, data } of results) map[d] = data;
      setWeekData(map);
    }).finally(() => setLoadingWeek(false));
  }, [weekDates]);

  useEffect(() => { setForceExpanded(new Set()); }, [selectedDate]);

  function dayDeliveryCount(date: string): number {
    return new Set(
      (weekData[date] || [])
        .filter(p => !p.local_recogida)
        .map(p => `${getTimeString(p.fecha_pedido)}|${p.cliente_id}`)
    ).size;
  }

  function updateLocal(ids: number[], status: 'entregado' | 'listo') {
    if (!selectedDate) return;
    setWeekData(prev => ({
      ...prev,
      [selectedDate]: prev[selectedDate].map(p =>
        ids.includes(p.id) ? { ...p, status, entregado: status === 'entregado' } : p
      ),
    }));
  }

  async function handleEntregado(ids: number[], groupKey: string) {
    setUpdatingKey(groupKey);
    try {
      for (const id of ids) await updateOrderStatus(id, 'entregado');
      updateLocal(ids, 'entregado');
    } finally { setUpdatingKey(null); }
  }

  async function handleAnular(ids: number[], groupKey: string) {
    setUpdatingKey(groupKey);
    try {
      for (const id of ids) await updateOrderStatus(id, 'listo');
      updateLocal(ids, 'listo');
    } finally { setUpdatingKey(null); setConfirmAnular(null); }
  }

  const dayPedidos = selectedDate ? weekData[selectedDate] || [] : [];
  const grouped = groupByTimeAndClient(dayPedidos, p => getTimeString(p.fecha_pedido));
  const sortedTimes = Object.keys(grouped).sort();

  function isCollapsed(time: string): boolean {
    const allDone = grouped[time]?.every(g => g.every(p => p.status === 'entregado')) ?? false;
    return allDone && !forceExpanded.has(time);
  }

  function toggleRow(time: string) {
    setForceExpanded(prev => {
      const next = new Set(prev);
      if (next.has(time)) next.delete(time); else next.add(time);
      return next;
    });
  }

  return (
    <>
      <div className="repartos-section-header">
        <h2 className="repartos-section-title">Repartos</h2>
        {selectedDate && (
          <button className="btn-clear-selection" onClick={() => setSelectedDate(null)}>
            ← Semana
          </button>
        )}
      </div>

      {!selectedDate ? (
        <div className="repartos-week">
          {loadingWeek ? (
            <p className="repartos-empty">Cargando semana...</p>
          ) : (
            <div className="week-grid">
              {weekDates.map(date => {
                const count = dayDeliveryCount(date);
                return (
                  <button
                    key={date}
                    className={`day-card${date === today ? ' today' : ''}${count === 0 ? ' empty' : ''}`}
                    onClick={() => count > 0 && setSelectedDate(date)}
                  >
                    <span className="day-name">
                      {new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short' })}
                    </span>
                    <span className="day-number">{new Date(date + 'T12:00:00').getDate()}</span>
                    {count > 0
                      ? <span className="day-count">{count}</span>
                      : <span className="day-empty-mark">—</span>
                    }
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="repartos-day">
          <p className="repartos-day-label">
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </p>

          {sortedTimes.length === 0 && <p className="repartos-empty">No hay repartos este día</p>}

          <div className="repartos-slots-list">
            {sortedTimes.map(time => {
              const groups = grouped[time];
              const doneCount = groups.filter(g => g.every(p => p.status === 'entregado')).length;
              const collapsed = isCollapsed(time);
              return (
                <div key={time} className={`repartos-slot${collapsed ? ' collapsed' : ''}`}>
                  <button className="repartos-slot-header" onClick={() => toggleRow(time)}>
                    <span className="repartos-time">{time}</span>
                    <span className="repartos-slot-progress">
                      {doneCount === groups.length ? '✓ Todo entregado' : `${doneCount}/${groups.length} entregados`}
                    </span>
                    <span className="repartos-slot-chevron">{collapsed ? '▸' : '▾'}</span>
                  </button>
                  {!collapsed && (
                    <div className="repartos-pills-grid">
                      {groups.map(group => {
                        const groupKey = `${time}|${group[0].cliente_id}`;
                        const entregado = group.every(p => p.status === 'entregado');
                        const ids = group.map(p => p.id);
                        return (
                          <DeliveryPill
                            key={groupKey}
                            pedidos={group}
                            done={entregado}
                            updating={updatingKey === groupKey}
                            onToggle={() => {
                              if (entregado) {
                                setConfirmAnular({ ids, key: groupKey, clientName: group[0].cliente_nombre || '' });
                              } else {
                                handleEntregado(ids, groupKey);
                              }
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {confirmAnular && (
        <ConfirmModal
          clientName={confirmAnular.clientName}
          updating={updatingKey === confirmAnular.key}
          onConfirm={() => handleAnular(confirmAnular.ids, confirmAnular.key)}
          onCancel={() => setConfirmAnular(null)}
        />
      )}
    </>
  );
}

/* ── Recogidas view ─────────────────────────────────────────────── */

function RecogidасView() {
  const today = todayString();
  const fourWeeksAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 28);
    return d.toISOString().slice(0, 10);
  }, []);

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [confirmAnular, setConfirmAnular] = useState<{
    ids: number[]; key: string; clientName: string;
  } | null>(null);
  const [feedbackPending, setFeedbackPending] = useState<{
    ids: number[]; key: string; clientName: string;
  } | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    getPedidos({ status: 'entregado' })
      .then(data => {
        setPedidos(data.filter(p =>
          !p.local_recogida &&
          p.fecha_pedido.slice(0, 10) >= fourWeeksAgo &&
          p.fecha_pedido.slice(0, 10) < today
        ));
      })
      .catch(() => setPedidos([]))
      .finally(() => setLoading(false));
  }, [today, fourWeeksAgo]);

  function updateLocal(ids: number[], recogido: boolean) {
    setPedidos(prev => prev.map(p => ids.includes(p.id) ? { ...p, recogido } : p));
  }

  async function handleFeedbackSubmit(
    ids: number[],
    groupKey: string,
    rating: number | null,
    comentario: string,
  ) {
    setUpdatingKey(groupKey);
    setFeedbackPending(null);
    try {
      // Save feedback only if something was entered
      if (rating !== null || comentario.trim()) {
        for (const id of ids) await savePedidoFeedback(id, { rating: rating ?? undefined, comentario });
      }
      for (const id of ids) await updatePedido(id, { recogido: true });
      updateLocal(ids, true);
    } finally { setUpdatingKey(null); }
  }

  async function handleAnular(ids: number[], groupKey: string) {
    setUpdatingKey(groupKey);
    try {
      for (const id of ids) await updatePedido(id, { recogido: false });
      updateLocal(ids, false);
    } finally { setUpdatingKey(null); setConfirmAnular(null); }
  }

  // Group by week-start, then by client
  const grouped = groupByTimeAndClient(pedidos, p => getWeekStart(p.fecha_pedido.slice(0, 10)));

  // Only show weeks that still have at least one pending recogida
  const sortedWeeks = Object.keys(grouped)
    .sort()
    .reverse()
    .filter(week => grouped[week].some(g => g.some(p => !p.recogido)));

  function toggleRow(week: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(week)) next.delete(week); else next.add(week);
      return next;
    });
  }

  return (
    <>
      <div className="repartos-section-header">
        <h2 className="repartos-section-title">Recogidas pendientes</h2>
      </div>

      {loading && <p className="repartos-empty">Cargando...</p>}
      {!loading && sortedWeeks.length === 0 && (
        <p className="repartos-empty">No hay recogidas pendientes</p>
      )}

      <div className="repartos-slots-list">
        {sortedWeeks.map(week => {
          const groups = grouped[week];
          const pendingCount = groups.filter(g => g.some(p => !p.recogido)).length;
          const isCollpsd = collapsed.has(week);

          return (
            <div key={week} className={`repartos-slot${isCollpsd ? ' collapsed' : ''}`}>
              <button className="repartos-slot-header" onClick={() => toggleRow(week)}>
                <span className="repartos-time">{formatWeekLabel(week)}</span>
                <span className="repartos-slot-progress">{pendingCount} pendientes</span>
                <span className="repartos-slot-chevron">{isCollpsd ? '▸' : '▾'}</span>
              </button>
              {!isCollpsd && (
                <div className="repartos-pills-grid">
                  {groups.map(group => {
                    const groupKey = `${week}|${group[0].cliente_id}`;
                    const done = group.every(p => p.recogido);
                    const ids = group.map(p => p.id);
                    return (
                      <DeliveryPill
                        key={groupKey}
                        pedidos={group}
                        done={done}
                        updating={updatingKey === groupKey}
                        onToggle={() => {
                          if (done) {
                            setConfirmAnular({ ids, key: groupKey, clientName: group[0].cliente_nombre || '' });
                          } else {
                            setFeedbackPending({ ids, key: groupKey, clientName: group[0].cliente_nombre || '' });
                          }
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {feedbackPending && (
        <FeedbackModal
          clientName={feedbackPending.clientName}
          submitting={updatingKey === feedbackPending.key}
          onSubmit={(rating, comentario) =>
            handleFeedbackSubmit(feedbackPending.ids, feedbackPending.key, rating, comentario)
          }
          onCancel={() => setFeedbackPending(null)}
        />
      )}

      {confirmAnular && (
        <ConfirmModal
          clientName={confirmAnular.clientName}
          updating={updatingKey === confirmAnular.key}
          onConfirm={() => handleAnular(confirmAnular.ids, confirmAnular.key)}
          onCancel={() => setConfirmAnular(null)}
        />
      )}
    </>
  );
}

/* ── Shared components ──────────────────────────────────────────── */

interface DeliveryPillProps {
  pedidos: Pedido[];
  done: boolean;
  updating: boolean;
  onToggle: () => void;
}

function DeliveryPill({ pedidos, done, updating, onToggle }: DeliveryPillProps) {
  const first = pedidos[0];
  const address = first.direccion?.trim() || '';
  const phone = first.telefono?.trim() || '';

  return (
    <button
      className={`reparto-pill${done ? ' delivered' : ' pending'}${updating ? ' updating' : ''}`}
      onClick={onToggle}
      disabled={updating}
    >
      <div className={`pill-inner${done ? ' blurred' : ''}`}>
        <span className="pill-client">
          {first.cliente_nombre || `Cliente #${first.cliente_id}`}
        </span>
        <div className="pill-rices">
          {pedidos.map(p => {
            const rice = p.lineas?.map(l => l.arroz_nombre).filter(Boolean).join(' + ') || 'Arroz';
            return (
              <span key={p.id} className="pill-rice-line">
                {rice} <strong>×{p.pax}</strong>
              </span>
            );
          })}
        </div>
        {address && <span className="pill-address">📍 {address}</span>}
        {phone && <span className="pill-phone">📞 {phone}</span>}
      </div>
    </button>
  );
}

interface FeedbackModalProps {
  clientName: string;
  submitting: boolean;
  onSubmit: (rating: number | null, comentario: string) => void;
  onCancel: () => void;
}

function FeedbackModal({ clientName, submitting, onSubmit, onCancel }: FeedbackModalProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [comentario, setComentario] = useState('');

  const lit = hover ?? rating ?? 0;

  return (
    <div className="anular-overlay" onClick={onCancel}>
      <div className="feedback-modal glass-card" onClick={e => e.stopPropagation()}>
        <p className="feedback-title">Recogida · <strong>{clientName}</strong></p>

        <div className="star-row">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              type="button"
              className={`star-btn${n <= lit ? ' lit' : ''}`}
              onClick={() => setRating(prev => prev === n ? null : n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(null)}
            >
              ★
            </button>
          ))}
        </div>

        {rating !== null && (
          <p className="star-value">{rating} / 10</p>
        )}

        <textarea
          className="feedback-textarea"
          placeholder="Comentario del cliente (opcional)"
          value={comentario}
          onChange={e => setComentario(e.target.value)}
          rows={3}
        />

        <div className="feedback-actions">
          <button
            className="anular-btn-cancel"
            onClick={() => onSubmit(null, '')}
            disabled={submitting}
          >
            Saltar
          </button>
          <button
            className="wizard-btn-next"
            onClick={() => onSubmit(rating, comentario)}
            disabled={submitting}
          >
            {submitting ? '...' : 'Guardar y marcar recogido'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  clientName: string;
  updating: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ clientName, updating, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="anular-overlay" onClick={onCancel}>
      <div className="anular-modal glass-card" onClick={e => e.stopPropagation()}>
        <p className="anular-text">
          ¿Anular el estado de <strong>{clientName}</strong>?
        </p>
        <div className="anular-actions">
          <button className="anular-btn-cancel" onClick={onCancel}>Cancelar</button>
          <button className="anular-btn-confirm" disabled={updating} onClick={onConfirm}>
            {updating ? '...' : 'Sí, anular'}
          </button>
        </div>
      </div>
    </div>
  );
}
