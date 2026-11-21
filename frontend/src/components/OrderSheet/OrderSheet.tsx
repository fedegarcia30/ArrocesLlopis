import { useEffect, useMemo, useState } from 'react';
import { ClientPicker, type NewClientData } from './ClientPicker';
import { RiceCart, type CartLine } from './RiceCart';
import { SlotPicker } from './SlotPicker';
import { slotFits, type OwnUsage } from './slotCapacity';
import { getRices } from '../../api/arroces';
import { getClient, updateCliente } from '../../api/clientes';
import { createOrder, getPedidos, updateOrderStatus, updatePedido } from '../../api/pedidos';
import { useAvailability } from '../../hooks/useAvailability';
import { useAuth } from '../../hooks/useAuth';
import type { Arroz, Cliente, Pedido } from '../../types';
import { eur, fechaCorta, fechaPedido, horaPedido, puedeEditarFecha, todayIso } from '../../utils/pedidos';
import './OrderSheet.css';

export interface OrderSavedInfo {
  date: string;
  time: string;
  message: string;
}

interface Props {
  /** Si se pasa, la hoja abre en modo edición. */
  pedido?: Pedido | null;
  initialDate: string;
  initialTime?: string | null;
  onClose: () => void;
  onSaved: (info: OrderSavedInfo) => void;
}

// Atajos de observaciones habituales (editar libremente)
const QUICK_NOTES = ['Sin gluten', 'Sin marisco', 'Alergia frutos secos', 'Llamar al llegar', 'Ya pagado'];

export function OrderSheet({ pedido, initialDate, initialTime, onClose, onSaved }: Props) {
  const isEdit = !!pedido;
  const { user } = useAuth();
  const esAdmin = user?.rol === 'admin';

  // ── Catálogo ──
  const [rices, setRices] = useState<Arroz[]>([]);
  const [loadingRices, setLoadingRices] = useState(true);

  // ── Cliente ──
  const [client, setClient] = useState<Cliente | null>(null);
  const [newClient, setNewClient] = useState<NewClientData | null>(null);
  const [recent, setRecent] = useState<Pedido[]>([]);

  // ── Pedido ──
  const [lines, setLines] = useState<CartLine[]>([]);
  const [date, setDate] = useState(pedido ? fechaPedido(pedido.fecha_pedido) : initialDate);
  const [time, setTime] = useState<string | null>(pedido ? horaPedido(pedido.fecha_pedido) : initialTime ?? null);
  const [domicilio, setDomicilio] = useState(pedido ? !pedido.local_recogida : false);
  const [direccion, setDireccion] = useState(pedido?.direccion ?? '');
  const [cp, setCp] = useState('');
  const [guardarEnFicha, setGuardarEnFicha] = useState(true);
  const [observaciones, setObservaciones] = useState(pedido?.observaciones ?? '');

  // ── UI ──
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [dirty, setDirty] = useState(false);

  const { slots, loading: loadingSlots, reload: reloadSlots } = useAvailability(date);

  // Catálogo + precarga en modo edición
  useEffect(() => {
    getRices()
      .then(all => {
        const disponibles = all.filter(r => r.disponible !== false);
        setRices(disponibles);
        if (pedido?.lineas) {
          setLines(
            pedido.lineas.map(l => ({
              rice: all.find(r => r.id === l.arroz_id) ?? {
                id: l.arroz_id, nombre: l.arroz_nombre || 'Arroz', precio: l.precio_unitario,
              },
              pax: l.raciones,
            })),
          );
        }
      })
      .catch(() => setRices([]))
      .finally(() => setLoadingRices(false));
    if (pedido) {
      getClient(pedido.cliente_id)
        .then(c => {
          setClient(c);
          setCp(c.codigo_postal ?? '');
        })
        .catch(() => setClient({ id: pedido.cliente_id, nombre: pedido.cliente_nombre ?? '', telefono: pedido.telefono, direccion: pedido.direccion }));
    }
  }, [pedido]);

  // Historial del cliente seleccionado (para "Repetir")
  useEffect(() => {
    if (!client || isEdit) {
      setRecent([]);
      return;
    }
    getPedidos({ cliente_id: client.id })
      .then(ps => setRecent(ps.filter(p => p.status !== 'cancelado').slice(0, 3)))
      .catch(() => setRecent([]));
  }, [client, isEdit]);

  function selectClient(c: Cliente | null) {
    setClient(c);
    setDirty(true);
    if (c) {
      setDireccion(c.direccion ?? '');
      setCp(c.codigo_postal ?? '');
    }
  }

  function repeatOrder(p: Pedido) {
    const repeated: CartLine[] = [];
    for (const l of p.lineas ?? []) {
      const rice = rices.find(r => r.id === l.arroz_id);
      if (rice) repeated.push({ rice, pax: l.raciones });
    }
    setLines(repeated);
    setDomicilio(!p.local_recogida);
    setDirty(true);
    if (repeated.length < (p.lineas?.length ?? 0)) {
      setError('Algún arroz de ese pedido ya no está disponible y no se ha añadido.');
    } else {
      setError('');
    }
  }

  // ── Derivados ──
  const totalPax = lines.reduce((s, l) => s + l.pax, 0);
  const total = lines.reduce((s, l) => s + l.pax * l.rice.precio, 0);
  const origDate = pedido ? fechaPedido(pedido.fecha_pedido) : null;
  const origTime = pedido ? horaPedido(pedido.fecha_pedido) : null;
  // Un pedido activo ya ocupa su franja: se descuenta al calcular si cabe
  const own: OwnUsage | null = pedido && pedido.status !== 'cancelado'
    ? { date: origDate!, time: origTime!, pax: pedido.pax }
    : null;
  const selectedSlot = slots.find(s => s.time === time) ?? null;
  const slotOk = !!selectedSlot && slotFits(selectedSlot, date, totalPax, own);

  const clienteDir = (client?.direccion ?? '').trim();
  const clienteCp = (client?.codigo_postal ?? '').trim();
  const direccionCambiada = !!client && domicilio && (direccion.trim() !== clienteDir || cp.trim() !== clienteCp);

  const missing = useMemo(() => {
    const m: string[] = [];
    if (!client && !(newClient && newClient.nombre.trim() && newClient.telefono.replace(/\D/g, '').length >= 6)) m.push('cliente');
    if (lines.length === 0) m.push('arroz');
    if (!puedeEditarFecha(date, user?.rol)) m.push('fecha futura (solo el admin puede usar días pasados)');
    if (!time) m.push('hora');
    else if (!slotOk) m.push(loadingSlots ? 'comprobando hueco…' : `hueco en ${time}`);
    if (domicilio && !direccion.trim()) m.push('dirección');
    return m;
  }, [client, newClient, lines.length, time, loadingSlots, slotOk, domicilio, direccion, date, user?.rol]);

  function mark<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setDirty(true); };
  }

  function addQuickNote(note: string) {
    setDirty(true);
    setObservaciones(prev => (prev.includes(note) ? prev : prev.trim() ? `${prev.trim()}. ${note}` : note));
  }

  function handleClose() {
    if (dirty && !confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  }

  /** Observaciones finales: si la dirección es solo para este pedido, se anota. */
  function finalObservaciones(): string {
    if (direccionCambiada && !guardarEnFicha) {
      const extra = `Entregar en: ${direccion.trim()}${cp.trim() ? ` (${cp.trim()})` : ''}`;
      return observaciones.includes(extra) ? observaciones : [observaciones.trim(), extra].filter(Boolean).join('\n');
    }
    return observaciones;
  }

  async function handleSubmit() {
    if (missing.length > 0 || !time) return;
    setSubmitting(true);
    setError('');
    try {
      if (direccionCambiada && guardarEnFicha && client) {
        await updateCliente(client.id, { direccion: direccion.trim(), codigo_postal: cp.trim() });
      }
      const payloadLines = lines.map(l => ({ arroz_id: l.rice.id, pax: l.pax }));

      if (pedido) {
        const data: Record<string, unknown> = {
          lines: payloadLines,
          observaciones: finalObservaciones(),
        };
        if (origDate !== date || origTime !== time) data.fecha_pedido = `${date} ${time}`;
        if (pedido.local_recogida === domicilio) data.local_recogida = !domicilio;
        await updatePedido(pedido.id, data as Partial<Pedido>);
        onSaved({ date, time, message: `Pedido #${String(pedido.id).padStart(4, '0')} actualizado` });
      } else {
        const res = await createOrder({
          date,
          time,
          client: {
            id: client?.id ?? null,
            nombre: client?.nombre ?? newClient?.nombre.trim() ?? '',
            telefono: client?.telefono ?? newClient?.telefono.trim() ?? '',
            direccion: client ? client.direccion ?? '' : domicilio ? direccion.trim() : '',
            codigo_postal: client ? client.codigo_postal ?? '' : domicilio ? cp.trim() : '',
          },
          order: {
            lines: payloadLines,
            recogida: !domicilio,
            observaciones: finalObservaciones() || undefined,
          },
        });
        onSaved({ date, time, message: res.message || 'Pedido creado' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el pedido');
      reloadSlots(); // la franja puede haberse llenado entretanto
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatus(status: 'cancelado' | 'nuevo') {
    if (!pedido) return;
    setSubmitting(true);
    try {
      await updateOrderStatus(pedido.id, status);
      onSaved({
        date, time: time ?? '',
        message: status === 'cancelado' ? 'Pedido cancelado (stock restaurado)' : 'Pedido reactivado',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el estado');
    } finally {
      setSubmitting(false);
    }
  }

  const nombreCliente = client?.nombre ?? newClient?.nombre ?? '';

  return (
    <div className="os-overlay" role="dialog" aria-modal="true">
      <header className="os-header">
        <h2 className="os-title">
          {isEdit ? <>Editar pedido <span className="os-title-id">#{String(pedido!.id).padStart(4, '0')}</span></> : 'Nuevo pedido'}
        </h2>
        {isEdit && pedido!.status === 'cancelado' && <span className="os-tag os-tag-red">Cancelado</span>}
        <div className="os-header-spacer" />
        {confirmDiscard ? (
          <div className="os-discard">
            <span>¿Descartar cambios?</span>
            <button type="button" className="os-btn os-btn-danger" onClick={onClose}>Descartar</button>
            <button type="button" className="os-btn" onClick={() => setConfirmDiscard(false)}>Seguir</button>
          </div>
        ) : (
          <button type="button" className="os-close" onClick={handleClose} aria-label="Cerrar">×</button>
        )}
      </header>

      <div className="os-body">
        {/* Columna izquierda: quién y cómo */}
        <div className="os-col">
          <section className="os-section os-sec-client">
            <h3 className="os-section-title"><span className="os-num">1</span> Cliente</h3>
            <ClientPicker
              client={client}
              onSelect={selectClient}
              newClient={newClient}
              onNewClientChange={mark(setNewClient)}
              recent={recent}
              onRepeat={repeatOrder}
              locked={isEdit}
            />
          </section>

          <section className="os-section os-sec-delivery">
            <h3 className="os-section-title"><span className="os-num">4</span> Entrega</h3>
            <div className="os-toggle">
              <button type="button" className={!domicilio ? 'selected' : ''} onClick={() => mark(setDomicilio)(false)}>
                🏠 Recoge en local
              </button>
              <button type="button" className={domicilio ? 'selected' : ''} onClick={() => mark(setDomicilio)(true)}>
                🛵 A domicilio
              </button>
            </div>
            {domicilio && (
              <div className="os-address">
                <div className="os-field-row">
                  <label className="os-field os-field-grow">
                    <span>Dirección</span>
                    <input type="text" value={direccion} onChange={e => mark(setDireccion)(e.target.value)} placeholder="Calle, número, piso" />
                  </label>
                  <label className="os-field os-field-cp">
                    <span>C.P.</span>
                    <input type="text" inputMode="numeric" value={cp} onChange={e => mark(setCp)(e.target.value)} placeholder="46000" maxLength={5} />
                  </label>
                </div>
                {direccionCambiada && (
                  <label className="os-check">
                    <input type="checkbox" checked={guardarEnFicha} onChange={e => setGuardarEnFicha(e.target.checked)} />
                    <span>
                      {guardarEnFicha
                        ? 'Guardar como dirección habitual del cliente'
                        : 'Solo para este pedido (se añadirá a observaciones)'}
                    </span>
                  </label>
                )}
              </div>
            )}
          </section>

          <section className="os-section os-sec-notes">
            <h3 className="os-section-title"><span className="os-num">5</span> Observaciones <small>opcional</small></h3>
            <div className="os-chips">
              {QUICK_NOTES.map(n => (
                <button type="button" key={n} className={`os-chip ${observaciones.includes(n) ? 'selected' : ''}`} onClick={() => addQuickNote(n)}>
                  {n}
                </button>
              ))}
            </div>
            <textarea
              className="os-textarea"
              value={observaciones}
              onChange={e => mark(setObservaciones)(e.target.value)}
              placeholder="Alergias, indicaciones de entrega…"
              rows={2}
            />
          </section>
        </div>

        {/* Columna derecha: qué y cuándo */}
        <div className="os-col">
          <section className="os-section os-sec-rice">
            <h3 className="os-section-title"><span className="os-num">2</span> Arroces</h3>
            <RiceCart rices={rices} loading={loadingRices} lines={lines} onChange={mark(setLines)} />
          </section>

          <section className="os-section os-sec-slot">
            <h3 className="os-section-title"><span className="os-num">3</span> Día y hora</h3>
            <SlotPicker
              date={date}
              onDateChange={mark(setDate)}
              time={time}
              onTimeChange={mark(setTime)}
              slots={slots}
              loading={loadingSlots}
              neededPax={totalPax}
              own={own}
              minDate={esAdmin ? undefined : todayIso()}
            />
          </section>
        </div>
      </div>

      <footer className="os-footer">
        <div className="os-summary">
          <div className="os-summary-main">
            {nombreCliente || 'Sin cliente'}
            {time && <> · <strong>{fechaCorta(date)} {time}</strong></>}
            {' · '}{domicilio ? '🛵 Domicilio' : '🏠 Local'}
          </div>
          <div className="os-summary-sub">
            {totalPax > 0 ? `${totalPax} raciones · ${eur(total)}` : 'Sin arroces'}
            {missing.length > 0 && <span className="os-missing"> · Falta: {missing.join(', ')}</span>}
          </div>
          {error && <div className="os-error">{error}</div>}
        </div>

        {isEdit && (
          confirmCancel ? (
            <div className="os-discard">
              <span>¿Cancelar pedido?</span>
              <button type="button" className="os-btn os-btn-danger" disabled={submitting} onClick={() => handleStatus('cancelado')}>Sí, cancelar</button>
              <button type="button" className="os-btn" onClick={() => setConfirmCancel(false)}>No</button>
            </div>
          ) : pedido!.status === 'cancelado' ? (
            <button type="button" className="os-btn" disabled={submitting} onClick={() => handleStatus('nuevo')}>Reactivar</button>
          ) : (
            <button type="button" className="os-btn os-btn-danger-outline" disabled={submitting} onClick={() => setConfirmCancel(true)}>
              Cancelar pedido
            </button>
          )
        )}

        <button
          type="button"
          className="os-btn os-btn-primary"
          disabled={missing.length > 0 || submitting}
          onClick={handleSubmit}
        >
          {submitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Confirmar pedido'}
        </button>
      </footer>
    </div>
  );
}
