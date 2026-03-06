import type { Pedido } from '../../types';
import './OrderSummaryPill.css';

interface OrderSummaryPillProps {
    pedido: Pedido;
}

export function OrderSummaryPill({ pedido }: OrderSummaryPillProps) {
    const riceName = pedido.lineas?.[0]?.arroz_nombre || 'Arroz';

    return (
        <div className="order-summary-pill">
            <span className="pill-pax">{pedido.pax}</span>
            <span className="pill-rice">{riceName}</span>
        </div>
    );
}
