import { useState } from 'react';
import { StepContact } from './StepContact';
import { StepSelection } from './StepSelection';
import { StepFulfillment } from './StepFulfillment';
import { StepConfirm, type OrderItem } from './StepConfirm';
import { AddressModal } from './AddressModal';
import { createOrder } from '../../api/pedidos';
import { updateCliente } from '../../api/clientes';
import type { Arroz, Cliente, Slot } from '../../types';
import './OrderWizard.css';

const TOTAL_STEPS = 4;

interface OrderWizardProps {
  slot: Slot;
  allSlots: Slot[];
  date: string;
  onClose: () => void;
  onOrderCreated: () => void;
}

export function OrderWizard({ slot, allSlots, date, onClose, onOrderCreated }: OrderWizardProps) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Current active slot (can be changed if current one is full)
  const [activeSlot, setActiveSlot] = useState<Slot>(slot);

  // Step 1: Contact
  const [phone, setPhone] = useState('');
  const [client, setClient] = useState<Cliente | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientCp, setClientCp] = useState('');

  // Step 2 & 3: Selection (Accumulated in items)
  const [items, setItems] = useState<OrderItem[]>([]);
  const [currentRice, setCurrentRice] = useState<Arroz | null>(null);
  const [currentPax, setCurrentPax] = useState(2);

  // Step 4: Fulfillment (Global for these items)
  const [recogida, setRecogida] = useState(true);
  const [observaciones, setObservaciones] = useState('');
  const [showAddressModal, setShowAddressModal] = useState(false);

  const currentPaxTotal = items.reduce((sum, item) => sum + item.pax, 0);
  const remainingPax = activeSlot.remaining_pax - currentPaxTotal;

  function canProceed(): boolean {
    switch (step) {
      case 0:
        return phone.length >= 4 && (!!client || clientName.length > 0);
      case 1:
        return !!currentRice && currentPax >= 2 && currentPax <= remainingPax;
      case 2:
        return true;
      case 3:
        return items.length > 0 || (!!currentRice && currentPax >= 2);
      default:
        return false;
    }
  }

  function handleNext() {
    if (step === 1) {
      // When moving from selection to fulfillment, add current item if not already in list
      // Or if we are in loop, we already added it?
      // Let's simplify: Step 1 (Select) -> Step 2 (Fulfillment) -> Step 3 (Summary)
      // If Summary -> "Add another" -> Go to Step 1.
    }
    setStep(step + 1);
  }

  async function handleConfirm() {
    // Ensure the last selection is added if not already
    let finalItems = [...items];
    if (currentRice && !items.find(i => i.rice.id === currentRice.id && i.pax === currentPax)) {
      finalItems.push({ rice: currentRice, pax: currentPax });
    }

    if (finalItems.length === 0) return;

    setSubmitting(true);
    setError('');
    try {
      // Create orders sequentially
      for (const item of finalItems) {
        await createOrder({
          date,
          time: activeSlot.time,
          client: {
            id: client?.id ?? null,
            nombre: client?.nombre || clientName,
            telefono: phone,
            direccion: client?.direccion || clientAddress,
            codigo_postal: client?.codigo_postal || clientCp,
          },
          order: {
            arroz_id: item.rice.id,
            pax: item.pax,
            recogida,
            observaciones: observaciones || undefined,
          },
        });
      }
      onOrderCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear los pedidos');
    } finally {
      setSubmitting(false);
    }
  }

  function handleAddAnother() {
    // Add current selection to items
    if (currentRice) {
      setItems([...items, { rice: currentRice, pax: currentPax }]);
      // Reset for next
      setCurrentRice(null);
      setCurrentPax(2);
      setStep(1); // Go back to selection
    }
  }

  async function handleAddressConfirm(newAddress: string, newCp: string, isPermanent: boolean) {
    if (isPermanent && client) {
      try {
        const updated = await updateCliente(client.id, { direccion: newAddress, codigo_postal: newCp });
        setClient(updated);
        setClientAddress(newAddress);
        setClientCp(newCp);
      } catch (err) {
        console.error('Error updating client address:', err);
      }
    } else {
      // Temporary: add to observations
      const addressObs = `Entrega en alternativo: ${newAddress} (${newCp})`;
      if (!observaciones.includes(addressObs)) {
        setObservaciones(prev => prev ? `${prev}\n${addressObs}` : addressObs);
      }
      setClientAddress(newAddress);
      setClientCp(newCp);
    }
    setShowAddressModal(false);
  }

  return (
    <div className="wizard-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="wizard-panel glass-card">
        <div className="wizard-header">
          <h2 className="wizard-title">Nuevo Pedido</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="wizard-slot-badge">{activeSlot.time}</span>
            {currentPaxTotal > 0 && <span className="wizard-slot-badge" style={{ background: 'var(--status-blue-bg)', color: 'var(--status-blue)' }}>Total: {currentPaxTotal + (step === 1 ? currentPax : 0)} PAX</span>}
          </div>
          <button className="wizard-close" onClick={onClose}>×</button>
        </div>

        <div className="wizard-steps">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`wizard-step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
            />
          ))}
        </div>

        <div className="wizard-content" style={{ minHeight: '300px' }}>
          {step === 0 && (
            <StepContact
              phone={phone}
              onPhoneChange={setPhone}
              client={client}
              onClientFound={setClient}
              clientName={clientName}
              onClientNameChange={setClientName}
              clientAddress={clientAddress}
              onClientAddressChange={setClientAddress}
              clientCp={clientCp}
              onClientCpChange={setClientCp}
            />
          )}

          {step === 1 && (
            <StepSelection
              selectedRice={currentRice}
              onRiceSelect={setCurrentRice}
              pax={currentPax}
              onPaxChange={setCurrentPax}
              remainingPax={remainingPax}
            />
          )}

          {step === 2 && (
            <StepFulfillment
              recogida={recogida}
              onRecogidaChange={setRecogida}
              observaciones={observaciones}
              onObservacionesChange={setObservaciones}
              address={clientAddress || client?.direccion || ''}
              cp={clientCp || client?.codigo_postal || ''}
              onAddressEdit={() => setShowAddressModal(true)}
            />
          )}

          {step === 3 && (
            <StepConfirm
              client={client}
              clientName={clientName}
              phone={phone}
              clientAddress={clientAddress || client?.direccion || ''}
              items={currentRice && !items.some(i => i.rice.id === currentRice.id && i.pax === currentPax) ? [...items, { rice: currentRice, pax: currentPax }] : items}
              recogida={recogida}
              observaciones={observaciones}
              slotTime={activeSlot.time}
              date={date}
              onAddAnother={handleAddAnother}
              remainingPax={remainingPax - (currentRice ? currentPax : 0)}
              allSlots={allSlots}
              onSlotChange={setActiveSlot}
            />
          )}
        </div>

        {showAddressModal && (
          <AddressModal
            initialAddress={clientAddress || client?.direccion || ''}
            initialCp={clientCp || client?.codigo_postal || ''}
            onConfirm={handleAddressConfirm}
            onCancel={() => setShowAddressModal(false)}
          />
        )}

        {error && <p className="wizard-error">{error}</p>}

        <div className="wizard-nav">
          {step > 0 && (
            <button className="wizard-btn-back" onClick={() => setStep(step - 1)}>
              Atrás
            </button>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <button
              className="wizard-btn-next"
              disabled={!canProceed()}
              onClick={handleNext}
            >
              Siguiente
            </button>
          ) : (
            <button
              className="wizard-btn-next"
              disabled={submitting}
              onClick={handleConfirm}
            >
              {submitting ? 'Confirmando...' : 'Confirmar Todo'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
