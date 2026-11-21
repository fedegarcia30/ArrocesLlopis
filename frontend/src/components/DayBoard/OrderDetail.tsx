import { useState } from 'react';
import { updateOrderStatus } from '../../api/pedidos';
import type { OrderStatus, Pedido } from '../../types';
import { AVISO_PASADO, eur, fechaPedido, horaPedido, todayIso, totalPedido } from '../../utils/pedidos';

interface Props {
  pedido: Pedido;
  canEdit: boolean;
  onClose: () => void;
  onEdit: (p: Pedido) => void;
  onChanged: () => void;
}

const ESTADOS: { id: OrderStatus; label: string }[] = [
  { id: 'nuevo', label: 'Confirmado' },
  { id: 'preparando', label: 'Preparando' },
  { id: 'listo', label: 'Listo' },
  { id: 'entregado', label: 'Entregado' },
];

/** Panel de detalle: todo el pedido de un vistazo + cambio de estado con botones grandes. */
export function OrderDetail({ pedido, canEdit, onClose, onEdit, onChanged }: Props) {
  const [saving, setSaving] = useState<OrderStatus | null>(null);
  const [error, setError] = useState('');

  async function setStatus(status: OrderStatus) {
    if (status === pedido.status) return;
    setSaving(status);
    setError('');
    try {
      await updateOrderStatus(pedido.id, status);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el estado');
    } finally {
      setSaving(null);
    }
  }

  const cancelado = pedido.status === 'cancelado';

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="detail-head">
          <div>
            <div className="detail-time">
              {horaPedido(pedido.fecha_pedido)} · {pedido.local_recogida ? '🏠 Recoge en local' : '🛵 A domicilio'}
            </div>
            <h3 className="detail-name">{pedido.cliente_nombre || `Cliente #${pedido.cliente_id}`}</h3>
            {pedido.telefono && <a className="detail-phone" href={`tel:${pedido.telefono}`}>📞 {pedido.telefono}</a>}
          </div>
          <button type="button" className="detail-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <ul className="detail-lines">
          {(pedido.lineas ?? []).map(l => (
            <li key={l.id}>
              <span>{l.arroz_nombre || 'Arroz'}</span>
              <strong>×{l.raciones}</strong>
            </li>
          ))}
          <li className="detail-total">
            <span>{pedido.pax} raciones</span>
            <span>{eur(totalPedido(pedido))}</span>
          </li>
        </ul>

        {!pedido.local_recogida && pedido.direccion && <div className="detail-info">📍 {pedido.direccion}</div>}
        {pedido.observaciones && <div className="detail-notes">📝 {pedido.observaciones}</div>}

        {cancelado ? (
          <div className="detail-cancelled">Pedido cancelado</div>
        ) : (
          <div className="detail-status">
            {ESTADOS.map(s => (
              <button
                type="button"
                key={s.id}
                data-status={s.id}
                className={pedido.status === s.id ? 'current' : ''}
                disabled={saving !== null}
                onClick={() => setStatus(s.id)}
              >
                {saving === s.id ? '…' : s.label}
              </button>
            ))}
          </div>
        )}
        {error && <div className="detail-error">{error}</div>}

        {canEdit ? (
          <button type="button" className="detail-edit" onClick={() => onEdit(pedido)}>
            ✏️ Editar pedido{cancelado ? ' / reactivar' : ''}
          </button>
        ) : fechaPedido(pedido.fecha_pedido) < todayIso() && (
          <div className="detail-locked">🔒 {AVISO_PASADO}</div>
        )}
      </div>
    </div>
  );
}
