import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AvailabilityGrid } from '../components/AvailabilityGrid/AvailabilityGrid';
import { OrderSheet, type OrderSavedInfo } from '../components/OrderSheet/OrderSheet';
import { OrderCard } from '../components/OrderCard/OrderCard';
import { OrderSummaryPill } from '../components/OrderCard/OrderSummaryPill';
import { ConfirmMoveModal } from '../components/Modals/ConfirmMoveModal';
import { getPedidos, updatePedido } from '../api/pedidos';
import { useAvailability } from '../hooks/useAvailability';
import type { Slot, Pedido } from '../types';
import { useAuth } from '../hooks/useAuth';
import { resumenLineas, todayIso } from '../utils/pedidos';

function getTimeString(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DashboardPage() {
  const [searchParams] = useSearchParams();
  const initialDate = searchParams.get('date') || todayIso();

  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  // Hoja de pedido: pedido=null → alta; pedido → edición
  const [sheet, setSheet] = useState<{ pedido: Pedido | null; time: string | null } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [date, setDate] = useState<string>(initialDate);
  const ordersSectionRef = useRef<HTMLElement>(null);
  const { user } = useAuth();
  const { slots, loading: loadingSlots, error: errorSlots, reload: refetchAvailability } = useAvailability(date);

  // Move confirmation state
  const [pendingMove, setPendingMove] = useState<{
    orderIds: number[];
    orderSummary: string;
    clientName: string;
    sourceTime: string;
    targetTime: string;
  } | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  // Touch Drag state
  const [touchDragInfo, setTouchDragInfo] = useState<{
    order: Pedido;
    x: number;
    y: number;
    overTime: string | null;
  } | null>(null);

  useEffect(() => {
    if (!touchDragInfo) return;

    function handleTouchMove(e: TouchEvent) {
      if (!touchDragInfo) return;
      const touch = e.touches[0];
      const x = touch.clientX;
      const y = touch.clientY;

      // Find element under touch
      const element = document.elementFromPoint(x, y);
      const slotElement = element?.closest('[data-slot-time]') as HTMLElement;
      const overTime = slotElement?.dataset.slotTime || null;

      // Clear previous highlights
      document.querySelectorAll('.slot-card.drag-over').forEach(el => {
        if ((el as HTMLElement).dataset.slotTime !== overTime) {
          el.classList.remove('drag-over');
        }
      });

      // Highlight current slot
      if (slotElement) {
        slotElement.classList.add('drag-over');
      }

      setTouchDragInfo(prev => prev ? { ...prev, x, y, overTime } : null);
    }

    function handleTouchEnd() {
      if (!touchDragInfo) return;

      // Cleanup highlights
      document.querySelectorAll('.slot-card.drag-over').forEach(el => el.classList.remove('drag-over'));

      if (touchDragInfo.overTime && touchDragInfo.overTime !== getTimeString(touchDragInfo.order.fecha_pedido)) {
        const sourceTime = getTimeString(touchDragInfo.order.fecha_pedido);
        const targetTime = touchDragInfo.overTime;

        // Find all orders for this client at this time
        const relatedOrders = pedidos.filter(p =>
          p.cliente_id === touchDragInfo.order.cliente_id &&
          getTimeString(p.fecha_pedido) === sourceTime
        );

        const summary = relatedOrders.length > 1
          ? `${relatedOrders.length} pedidos (${relatedOrders.map(resumenLineas).join(', ')})`
          : `Pedido #${String(touchDragInfo.order.id).padStart(4, '0')} (${resumenLineas(touchDragInfo.order)})`;

        setPendingMove({
          orderIds: relatedOrders.map(o => o.id),
          orderSummary: summary,
          clientName: touchDragInfo.order.cliente_nombre || '',
          sourceTime,
          targetTime
        });
      }
      setTouchDragInfo(null);
    }

    window.addEventListener('touchmove', handleTouchMove as any, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleTouchMove as any);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [touchDragInfo]);

  const loadPedidos = useCallback(async () => {
    if (!user) return;
    setLoadingPedidos(true);
    try {
      const data = await getPedidos({ fecha: date });
      setPedidos(data);
    } catch {
      setPedidos([]);
    } finally {
      setLoadingPedidos(false);
    }
  }, [date, user]);

  useEffect(() => {
    if (user) {
      loadPedidos();
    }
  }, [user, loadPedidos]);

  const filteredPedidos = selectedSlot
    ? pedidos.filter((p) => getTimeString(p.fecha_pedido) === selectedSlot.time)
    : pedidos;

  // Grouping for the summary view
  const groupedPedidos = pedidos.reduce((acc, p) => {
    const time = getTimeString(p.fecha_pedido);
    if (!acc[time]) acc[time] = [];
    acc[time].push(p);
    return acc;
  }, {} as Record<string, Pedido[]>);

  function handleSlotSelect(slot: Slot) {
    setSelectedSlot(slot);
    // Auto-scroll to orders on mobile
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        ordersSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }

  function handleNewOrder() {
    // Si hay una franja con hueco seleccionada, se usa como hora sugerida
    setSheet({ pedido: null, time: selectedSlot?.available ? selectedSlot.time : null });
  }

  function handleOrderSaved(info: OrderSavedInfo) {
    setSheet(null);
    setToast(info.message);
    window.setTimeout(() => setToast(null), 3500);
    if (info.date !== date) {
      // Saltamos al día del pedido para que se vea dónde ha quedado
      setSelectedSlot(null);
      setDate(info.date);
    } else {
      loadPedidos();
      refetchAvailability();
    }
  }

  async function handleConfirmMove() {
    if (!pendingMove) return;
    setIsMoving(true);
    try {
      const newDateTime = `${date} ${pendingMove.targetTime}`;
      // Update all orders sequentially
      for (const id of pendingMove.orderIds) {
        await updatePedido(id, { fecha_pedido: newDateTime });
      }
      await Promise.all([loadPedidos(), refetchAvailability()]);
      setPendingMove(null);
    } catch (err) {
      console.error('Error moving order:', err);
      alert('Error al mover el pedido. Es posible que la franja esté llena o el formato de fecha sea incorrecto.');
    } finally {
      setIsMoving(false);
    }
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Arroces Llopis</h1>
        {user?.rol !== 'cocinero' && (
          <button className="fab-new-order" onClick={handleNewOrder}>
            + Nuevo pedido{selectedSlot?.available ? ` · ${selectedSlot.time}` : ''}
          </button>
        )}
        <div className="dashboard-header-controls">
          <input
            type="date"
            className="availability-date-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          {!loadingPedidos && (
            <span className="dashboard-total-badge">{pedidos.length} pedidos</span>
          )}
        </div>
      </div>

      <div className="dashboard-split">
        <section className="dashboard-left">
          <AvailabilityGrid
            selectedSlot={selectedSlot}
            onSlotSelect={handleSlotSelect}
            onDropOrder={(orderId, clientName, sourceTime, targetTime) => {
              const order = pedidos.find(p => p.id === orderId);
              if (!order) return;

              const relatedOrders = pedidos.filter(p =>
                p.cliente_id === order.cliente_id &&
                getTimeString(p.fecha_pedido) === sourceTime
              );

              const summary = relatedOrders.length > 1
                ? `${relatedOrders.length} pedidos (${relatedOrders.map(resumenLineas).join(', ')})`
                : `Pedido #${String(orderId).padStart(4, '0')} (${resumenLineas(order)})`;

              setPendingMove({
                orderIds: relatedOrders.map(o => o.id),
                orderSummary: summary,
                clientName,
                sourceTime,
                targetTime
              });
            }}
            slots={slots}
            loading={loadingSlots}
            error={errorSlots}
          />
        </section>

        <section className="dashboard-right" ref={ordersSectionRef}>
          {selectedSlot && (
            <div className="dashboard-right-header">
              <span className="dashboard-slot-label">{selectedSlot.time} · {filteredPedidos.length} ped.</span>
              <button
                className="btn-clear-selection"
                onClick={() => setSelectedSlot(null)}
              >
                Ver todos
              </button>
            </div>
          )}

          <div className={`orders-list${selectedSlot ? '' : ' orders-summary-mode'}`}>
            {loadingPedidos && <p className="orders-empty">Cargando pedidos...</p>}

            {!loadingPedidos && pedidos.length === 0 && (
              <p className="orders-empty">No hay pedidos para este día</p>
            )}

            {!loadingPedidos && selectedSlot && filteredPedidos.length === 0 && (
              <p className="orders-empty">No hay pedidos en esta franja</p>
            )}

            {!loadingPedidos && (
              selectedSlot ? (
                // Detailed view for selected slot
                filteredPedidos.map((pedido) => (
                  <OrderCard
                    key={pedido.id}
                    pedido={pedido}
                    onStatusChange={loadPedidos}
                    onEdit={(p) => setSheet({ pedido: p, time: null })}
                    onDragStartTouch={(order, x, y) => setTouchDragInfo({ order, x, y, overTime: null })}
                    isDragging={touchDragInfo?.order.id === pedido.id}
                  />
                ))
              ) : (
                // Summary view — one row per slot, aligned with left panel
                slots.map((slot) => {
                  const slotOrders = groupedPedidos[slot.time] || [];
                  return (
                    <div key={slot.time} className="order-summary-group">
                      <div className="summary-pills-container">
                        {slotOrders.map((p) => (
                          <OrderSummaryPill key={p.id} pedido={p} />
                        ))}
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>

        </section>
      </div>

      {sheet && (
        <OrderSheet
          pedido={sheet.pedido}
          initialDate={date}
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
        <div
          className="touch-drag-ghost glass-card"
          style={{
            left: touchDragInfo.x,
            top: touchDragInfo.y,
          }}
        >
          <div className="order-card-body">
            <div className="order-client-name">
              {touchDragInfo.order.cliente_nombre || `Cliente #${touchDragInfo.order.cliente_id}`}
            </div>
            <div className="order-details">
              <span className="order-rice-badge">
                {resumenLineas(touchDragInfo.order)}
              </span>
              <span className="order-pax-badge">{touchDragInfo.order.pax} PAX</span>
              <span className="order-time">{getTimeString(touchDragInfo.order.fecha_pedido)}</span>
            </div>
          </div>
          <span className={`order-status-badge ${touchDragInfo.order.status}`}>
            {touchDragInfo.order.status === 'nuevo' ? 'Confirmado' : touchDragInfo.order.status}
          </span>
        </div>
      )}
    </div>
  );
}
