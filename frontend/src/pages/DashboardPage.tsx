import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { OrderSheet, type OrderSavedInfo } from '../components/OrderSheet/OrderSheet';
import { SlotRow } from '../components/DayBoard/SlotRow';
import { OrderTile } from '../components/DayBoard/OrderTile';
import { OrderDetail } from '../components/DayBoard/OrderDetail';
import { ConfirmMoveModal } from '../components/Modals/ConfirmMoveModal';
import { getPedidos, updatePedido } from '../api/pedidos';
import { useAvailability } from '../hooks/useAvailability';
import type { Pedido } from '../types';
import { useAuth } from '../hooks/useAuth';
import { addDaysIso, fechaCorta, horaPedido, puedeEditarFecha, resumenLineas, todayIso } from '../utils/pedidos';
import './DashboardPage.css';

type Filtro = 'todos' | 'pendientes' | 'reparto' | 'local';

// Los filtros atenúan lo que no coincide: el tablero nunca cambia de forma
const FILTROS: { id: Filtro; label: string; test: (p: Pedido) => boolean }[] = [
  { id: 'todos', label: 'Todos', test: () => true },
  { id: 'pendientes', label: 'Por preparar', test: p => p.status === 'nuevo' || p.status === 'preparando' },
  { id: 'reparto', label: '🛵', test: p => !p.local_recogida },
  { id: 'local', label: '🏠', test: p => p.local_recogida },
];

const REFRESH_MS = 60_000;
const SLOT_MINUTES = 15;

function fechaLarga(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const s = new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Franja en curso o la siguiente (solo si la fecha es hoy). */
function franjaActual(times: string[]): string | null {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  return times.find(t => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m + SLOT_MINUTES > mins;
  }) ?? null;
}

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDateState] = useState<string>(searchParams.get('date') || todayIso());
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [detail, setDetail] = useState<Pedido | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  // Hoja de pedido: pedido=null → alta; pedido → edición
  const [sheet, setSheet] = useState<{ pedido: Pedido | null; time: string | null; fecha?: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { user } = useAuth();
  const { slots, loading: loadingSlots, error: errorSlots, reload: refetchAvailability } = useAvailability(date);
  const canCreate = !!user && user.rol !== 'cocinero' && user.rol !== 'repartidor';
  // Días pasados: solo el admin puede crear, mover o editar pedidos
  const editable = puedeEditarFecha(date, user?.rol);
  const isToday = date === todayIso();

  const [pendingMove, setPendingMove] = useState<{
    orderIds: number[];
    orderSummary: string;
    clientName: string;
    sourceTime: string;
    targetTime: string;
  } | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  const [touchDragInfo, setTouchDragInfo] = useState<{
    order: Pedido;
    x: number;
    y: number;
    overTime: string | null;
  } | null>(null);

  // Copia síncrona del arrastre táctil para leerla en touchend
  const dragRef = useRef(touchDragInfo);
  dragRef.current = touchDragInfo;

  function setDate(d: string) {
    setDateState(d);
    setSearchParams({ date: d }, { replace: true });
  }

  const loadPedidos = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoadingPedidos(true);
    try {
      setPedidos(await getPedidos({ fecha: date }));
    } catch {
      if (!silent) setPedidos([]);
    } finally {
      if (!silent) setLoadingPedidos(false);
    }
  }, [date, user]);

  useEffect(() => {
    if (user) loadPedidos();
  }, [user, loadPedidos]);

  // Refresco automático: varias tablets/móviles trabajan a la vez sobre el mismo día
  const busy = !!sheet || !!pendingMove || !!touchDragInfo || !!detail;
  useEffect(() => {
    if (busy) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      loadPedidos(true);
      refetchAvailability();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [busy, loadPedidos, refetchAvailability]);

  // ── Derivados ──
  const activos = useMemo(() => pedidos.filter(p => p.status !== 'cancelado'), [pedidos]);

  const kpis = useMemo(() => ({
    pedidos: activos.length,
    raciones: activos.reduce((s, p) => s + p.pax, 0),
    reparto: activos.filter(p => !p.local_recogida).length,
    pendientes: activos.filter(p => p.status === 'nuevo' || p.status === 'preparando').length,
  }), [activos]);

  // Producción del día: raciones por arroz (lo que necesita cocina)
  const produccion = useMemo(() => {
    const map = new Map<string, { total: number; pendiente: number }>();
    for (const p of activos) {
      const pendiente = p.status === 'nuevo' || p.status === 'preparando';
      for (const l of p.lineas ?? []) {
        const k = l.arroz_nombre || 'Arroz';
        const e = map.get(k) ?? { total: 0, pendiente: 0 };
        e.total += l.raciones;
        if (pendiente) e.pendiente += l.raciones;
        map.set(k, e);
      }
    }
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [activos]);

  const testFiltro = FILTROS.find(f => f.id === filtro)!.test;
  const cancelados = useMemo(() => pedidos.filter(p => p.status === 'cancelado'), [pedidos]);
  const porFranja = useMemo(() => {
    const acc: Record<string, Pedido[]> = {};
    for (const p of activos) (acc[horaPedido(p.fecha_pedido)] ??= []).push(p);
    for (const k in acc) acc[k].sort((a, b) => a.id - b.id); // orden estable: por alta
    return acc;
  }, [activos]);

  const nowTime = isToday ? franjaActual(slots.map(s => s.time)) : null;

  // ── Mover pedidos ──
  function requestMove(order: Pedido, sourceTime: string, targetTime: string) {
    if (!editable) return;
    // Si el cliente tiene varios pedidos en la franja, se mueven juntos
    const related = pedidos.filter(p =>
      p.cliente_id === order.cliente_id && horaPedido(p.fecha_pedido) === sourceTime && p.status !== 'cancelado',
    );
    const summary = related.length > 1
      ? `${related.length} pedidos (${related.map(resumenLineas).join(', ')})`
      : `Pedido #${String(order.id).padStart(4, '0')} (${resumenLineas(order)})`;
    setPendingMove({
      orderIds: related.map(o => o.id),
      orderSummary: summary,
      clientName: order.cliente_nombre || '',
      sourceTime,
      targetTime,
    });
  }

  useEffect(() => {
    if (!touchDragInfo) return;

    function handleTouchMove(e: TouchEvent) {
      e.preventDefault();
      const touch = e.touches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const row = el?.closest('[data-slot-time]') as HTMLElement | null;
      const overTime = row?.dataset.slotTime || null;
      document.querySelectorAll('.board-row.drag-over').forEach(r => {
        if (r !== row) r.classList.remove('drag-over');
      });
      row?.classList.add('drag-over');
      setTouchDragInfo(prev => (prev ? { ...prev, x: touch.clientX, y: touch.clientY, overTime } : null));
    }

    function handleTouchEnd() {
      document.querySelectorAll('.board-row.drag-over').forEach(r => r.classList.remove('drag-over'));
      const info = dragRef.current;
      if (info?.overTime) {
        const source = horaPedido(info.order.fecha_pedido);
        if (info.overTime !== source) requestMove(info.order, source, info.overTime);
      }
      setTouchDragInfo(null);
    }

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
    // requestMove depende de `pedidos`, que no cambia durante un arrastre
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [touchDragInfo !== null]);

  async function handleConfirmMove() {
    if (!pendingMove) return;
    setIsMoving(true);
    try {
      for (const id of pendingMove.orderIds) {
        await updatePedido(id, { fecha_pedido: `${date} ${pendingMove.targetTime}` });
      }
      await Promise.all([loadPedidos(true), refetchAvailability()]);
      setPendingMove(null);
    } catch (err) {
      console.error('Error moving order:', err);
      alert('Error al mover el pedido. Es posible que la franja esté llena.');
    } finally {
      setIsMoving(false);
    }
  }

  function handleOrderSaved(info: OrderSavedInfo) {
    setSheet(null);
    setToast(info.message);
    window.setTimeout(() => setToast(null), 3500);
    if (info.date !== date) {
      setDate(info.date); // saltar al día del pedido
    } else {
      loadPedidos(true);
      refetchAvailability();
    }
  }

  const loading = (loadingPedidos && pedidos.length === 0) || (loadingSlots && slots.length === 0);

  return (
    <div className="board">
      {/* ── Cabecera: día + KPIs + acción ── */}
      <header className="board-header">
        <div className="board-daynav">
          <button type="button" className="board-navbtn" onClick={() => setDate(addDaysIso(date, -1))} aria-label="Día anterior">‹</button>
          <label className="board-date">
            <span className="board-date-label board-date-long">{fechaLarga(date)}</span>
            <span className="board-date-label board-date-short">{fechaCorta(date)}</span>
            <input type="date" value={date} onChange={e => e.target.value && setDate(e.target.value)} />
          </label>
          <button type="button" className="board-navbtn" onClick={() => setDate(addDaysIso(date, 1))} aria-label="Día siguiente">›</button>
          {!isToday && (
            <button type="button" className="board-today" onClick={() => setDate(todayIso())}>Hoy</button>
          )}
        </div>

        <div className="board-kpis">
          <span><strong>{kpis.pedidos}</strong> pedidos</span>
          <span><strong>{kpis.raciones}</strong> raciones</span>
          <span><strong>{kpis.reparto}</strong> 🛵</span>
          {kpis.pendientes > 0 && <span className="board-kpi-warn"><strong>{kpis.pendientes}</strong> por preparar</span>}
        </div>

        {canCreate && (
          <button
            type="button"
            className="board-new"
            aria-label="Nuevo pedido"
            // En un día pasado (sin ser admin) el pedido nuevo se propone para hoy
            onClick={() => setSheet({ pedido: null, time: null, fecha: editable ? date : todayIso() })}
          >
            +<span className="board-new-text"> Nuevo pedido</span>
          </button>
        )}
      </header>

      {/* ── Producción por arroz + filtros (una sola línea) ── */}
      <div className="board-sub">
        <div className="board-prod" aria-label="Raciones por arroz">
          {produccion.map(([nombre, v]) => (
            <span key={nombre} className={`board-prod-item ${v.pendiente === 0 ? 'done' : ''}`} title={`${v.pendiente} por hacer`}>
              <span className="board-prod-name">{nombre}</span>
              <strong>{v.total}</strong>
              {v.pendiente > 0 && v.pendiente < v.total && <small>{v.pendiente}</small>}
            </span>
          ))}
        </div>
        <div className="board-filters" role="tablist" aria-label="Resaltar pedidos">
          {FILTROS.map(f => (
            <button
              type="button"
              role="tab"
              key={f.id}
              aria-selected={filtro === f.id}
              className={`board-filter ${filtro === f.id ? 'selected' : ''}`}
              onClick={() => setFiltro(f.id)}
            >
              {f.label}
            </button>
          ))}
          {cancelados.length > 0 && (
            <button type="button" className="board-filter board-filter-cancel" onClick={() => setShowCancelled(true)}>
              Cancelados {cancelados.length}
            </button>
          )}
        </div>
      </div>

      {/* ── Tablero: 11 franjas × 6 casillas, siempre la jornada completa ── */}
      <div className="board-grid">
        {loading && <p className="board-empty">Cargando…</p>}
        {errorSlots && <p className="board-empty">{errorSlots}</p>}
        {!loading && slots.length === 0 && <p className="board-empty">No hay franjas para este día</p>}

        {slots.map(slot => (
          <SlotRow
            key={slot.time}
            slot={slot}
            isNow={slot.time === nowTime}
            canCreate={canCreate && editable}
            onCreate={time => setSheet({ pedido: null, time })}
            onDropOrder={(orderId, sourceTime, targetTime) => {
              const order = pedidos.find(p => p.id === orderId);
              if (order) requestMove(order, sourceTime, targetTime);
            }}
            tiles={(porFranja[slot.time] ?? []).map(p => (
              <OrderTile
                key={p.id}
                pedido={p}
                dimmed={!testFiltro(p)}
                dragging={touchDragInfo?.order.id === p.id}
                onOpen={setDetail}
                movable={editable && p.status !== 'cancelado'}
                onDragStartTouch={(order, x, y) => setTouchDragInfo({ order, x, y, overTime: null })}
              />
            ))}
          />
        ))}
      </div>

      {detail && (
        <OrderDetail
          pedido={detail}
          canEdit={user?.rol !== 'repartidor' && puedeEditarFecha(date, user?.rol)}
          onClose={() => setDetail(null)}
          onEdit={p => { setDetail(null); setShowCancelled(false); setSheet({ pedido: p, time: null }); }}
          onChanged={() => { setDetail(null); loadPedidos(true); refetchAvailability(); }}
        />
      )}

      {showCancelled && !detail && (
        <div className="detail-overlay" onClick={() => setShowCancelled(false)}>
          <div className="detail-panel" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="detail-head">
              <h3 className="detail-name">Cancelados</h3>
              <button type="button" className="detail-close" onClick={() => setShowCancelled(false)} aria-label="Cerrar">×</button>
            </div>
            <div className="cancel-list">
              {cancelados.map(p => (
                <button type="button" key={p.id} className="cancel-item" onClick={() => setDetail(p)}>
                  <strong>{horaPedido(p.fecha_pedido)}</strong> {p.cliente_nombre} · {resumenLineas(p)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {sheet && (
        <OrderSheet
          pedido={sheet.pedido}
          initialDate={sheet.fecha ?? date}
          initialTime={sheet.time}
          onClose={() => setSheet(null)}
          onSaved={handleOrderSaved}
        />
      )}

      {toast && <div className="app-toast" role="status">{toast}</div>}

      {pendingMove && (
        <ConfirmMoveModal
          orderIds={pendingMove.orderIds}
          orderSummary={pendingMove.orderSummary}
          clientName={pendingMove.clientName}
          sourceTime={pendingMove.sourceTime}
          targetTime={pendingMove.targetTime}
          isUpdating={isMoving}
          onConfirm={handleConfirmMove}
          onCancel={() => setPendingMove(null)}
        />
      )}

      {touchDragInfo && (
        <div className="touch-drag-ghost glass-card" style={{ left: touchDragInfo.x, top: touchDragInfo.y }}>
          <div className="order-client-name">
            {touchDragInfo.order.cliente_nombre || `Cliente #${touchDragInfo.order.cliente_id}`}
          </div>
          <div className="order-details">
            <span className="order-rice-badge">{resumenLineas(touchDragInfo.order)}</span>
            <span className="order-pax-badge">{touchDragInfo.order.pax} PAX</span>
            <span className="order-time">
              {horaPedido(touchDragInfo.order.fecha_pedido)}
              {touchDragInfo.overTime && ` → ${touchDragInfo.overTime}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
