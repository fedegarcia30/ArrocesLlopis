interface StepFulfillmentProps {
  recogida: boolean;
  onRecogidaChange: (recogida: boolean) => void;
  observaciones: string;
  onObservacionesChange: (obs: string) => void;
  address: string;
  cp: string;
  onAddressEdit: () => void;
}

export function StepFulfillment({
  recogida,
  onRecogidaChange,
  observaciones,
  onObservacionesChange,
  address,
  cp,
  onAddressEdit
}: StepFulfillmentProps) {
  return (
    <div className="wizard-step">
      <div>
        <label>Tipo de entrega</label>
        <div className="fulfillment-toggle">
          <button
            className={`fulfillment-option ${recogida ? 'selected' : ''}`}
            onClick={() => onRecogidaChange(true)}
          >
            Recogida
          </button>
          <button
            className={`fulfillment-option ${!recogida ? 'selected' : ''}`}
            onClick={() => {
              if (recogida) {
                onRecogidaChange(false);
                onAddressEdit();
              } else {
                onAddressEdit();
              }
            }}
          >
            {recogida ? 'Entrega a domicilio' : 'Editar Domicilio'}
          </button>
        </div>
      </div>

      {!recogida && (
        <div className="client-found glass-card" style={{ padding: '10px', borderLeftColor: 'var(--gold)' }}>
          <p style={{ margin: 0, fontSize: '0.9rem' }}><strong>Entrega en:</strong> {address} ({cp})</p>
        </div>
      )}

      <div>
        <label>Observaciones</label>
        <textarea
          placeholder="Sin sal, alergia al marisco, etc."
          value={observaciones}
          onChange={(e) => onObservacionesChange(e.target.value)}
          rows={3}
          style={{ resize: 'vertical' }}
        />
      </div>
    </div>
  );
}
