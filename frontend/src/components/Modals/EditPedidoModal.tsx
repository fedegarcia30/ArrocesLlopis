import { useState, useEffect } from 'react';
import type { Pedido, Arroz } from '../../types';
import { updatePedido, updateOrderStatus, getPedidos } from '../../api/pedidos';
import { getRices } from '../../api/arroces';
import './EditPedidoModal.css';

interface Props {
  pedido: Pedido;
  onClose: () => void;
  onSaved: () => void;
}

// Pedidos del cliente que se verán afectados por el cambio de dirección
interface AffectedOrder {
  id: number;
  arroz_nombre: string;
}

export function EditPedidoModal({ pedido, onClose, onSaved }: Props) {
  const [arroces, setArroces] = useState<Arroz[]>([]);
  const [arroz_id, setArrozId] = useState<number>(pedido.lineas?.[0]?.arroz_id ?? 0);
  const [pax, setPax] = useState(pedido.pax);
  const [direccion, setDireccion] = useState(pedido.direccion ?? '');
  const [observaciones, setObservaciones] = useState(pedido.observaciones ?? '');
  const [saving, setSaving] = useState(false);
  const [cancelMode, setCancelMode] = useState(false);

  // Aviso de cambio de dirección
  const [addressWarning, setAddressWarning] = useState<AffectedOrder[] | null>(null);

  useEffect(() => {
    getRices().then(setArroces).catch(() => {});
  }, []);

  const direccionCambiada = !pedido.local_recogida && direccion.trim() !== (pedido.direccion ?? '').trim();

  async function handleSaveClick() {
    if (direccionCambiada && addressWarning === null) {
      // Buscar otros pedidos del cliente antes de guardar
      setSaving(true);
      try {
        const todos = await getPedidos({ cliente_id: pedido.cliente_id });
        const afectados: AffectedOrder[] = todos
          .filter(p => p.id !== pedido.id && p.status !== 'cancelado')
          .map(p => ({
            id: p.id,
            arroz_nombre: p.lineas?.[0]?.arroz_nombre ?? 'Arroz',
          }));
        setAddressWarning(afectados); // muestra el aviso (aunque la lista esté vacía)
      } catch {
        // Si falla la búsqueda, guardamos igualmente
        await doSave();
      } finally {
        setSaving(false);
      }
      return;
    }
    await doSave();
  }

  async function doSave() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { pax, observaciones };
      if (arroz_id && arroz_id !== pedido.lineas?.[0]?.arroz_id) {
        payload.arroz_id = arroz_id;
      }
      if (!pedido.local_recogida) {
        payload.direccion = direccion;
      }
      await updatePedido(pedido.id, payload as Partial<Pedido>);
      onSaved();
    } catch {
      alert('Error al guardar el pedido');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    setSaving(true);
    try {
      await updateOrderStatus(pedido.id, 'cancelado');
      onSaved();
    } catch {
      alert('Error al cancelar el pedido');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="edit-pedido-overlay">
      <div className="edit-pedido-modal glass-card">
        <div className="edit-pedido-header">
          <h2 className="edit-pedido-title">
            Editar pedido <span className="edit-pedido-id">#{String(pedido.id).padStart(4, '0')}</span>
          </h2>
          <button className="edit-pedido-close" onClick={onClose}>✕</button>
        </div>

        <div className="edit-pedido-client">
          {pedido.cliente_nombre} · {pedido.telefono}
        </div>

        <div className="edit-pedido-body">
          {/* Arroz */}
          <label className="edit-field-label">Tipo de arroz</label>
          <div className="edit-arroz-grid">
            {arroces.filter(a => a.disponible).map(a => (
              <button
                key={a.id}
                className={`edit-arroz-btn ${arroz_id === a.id ? 'selected' : ''}`}
                onClick={() => setArrozId(a.id)}
              >
                {a.nombre}
              </button>
            ))}
          </div>

          {/* PAX */}
          <label className="edit-field-label">Raciones (PAX)</label>
          <div className="edit-pax-row">
            <button
              className="edit-pax-btn"
              onClick={() => setPax(p => Math.max(2, p - 1))}
              disabled={pax <= 2}
            >
              −
            </button>
            <span className="edit-pax-value">{pax}</span>
            <button className="edit-pax-btn" onClick={() => setPax(p => p + 1)}>+</button>
          </div>

          {/* Dirección — solo si es a domicilio */}
          {!pedido.local_recogida && (
            <>
              <label className="edit-field-label">Dirección de entrega</label>
              <input
                className="edit-input"
                type="text"
                value={direccion}
                onChange={e => { setDireccion(e.target.value); setAddressWarning(null); }}
                placeholder="Calle, número, piso..."
              />
            </>
          )}

          {/* Aviso de cambio de dirección */}
          {addressWarning !== null && (
            <div className="edit-address-warning">
              <p className="edit-address-warning-title">
                Al cambiar la dirección se actualizará para <strong>todos los pedidos de este cliente</strong>.
              </p>
              {addressWarning.length > 0 ? (
                <ul className="edit-affected-list">
                  <li className="edit-affected-item edit-affected-current">
                    #{String(pedido.id).padStart(4, '0')} · {pedido.lineas?.[0]?.arroz_nombre ?? 'Arroz'} (este pedido)
                  </li>
                  {addressWarning.map(o => (
                    <li key={o.id} className="edit-affected-item">
                      #{String(o.id).padStart(4, '0')} · {o.arroz_nombre}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="edit-address-warning-only">Solo afecta a este pedido.</p>
              )}
              <p className="edit-address-warning-confirm">¿Confirmas el cambio?</p>
            </div>
          )}

          {/* Observaciones */}
          <label className="edit-field-label">Observaciones</label>
          <textarea
            className="edit-textarea"
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            placeholder="Sin gluten, alérgenos, notas..."
            rows={2}
          />
        </div>

        {/* Footer */}
        <div className="edit-pedido-footer">
          {cancelMode ? (
            <div className="edit-cancel-confirm">
              <span className="edit-cancel-question">¿Cancelar el pedido?</span>
              <button className="edit-btn-danger" onClick={handleCancel} disabled={saving}>
                Sí, cancelar
              </button>
              <button className="edit-btn-secondary" onClick={() => setCancelMode(false)} disabled={saving}>
                No
              </button>
            </div>
          ) : (
            <>
              <button
                className="edit-btn-danger-outline"
                onClick={() => setCancelMode(true)}
                disabled={saving || pedido.status === 'cancelado'}
              >
                Cancelar pedido
              </button>
              <button className="edit-btn-primary" onClick={handleSaveClick} disabled={saving}>
                {saving ? 'Guardando…' : addressWarning !== null ? 'Sí, guardar' : 'Guardar'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
