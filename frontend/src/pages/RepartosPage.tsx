import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { getPedidos, updateOrderStatus, updatePedido, savePedidoFeedback } from '../api/pedidos';
import type { Pedido } from '../types';
import { addDaysIso, fechaPedido, horaPedido, todayIso } from '../utils/pedidos';
import './RepartosPage.css';

/* ── Utilidades ─────────────────────────────────────────────────── */

function lunesDe(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = dt.getDay();
  return addDaysIso(iso, -(dow === 0 ? 6 : dow - 1));
}

function semana(lunes: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysIso(lunes, i));
}

function fmt(iso: string, opts: Intl.DateTimeFormatOptions): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', opts);
}

function diasDesde(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const ms = new Date().setHours(0, 0, 0, 0) - new Date(y, m - 1, d).getTime();
  return Math.round(ms / 86_400_000);
}

const mapsUrl = (dir: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dir)}`;

/** Un cliente puede tener varios pedidos en la misma franja: se entregan juntos. */
interface Grupo {
  key: string;
  pedidos: Pedido[];
}

function agrupar(pedidos: Pedido[], keyFn: (p: Pedido) => string): Record<string, Grupo[]> {
  const out: Record<string, Record<string, Pedido[]>> = {};
  for (const p of pedidos) {
    if (p.local_recogida || p.status === 'cancelado') continue;
    const k = keyFn(p);
    ((out[k] ??= {})[p.cliente_id] ??= []).push(p);
  }
  const res: Record<string, Grupo[]> = {};
  for (const k of Object.keys(out)) {
    res[k] = Object.entries(out[k]).map(([cid, ps]) => ({ key: `${k}|${cid}`, pedidos: ps }));
  }
  return res;
}

/* ── Contenedor con pestañas + swipe ────────────────────────────── */

type Vista = 'repartos' | 'recogidas';

export function RepartosPage() {
  // Lunes–jueves: recogidas. Viernes–domingo: repartos.
  const [vista, setVista] = useState<Vista>(() => ([1, 2, 3, 4].includes(new Date().getDay()) ? 'recogidas' : 'repartos'));
  const [pendRecogidas, setPendRecogidas] = useState<number | null>(null);
  const [pendRepartosHoy, setPendRepartosHoy] = useState<number | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      className="rp-page"
      onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
      onTouchEnd={e => {
        if (!touch.current) return;
        const dx = e.changedTouches[0].clientX - touch.current.x;
        const dy = e.changedTouches[0].clientY - touch.current.y;
        touch.current = null;
        if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 1.5) return; // solo gestos claramente horizontales
        setVista(dx < 0 ? 'repartos' : 'recogidas');
      }}
    >
      <div className="rp-tabs" role="tablist">
        <button role="tab" aria-selected={vista === 'recogidas'} className={vista === 'recogidas' ? 'active' : ''} onClick={() => setVista('recogidas')}>
          ♻️ Recogidas {pendRecogidas ? <span className="rp-tab-badge">{pendRecogidas}</span> : null}
        </button>
        <button role="tab" aria-selected={vista === 'repartos'} className={vista === 'repartos' ? 'active' : ''} onClick={() => setVista('repartos')}>
          🛵 Repartos {pendRepartosHoy ? <span className="rp-tab-badge">{pendRepartosHoy}</span> : null}
        </button>
      </div>

      {/* Las dos vistas siguen montadas para conservar su estado */}
      <div className="rp-view" hidden={vista !== 'repartos'}>
        <RepartosView onPendientesHoy={setPendRepartosHoy} />
      </div>
      <div className="rp-view" hidden={vista !== 'recogidas'}>
        <RecogidasView onPendientes={setPendRecogidas} />
      </div>
    </div>
  );
}

/* ── Repartos ───────────────────────────────────────────────────── */

function RepartosView({ onPendientesHoy }: { onPendientesHoy: (n: number) => void }) {
  const hoy = todayIso();
  const [lunes, setLunes] = useState(() => lunesDe(hoy));
  const [dia, setDia] = useState(hoy);
  const [datos, setDatos] = useState<Record<string, Pedido[]>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [anular, setAnular] = useState<Grupo | null>(null);
  const dias = useMemo(() => semana(lunes), [lunes]);

  useEffect(() => {
    let vivo = true;
    setLoading(true);
    Promise.all(dias.map(d => getPedidos({ fecha: d }).then(r => [d, r] as const).catch(() => [d, [] as Pedido[]] as const)))
      .then(res => { if (vivo) setDatos(Object.fromEntries(res)); })
      .finally(() => { if (vivo) setLoading(false); });
    return () => { vivo = false; };
  }, [dias]);

  const gruposDia = useMemo(() => agrupar(datos[dia] ?? [], p => horaPedido(p.fecha_pedido)), [datos, dia]);
  const horas = Object.keys(gruposDia).sort();
  const todos = horas.flatMap(h => gruposDia[h]);
  const hechos = todos.filter(g => g.pedidos.every(p => p.status === 'entregado')).length;

  const contar = useCallback((d: string) => {
    const gs = Object.values(agrupar(datos[d] ?? [], p => horaPedido(p.fecha_pedido))).flat();
    return { total: gs.length, pend: gs.filter(g => g.pedidos.some(p => p.status !== 'entregado')).length };
  }, [datos]);

  useEffect(() => {
    if (datos[hoy]) onPendientesHoy(contar(hoy).pend);
  }, [datos, hoy, contar, onPendientesHoy]);

  function cambiarSemana(delta: number) {
    const nuevo = addDaysIso(lunes, delta * 7);
    setLunes(nuevo);
    setDia(semana(nuevo).includes(hoy) ? hoy : nuevo);
  }

  function marcarLocal(ids: number[], status: 'entregado' | 'listo') {
    setDatos(prev => ({ ...prev, [dia]: prev[dia].map(p => (ids.includes(p.id) ? { ...p, status, entregado: status === 'entregado' } : p)) }));
  }

  async function setEstado(g: Grupo, status: 'entregado' | 'listo') {
    setUpdating(g.key);
    try {
      for (const p of g.pedidos) await updateOrderStatus(p.id, status);
      marcarLocal(g.pedidos.map(p => p.id), status);
    } catch {
      alert('No se pudo actualizar el reparto. Revisa la conexión.');
    } finally {
      setUpdating(null);
      setAnular(null);
    }
  }

  return (
    <>
      <div className="rp-weeknav">
        <button className="rp-navbtn" onClick={() => cambiarSemana(-1)} aria-label="Semana anterior">‹</button>
        <span className="rp-week-label">{fmt(dias[0], { day: 'numeric', month: 'short' })} – {fmt(dias[6], { day: 'numeric', month: 'short' })}</span>
        <button className="rp-navbtn" onClick={() => cambiarSemana(1)} aria-label="Semana siguiente">›</button>
        {!dias.includes(hoy) && <button className="rp-today" onClick={() => { setLunes(lunesDe(hoy)); setDia(hoy); }}>Hoy</button>}
      </div>

      <div className="rp-days">
        {dias.map(d => {
          const c = contar(d);
          return (
            <button key={d} className={`rp-day ${d === dia ? 'selected' : ''} ${d === hoy ? 'today' : ''} ${c.total === 0 ? 'empty' : ''}`} onClick={() => setDia(d)}>
              <span className="rp-day-name">{fmt(d, { weekday: 'short' })}</span>
              <span className="rp-day-num">{Number(d.slice(8))}</span>
              <span className={`rp-day-count ${c.total > 0 && c.pend === 0 ? 'done' : ''}`}>
                {loading ? '·' : c.total === 0 ? '—' : c.pend === 0 ? '✓' : c.pend}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rp-summary">
        <h2>{fmt(dia, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
        {todos.length > 0 && (
          <div className="rp-progress" aria-label={`${hechos} de ${todos.length} entregados`}>
            <span className="rp-progress-bar"><span style={{ width: `${(hechos / todos.length) * 100}%` }} /></span>
            <span className="rp-progress-text">{hechos}/{todos.length} entregados</span>
          </div>
        )}
      </div>

      {loading && <p className="rp-empty">Cargando…</p>}
      {!loading && horas.length === 0 && <p className="rp-empty">No hay repartos a domicilio este día</p>}

      {/* Una sola rejilla en orden de hora: aprovecha el ancho en tablet/PC */}
      <div className="rp-cards">
        {horas.flatMap(h => gruposDia[h].map(g => (
          <TarjetaCliente
            key={g.key}
            grupo={g}
            hora={h}
            done={g.pedidos.every(p => p.status === 'entregado')}
            updating={updating === g.key}
            accion="✓ Entregado"
            hecho="Entregado"
            onAccion={() => setEstado(g, 'entregado')}
            onDeshacer={() => setAnular(g)}
          />
        )))}
      </div>

      {anular && (
        <ConfirmModal
          texto={<>¿Marcar el reparto de <strong>{anular.pedidos[0].cliente_nombre}</strong> como <strong>no entregado</strong>?</>}
          updating={updating === anular.key}
          onConfirm={() => setEstado(anular, 'listo')}
          onCancel={() => setAnular(null)}
        />
      )}
    </>
  );
}

/* ── Recogidas ──────────────────────────────────────────────────── */

function RecogidasView({ onPendientes }: { onPendientes: (n: number) => void }) {
  const hoy = todayIso();
  const desde = addDaysIso(hoy, -28);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Grupo | null>(null);
  const [anular, setAnular] = useState<Grupo | null>(null);

  useEffect(() => {
    getPedidos({ status: 'entregado' })
      .then(data => setPedidos(data.filter(p => {
        const f = fechaPedido(p.fecha_pedido);
        return !p.local_recogida && f >= desde && f < hoy;
      })))
      .catch(() => setPedidos([]))
      .finally(() => setLoading(false));
  }, [desde, hoy]);

  // Agrupadas por semana; dentro, la más antigua primero (es la más urgente)
  const porSemana = useMemo(() => agrupar(pedidos, p => lunesDe(fechaPedido(p.fecha_pedido))), [pedidos]);
  const semanas = Object.keys(porSemana).sort().filter(s => porSemana[s].some(g => g.pedidos.some(p => !p.recogido)));
  const pendientes = semanas.flatMap(s => porSemana[s]).filter(g => g.pedidos.some(p => !p.recogido)).length;

  useEffect(() => { if (!loading) onPendientes(pendientes); }, [loading, pendientes, onPendientes]);

  function marcarLocal(ids: number[], recogido: boolean) {
    setPedidos(prev => prev.map(p => (ids.includes(p.id) ? { ...p, recogido } : p)));
  }

  async function recoger(g: Grupo, rating: number | null, comentario: string) {
    setUpdating(g.key);
    setFeedback(null);
    try {
      if (rating !== null || comentario.trim()) {
        for (const p of g.pedidos) await savePedidoFeedback(p.id, { rating: rating ?? undefined, comentario });
      }
      for (const p of g.pedidos) await updatePedido(p.id, { recogido: true });
      marcarLocal(g.pedidos.map(p => p.id), true);
    } catch {
      alert('No se pudo marcar la recogida. Revisa la conexión.');
    } finally {
      setUpdating(null);
    }
  }

  async function deshacer(g: Grupo) {
    setUpdating(g.key);
    try {
      for (const p of g.pedidos) await updatePedido(p.id, { recogido: false });
      marcarLocal(g.pedidos.map(p => p.id), false);
    } finally {
      setUpdating(null);
      setAnular(null);
    }
  }

  return (
    <>
      <div className="rp-summary">
        <h2>Recipientes por recoger</h2>
        {!loading && <span className="rp-progress-text">{pendientes} pendientes · últimas 4 semanas</span>}
      </div>

      {loading && <p className="rp-empty">Cargando…</p>}
      {!loading && semanas.length === 0 && <p className="rp-empty">✓ No hay recogidas pendientes</p>}

      <div className="rp-list">
        {semanas.map(s => (
          <section key={s} className="rp-slot">
            <h3 className="rp-slot-title">
              Semana del {fmt(s, { day: 'numeric', month: 'short' })}
              <span>{porSemana[s].filter(g => g.pedidos.some(p => !p.recogido)).length}</span>
            </h3>
            <div className="rp-cards">
              {porSemana[s]
                .slice()
                // pendientes primero y, dentro, la entrega más antigua
                .sort((a, b) =>
                  Number(a.pedidos.every(p => p.recogido)) - Number(b.pedidos.every(p => p.recogido)) ||
                  a.pedidos[0].fecha_pedido.localeCompare(b.pedidos[0].fecha_pedido))
                .map(g => {
                  const done = g.pedidos.every(p => p.recogido);
                  const n = diasDesde(fechaPedido(g.pedidos[0].fecha_pedido));
                  return (
                    <TarjetaCliente
                      key={g.key}
                      grupo={g}
                      done={done}
                      updating={updating === g.key}
                      meta={`Entregado ${fmt(fechaPedido(g.pedidos[0].fecha_pedido), { weekday: 'short', day: 'numeric' })} · hace ${n} día${n === 1 ? '' : 's'}`}
                      urgente={n >= 7}
                      accion="✓ Recogido"
                      hecho="Recogido"
                      onAccion={() => setFeedback(g)}
                      onDeshacer={() => setAnular(g)}
                    />
                  );
                })}
            </div>
          </section>
        ))}
      </div>

      {feedback && (
        <FeedbackModal
          clientName={feedback.pedidos[0].cliente_nombre || ''}
          onSubmit={(r, c) => recoger(feedback, r, c)}
          onCancel={() => setFeedback(null)}
        />
      )}

      {anular && (
        <ConfirmModal
          texto={<>¿Marcar la recogida de <strong>{anular.pedidos[0].cliente_nombre}</strong> como <strong>pendiente</strong>?</>}
          updating={updating === anular.key}
          onConfirm={() => deshacer(anular)}
          onCancel={() => setAnular(null)}
        />
      )}
    </>
  );
}

/* ── Compartidos ────────────────────────────────────────────────── */

interface TarjetaProps {
  grupo: Grupo;
  hora?: string;
  done: boolean;
  updating: boolean;
  accion: string;
  hecho: string;
  meta?: string;
  urgente?: boolean;
  onAccion: () => void;
  onDeshacer: () => void;
}

function TarjetaCliente({ grupo, hora, done, updating, accion, hecho, meta, urgente, onAccion, onDeshacer }: TarjetaProps) {
  const p0 = grupo.pedidos[0];
  const lineas = grupo.pedidos.flatMap(p => p.lineas?.length ? p.lineas.map(l => ({ id: l.id, nombre: l.arroz_nombre || 'Arroz', rac: l.raciones })) : [{ id: p.id, nombre: 'Arroz', rac: p.pax }]);
  const notas = grupo.pedidos.map(p => p.observaciones).filter(Boolean).join(' · ');
  const dir = p0.direccion?.trim();
  const tel = p0.telefono?.trim();

  if (done) {
    return (
      <div className="rp-card done">
        <span className="rp-card-check">✓</span>
        {hora && <span className="rp-card-time">{hora}</span>}
        <span className="rp-card-name">{p0.cliente_nombre}</span>
        <span className="rp-card-done-label">{hecho}</span>
        <button className="rp-undo" onClick={onDeshacer} disabled={updating}>Deshacer</button>
      </div>
    );
  }

  return (
    <div className={`rp-card ${urgente ? 'urgent' : ''}`}>
      <div className="rp-card-head">
        <span className="rp-card-name">
          {hora && <span className="rp-card-time">{hora}</span>}
          {p0.cliente_nombre || `Cliente #${p0.cliente_id}`}
        </span>
        {meta && <span className="rp-card-meta">{meta}</span>}
      </div>
      <ul className="rp-card-lines">
        {lineas.map(l => <li key={l.id}><span>{l.nombre}</span><strong>×{l.rac}</strong></li>)}
      </ul>
      {notas && <div className="rp-card-notes">📝 {notas}</div>}
      {dir && <div className="rp-card-addr">📍 {dir}</div>}
      <div className="rp-card-actions">
        {tel && <a className="rp-btn" href={`tel:${tel}`} aria-label={`Llamar a ${p0.cliente_nombre}`}>📞 Llamar</a>}
        {dir && <a className="rp-btn" href={mapsUrl(dir)} target="_blank" rel="noreferrer">🧭 Cómo llegar</a>}
        <button className="rp-btn rp-btn-primary" onClick={onAccion} disabled={updating}>
          {updating ? '…' : accion}
        </button>
      </div>
    </div>
  );
}

function FeedbackModal({ clientName, onSubmit, onCancel }: {
  clientName: string;
  onSubmit: (rating: number | null, comentario: string) => void;
  onCancel: () => void;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [comentario, setComentario] = useState('');

  return (
    <div className="rp-overlay" onClick={onCancel}>
      <div className="rp-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <h3 className="rp-modal-title">Recogida · {clientName}</h3>
        <p className="rp-modal-sub">¿Qué tal valoró el cliente el arroz? (opcional)</p>
        <div className="rp-rating">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              type="button"
              className={`${rating !== null && n <= rating ? 'lit' : ''} ${rating === n ? 'current' : ''}`}
              onClick={() => setRating(prev => (prev === n ? null : n))}
            >
              {n}
            </button>
          ))}
        </div>
        <textarea
          className="rp-textarea"
          placeholder="Comentario del cliente (opcional)"
          value={comentario}
          onChange={e => setComentario(e.target.value)}
          rows={3}
        />
        <div className="rp-modal-actions">
          <button className="rp-btn" onClick={onCancel}>Cancelar</button>
          <button className="rp-btn rp-btn-primary" onClick={() => onSubmit(rating, comentario)}>
            {rating !== null || comentario.trim() ? 'Guardar y marcar recogido' : 'Marcar recogido'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ texto, updating, onConfirm, onCancel }: {
  texto: React.ReactNode;
  updating: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rp-overlay" onClick={onCancel}>
      <div className="rp-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <p className="rp-modal-text">{texto}</p>
        <div className="rp-modal-actions">
          <button className="rp-btn" onClick={onCancel}>Cancelar</button>
          <button className="rp-btn rp-btn-danger" disabled={updating} onClick={onConfirm}>{updating ? '…' : 'Sí, deshacer'}</button>
        </div>
      </div>
    </div>
  );
}
