import type { Pedido } from '../../types';
import './OrderSummaryPill.css';

interface OrderSummaryPillProps {
    pedido: Pedido;
}

export function OrderSummaryPill({ pedido }: OrderSummaryPillProps) {
    const riceRaw = pedido.lineas?.[0]?.arroz_nombre || 'Arroz';
    const riceName = riceRaw.length > 9 ? riceRaw.slice(0, 8) + '…' : riceRaw;

    return (
        <div className="order-summary-pill">
            <span className="pill-pax">{pedido.pax}</span>
            <span className="pill-rice">{riceName}</span>
        </div>
    );
}
