import './ConfirmMoveModal.css';

interface ConfirmMoveModalProps {
    orderIds: number[];
    orderSummary: string; // e.g. "2 pedidos (Arroz a banda x2, Paella x4)"
    clientName: string;
    sourceTime: string;
    targetTime: string;
    onConfirm: () => void;
    onCancel: () => void;
    isUpdating: boolean;
}

export function ConfirmMoveModal({
    orderIds,
    orderSummary,
    clientName,
    sourceTime,
    targetTime,
    onConfirm,
    onCancel,
    isUpdating
}: ConfirmMoveModalProps) {
    const isMultiple = orderIds.length > 1;

    return (
        <div className="modal-overlay">
            <div className="modal-content glass-card">
                <h3 className="modal-title">Confirmar cambio de hora</h3>
                <div className="modal-body">
                    <p>
                        ¿Seguro que quieres mover {isMultiple ? 'los pedidos' : 'el pedido'} de <strong>{clientName}</strong>?
                    </p>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        {orderSummary}
                    </div>
                    <div className="move-info">
                        <span className="time-badge old">{sourceTime}</span>
                        <span className="move-arrow">→</span>
                        <span className="time-badge new">{targetTime}</span>
                    </div>
                </div>
                <div className="modal-actions">
                    <button
                        className="btn-modal-cancel"
                        onClick={onCancel}
                        disabled={isUpdating}
                    >
                        Cancelar
                    </button>
                    <button
                        className="btn-modal-confirm"
                        onClick={onConfirm}
                        disabled={isUpdating}
                    >
                        {isUpdating ? 'Moviendo...' : 'Confirmar Cambio'}
                    </button>
                </div>
            </div>
        </div>
    );
}
