import { useState } from 'react';
import { lookupClient } from '../../api/clientes';
import type { Cliente } from '../../types';

interface StepContactProps {
  phone: string;
  onPhoneChange: (phone: string) => void;
  client: Cliente | null;
  onClientFound: (client: Cliente | null) => void;
  clientName: string;
  onClientNameChange: (name: string) => void;
  clientAddress: string;
  onClientAddressChange: (address: string) => void;
  clientCp: string;
  onClientCpChange: (cp: string) => void;
}

export function StepContact({
  phone,
  onPhoneChange,
  client,
  onClientFound,
  clientName,
  onClientNameChange,
  clientAddress,
  onClientAddressChange,
  clientCp,
  onClientCpChange,
}: StepContactProps) {
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Cliente[]>([]);

  async function handlePhoneInput(val: string) {
    onPhoneChange(val);

    // Reset selected client if typing
    if (client) {
      onClientFound(null);
    }

    if (val.length >= 4) {
      setSearching(true);
      try {
        const result = await lookupClient(val);
        setResults(result.clients || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    } else {
      setResults([]);
    }
  }

  function handleSelect(c: Cliente) {
    onClientFound(c);
    onClientNameChange(c.nombre);
    onClientAddressChange(c.direccion || '');
    onClientCpChange(c.codigo_postal || '');
    setResults([]);
  }

  return (
    <div className="wizard-step">
      <div>
        <label>Teléfono del cliente</label>
        <div style={{ position: 'relative' }}>
          <input
            type="tel"
            placeholder="Introduce 4 dígitos para buscar..."
            value={phone}
            onChange={(e) => handlePhoneInput(e.target.value)}
            autoFocus
          />
          {searching && (
            <div style={{ position: 'absolute', right: '12px', top: '14px', fontSize: '0.8rem', color: 'var(--gold)' }}>
              ...
            </div>
          )}
        </div>

        {results.length > 0 && !client && (
          <div className="client-results-list">
            {results.map((c) => (
              <div key={c.id} className="client-result-item" onClick={() => handleSelect(c)}>
                <h4>{c.nombre}</h4>
                <p>{c.telefono} • {c.direccion}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {client && (
        <div className="client-found glass-card">
          <h4>{client.nombre}</h4>
          <p>{client.telefono}</p>
          <p>{client.direccion}</p>
          {client.observaciones && <p style={{ fontStyle: 'italic', marginTop: '4px' }}>{client.observaciones}</p>}
          <button
            style={{ fontSize: '0.7rem', color: 'var(--gold)', marginTop: '8px', background: 'none', border: 'none', padding: 0, textDecoration: 'underline' }}
            onClick={() => {
              onClientFound(null);
              setResults([]);
            }}
          >
            Cambiar cliente
          </button>
        </div>
      )}

      {phone.length >= 4 && results.length === 0 && !client && !searching && (
        <>
          <div className="client-not-found">
            Cliente no encontrado. Introduce los datos manualmente.
          </div>
          <div className="wizard-step" style={{ gap: '12px' }}>
            <div>
              <label>Nombre</label>
              <input
                type="text"
                placeholder="Nombre completo"
                value={clientName}
                onChange={(e) => onClientNameChange(e.target.value)}
              />
            </div>
            <div>
              <label>Dirección</label>
              <input
                type="text"
                placeholder="Calle, número, ciudad"
                value={clientAddress}
                onFocus={() => onClientAddressChange('')}
                onChange={(e) => onClientAddressChange(e.target.value)}
              />
            </div>
            <div>
              <label>Código Postal</label>
              <input
                type="text"
                placeholder="28001"
                value={clientCp}
                onFocus={() => onClientCpChange('')}
                onChange={(e) => onClientCpChange(e.target.value)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
