import { useEffect, useState } from 'react';
import { getClientes } from '../../api/clientes';
import type { Cliente, Pedido } from '../../types';
import { fechaCorta, fechaPedido, resumenLineas } from '../../utils/pedidos';

export interface NewClientData {
  nombre: string;
  telefono: string;
}

interface Props {
  client: Cliente | null;
  onSelect: (c: Cliente | null) => void;
  newClient: NewClientData | null;
  onNewClientChange: (c: NewClientData | null) => void;
  recent: Pedido[];
  onRepeat: (p: Pedido) => void;
  locked?: boolean;
}

const MIN_QUERY = 3;

export function ClientPicker({ client, onSelect, newClient, onNewClientChange, recent, onRepeat, locked }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Cliente[]>([]);
  const [searching, setSearching] = useState(false);

  // Búsqueda con debounce por teléfono o nombre
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY) return; // los resultados se ocultan en el render
    const t = window.setTimeout(() => {
      setSearching(true);
      getClientes(q)
        .then(r => setResults(r.clients.slice(0, 6)))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => window.clearTimeout(t);
  }, [query]);

  function startNewClient() {
    const q = query.trim();
    const isPhone = /^[\d\s+]+$/.test(q);
    onNewClientChange({ nombre: isPhone ? '' : q, telefono: isPhone ? q.replace(/\s/g, '') : '' });
  }

  // ── Cliente seleccionado ─────────────────────────
  if (client) {
    return (
      <div className="os-client-card">
        <div className="os-client-head">
          <div>
            <div className="os-client-name">{client.nombre}</div>
            <div className="os-client-meta">
              {client.telefono && <a href={`tel:${client.telefono}`}>{client.telefono}</a>}
              {!!client.num_pedidos && <span className="os-tag">{client.num_pedidos} pedidos</span>}
            </div>
            {client.direccion && (
              <div className="os-client-addr">{client.direccion}{client.codigo_postal ? ` · ${client.codigo_postal}` : ''}</div>
            )}
          </div>
          {!locked && (
            <button type="button" className="os-link" onClick={() => { onSelect(null); setQuery(''); }}>
              Cambiar
            </button>
          )}
        </div>

        {client.observaciones && <div className="os-client-warning">⚠ {client.observaciones}</div>}

        {!locked && recent.length > 0 && (
          <div className="os-recent">
            <div className="os-label-sm">Últimos pedidos</div>
            {recent.map(p => (
              <div key={p.id} className="os-recent-row">
                <span className="os-recent-date">{fechaCorta(fechaPedido(p.fecha_pedido))}</span>
                <span className="os-recent-lines">{p.local_recogida ? '🏠' : '🛵'} {resumenLineas(p)}</span>
                <button type="button" className="os-chip" onClick={() => onRepeat(p)}>Repetir</button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Alta de cliente nuevo ───────────────────────
  if (newClient) {
    return (
      <div className="os-client-card os-client-new">
        <div className="os-client-head">
          <div className="os-client-name">Cliente nuevo</div>
          <button type="button" className="os-link" onClick={() => onNewClientChange(null)}>Buscar existente</button>
        </div>
        <div className="os-field-row">
          <label className="os-field">
            <span>Teléfono</span>
            <input
              type="tel"
              inputMode="tel"
              value={newClient.telefono}
              onChange={e => onNewClientChange({ ...newClient, telefono: e.target.value })}
              placeholder="600 000 000"
              autoFocus={!newClient.telefono}
            />
          </label>
          <label className="os-field">
            <span>Nombre</span>
            <input
              type="text"
              value={newClient.nombre}
              onChange={e => onNewClientChange({ ...newClient, nombre: e.target.value })}
              placeholder="Nombre y apellido"
              autoFocus={!!newClient.telefono}
              autoCapitalize="words"
            />
          </label>
        </div>
      </div>
    );
  }

  // ── Búsqueda ────────────────────────────────────
  const q = query.trim();
  return (
    <div className="os-client-search">
      <div className="os-search-box">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Teléfono o nombre del cliente"
          autoFocus
          autoComplete="off"
        />
        {searching && <span className="os-search-spinner">…</span>}
      </div>

      {q.length >= MIN_QUERY && (
        <div className="os-results">
          {results.map(c => (
            <button type="button" key={c.id} className="os-result" onClick={() => onSelect(c)}>
              <span className="os-result-name">{c.nombre}</span>
              <span className="os-result-meta">{c.telefono}{c.direccion ? ` · ${c.direccion}` : ''}</span>
            </button>
          ))}
          {!searching && results.length === 0 && (
            <div className="os-results-empty">No hay clientes con «{q}»</div>
          )}
          <button type="button" className="os-result os-result-new" onClick={startNewClient}>
            + Crear cliente nuevo{results.length === 0 ? ` «${q}»` : ''}
          </button>
        </div>
      )}
      {q.length < MIN_QUERY && (
        <p className="os-hint">Escribe al menos {MIN_QUERY} caracteres. Busca por teléfono o por nombre.</p>
      )}
    </div>
  );
}
