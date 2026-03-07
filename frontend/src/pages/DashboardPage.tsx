import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AvailabilityGrid } from '../components/AvailabilityGrid/AvailabilityGrid';
import { OrderWizard } from '../components/OrderWizard/OrderWizard';
import { OrderCard } from '../components/OrderCard/OrderCard';
import { OrderSummaryPill } from '../components/OrderCard/OrderSummaryPill';
import { ConfirmMoveModal } from '../components/Modals/ConfirmMoveModal';
import { getPedidos, updatePedido } from '../api/pedidos';
import { useAvailability } from '../hooks/useAvailability';
import type { Slot, Pedido } from '../types';
import { useAuth } from '../hooks/useAuth';

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getTimeString(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DashboardPage() {
  const [searchParams] = useSearchParams();
  const initialDate = searchParams.get('date') || todayString();

  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [wizardSlot, setWizardSlot] = useState<Slot | null>(null);
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
          ? `${relatedOrders.length} pedidos (${relatedOrders.map(o => `${o.lineas?.[0]?.arroz_nombre || 'Arroz'} x${o.pax}`).join(', ')})`
          : `Pedido #${String(touchDragInfo.order.id).padStart(4, '0')} (${touchDragInfo.order.lineas?.[0]?.arroz_nombre || 'Arroz'} x${touchDragInfo.order.pax})`;

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

  const sortedTimes = Object.keys(groupedPedidos).sort();

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
    if (selectedSlot?.available) {
      setWizardSlot(selectedSlot);
    }
  }

  function handleOrderCreated() {
    setWizardSlot(null);
    loadPedidos();
    refetchAvailability();
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
      </div>

      <div className="dashboard-split">
        <section className="dashboard-left">
          <AvailabilityGrid
            date={date}
            onDateChange={setDate}
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
                ? `${relatedOrders.length} pedidos (${relatedOrders.map(o => `${o.lineas?.[0]?.arroz_nombre || 'Arroz'} x${o.pax}`).join(', ')})`
                : `Pedido #${String(orderId).padStart(4, '0')} (${order.lineas?.[0]?.arroz_nombre || 'Arroz'} x${order.pax})`;

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
          <div className="dashboard-right-header">
            <h3>
              {selectedSlot
                ? `Pedidos ${selectedSlot.time} (${filteredPedidos.length})`
                : `Resumen de pedidos (${pedidos.length})`}
            </h3>
            {selectedSlot && (
              <button
                className="btn-clear-selection"
                onClick={() => setSelectedSlot(null)}
              >
                Ver todos
              </button>
            )}
          </div>

          <div className="orders-list">
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
                    onDragStartTouch={(order, x, y) => setTouchDragInfo({ order, x, y, overTime: null })}
                    isDragging={touchDragInfo?.order.id === pedido.id}
                  />
                ))
              ) : (
                // Grouped summary view
                sortedTimes.map((time) => (
                  <div key={time} className="order-summary-group">
                    <h4>
                      {time}
                      <span>{groupedPedidos[time].length} pedidos</span>
                    </h4>
                    <div className="summary-pills-container">
                      {groupedPedidos[time].map((p) => (
                        <OrderSummaryPill key={p.id} pedido={p} />
                      ))}
                    </div>
                  </div>
                ))
              )
            )}
          </div>

          {user?.rol !== 'cocinero' && (
            <button
              className="fab-new-order"
              onClick={handleNewOrder}
              disabled={!selectedSlot?.available}
              title={selectedSlot ? "Nuevo Pedido" : "Selecciona una franja para nuevo pedido"}
            >
              + NUEVO PEDIDO
            </button>
          )}
        </section>
      </div>

      {wizardSlot && (
        <OrderWizard
          slot={wizardSlot}
          allSlots={slots}
          date={date}
          onClose={() => setWizardSlot(null)}
          onOrderCreated={handleOrderCreated}
        />
      )}

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
                {touchDragInfo.order.lineas?.[0]?.arroz_nombre || 'Arroz'}
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
