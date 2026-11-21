import type { Pedido } from '../../types';
import './OrderSummaryPill.css';

interface OrderSummaryPillProps {
    pedido: Pedido;
}

export function OrderSummaryPill({ pedido }: OrderSummaryPillProps) {
    const riceRaw = pedido.lineas?.[0]?.arroz_nombre || 'Arroz';
    const extra = (pedido.lineas?.length ?? 0) > 1 ? ` +${pedido.lineas!.length - 1}` : '';
    const riceName = (riceRaw.length > 9 ? riceRaw.slice(0, 8) + '…' : riceRaw) + extra;

    return (
        <div className="order-summary-pill" data-status={pedido.status} title={`${pedido.cliente_nombre ?? ''} · ${pedido.status}`}>
            <span className="pill-pax">{pedido.pax}</span>
            <span className="pill-rice">{riceName}</span>
        </div>
    );
}
