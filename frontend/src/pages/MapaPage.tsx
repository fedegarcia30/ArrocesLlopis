import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getMapaStats } from '../api/stats';
import type { MapaCliente, MapaPeriod, MapaResponse } from '../api/stats';
import './MapaPage.css';

// ── Constantes ────────────────────────────────────────────────────────────────

const ZOOM_THRESHOLD = 12; // < umbral → vista CP; >= umbral → vista calle

// ── Colores ───────────────────────────────────────────────────────────────────

const COLOR_LOCAL   = '#D4AF37'; // dorado
const COLOR_REPARTO = '#4ECDC4'; // teal
const COLOR_MIXED   = '#F97316'; // naranja

const COLOR_PREV_LOCAL   = '#818CF8'; // indigo
const COLOR_PREV_REPARTO = '#34D399'; // esmeralda
const COLOR_PREV_MIXED   = '#F472B6'; // rosa

const COLOR_OVERLAP_CURR = '#FBBF24'; // ámbar (dominante periodo actual)
const COLOR_OVERLAP_PREV = '#8B5CF6'; // violeta (dominante periodo anterior)

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}
function blendHex(a: string, b: string, t: number): string {
  const [r1,g1,b1] = hexToRgb(a), [r2,g2,b2] = hexToRgb(b);
  return '#' + [r1*t+r2*(1-t), g1*t+g2*(1-t), b1*t+b2*(1-t)]
    .map(v => Math.round(v).toString(16).padStart(2,'0')).join('');
}

function pickColor(local: number, reparto: number, prev = false): string {
  const c_local   = prev ? COLOR_PREV_LOCAL   : COLOR_LOCAL;
  const c_reparto = prev ? COLOR_PREV_REPARTO : COLOR_REPARTO;
  const c_mixed   = prev ? COLOR_PREV_MIXED   : COLOR_MIXED;
  if (local > 0 && reparto > 0) {
    if (local > reparto)  return c_local;
    if (reparto > local)  return c_reparto;
    return c_mixed;
  }
  return local > 0 ? c_local : c_reparto;
}

function markerColor(c: MapaCliente, prev = false): string {
  return pickColor(c.pedidos_local, c.pedidos_reparto, prev);
}

function markerColorOverlap(curr: MapaCliente, prev: MapaCliente): string {
  const total = curr.total_raciones + prev.total_raciones;
  return blendHex(COLOR_OVERLAP_CURR, COLOR_OVERLAP_PREV, total > 0 ? curr.total_raciones / total : 0.5);
}

function markerRadius(r: number) { return Math.max(7,  Math.min(28, r / 2)); }
function cpRadius(r: number)     { return Math.max(12, Math.min(50, r / 3)); }

// ── CP grouping ───────────────────────────────────────────────────────────────

interface CpAggregate {
  pedidos_local: number;
  pedidos_reparto: number;
  total_raciones: number;
  clientes: number;
}

interface CpGroup {
  cp: string;
  lat: number;
  lng: number;
  curr: CpAggregate;
  prev: CpAggregate;
}

function emptyAgg(): CpAggregate {
  return { pedidos_local: 0, pedidos_reparto: 0, total_raciones: 0, clientes: 0 };
}

function addToAgg(agg: CpAggregate, c: MapaCliente) {
  agg.pedidos_local   += c.pedidos_local;
  agg.pedidos_reparto += c.pedidos_reparto;
  agg.total_raciones  += c.total_raciones;
  agg.clientes        += 1;
}

function groupByCp(currData: MapaCliente[], prevData: MapaCliente[], compare: boolean): CpGroup[] {
  // Paso 1: centroides por CP (media de coords disponibles)
  const coords = new Map<string, { lats: number[]; lngs: number[] }>();
  for (const c of [...currData, ...(compare ? prevData : [])]) {
    if (!c.codigo_postal || c.lat === null || c.lng === null) continue;
    if (!coords.has(c.codigo_postal)) coords.set(c.codigo_postal, { lats: [], lngs: [] });
    coords.get(c.codigo_postal)!.lats.push(c.lat);
    coords.get(c.codigo_postal)!.lngs.push(c.lng);
  }

  // Paso 2: agregados por CP
  const cpMap = new Map<string, { curr: CpAggregate; prev: CpAggregate }>();

  for (const c of currData) {
    if (!c.codigo_postal) continue;
    if (!cpMap.has(c.codigo_postal)) cpMap.set(c.codigo_postal, { curr: emptyAgg(), prev: emptyAgg() });
    addToAgg(cpMap.get(c.codigo_postal)!.curr, c);
  }
  if (compare) {
    for (const c of prevData) {
      if (!c.codigo_postal) continue;
      if (!cpMap.has(c.codigo_postal)) cpMap.set(c.codigo_postal, { curr: emptyAgg(), prev: emptyAgg() });
      addToAgg(cpMap.get(c.codigo_postal)!.prev, c);
    }
  }

  // Paso 3: construir resultado con centroide calculado
  const result: CpGroup[] = [];
  for (const [cp, data] of cpMap.entries()) {
    const c = coords.get(cp);
    if (!c || c.lats.length === 0) continue; // sin coordenadas → no se puede posicionar
    const lat = c.lats.reduce((a, b) => a + b) / c.lats.length;
    const lng = c.lngs.reduce((a, b) => a + b) / c.lngs.length;
    result.push({ cp, lat, lng, curr: data.curr, prev: data.prev });
  }
  return result;
}

function cpColor(group: CpGroup, compare: boolean): string {
  const hasCurr = group.curr.total_raciones > 0;
  const hasPrev = group.prev.total_raciones > 0;
  if (compare && hasCurr && hasPrev) {
    const total = group.curr.total_raciones + group.prev.total_raciones;
    return blendHex(COLOR_OVERLAP_CURR, COLOR_OVERLAP_PREV, group.curr.total_raciones / total);
  }
  if (!hasCurr && hasPrev) return pickColor(group.prev.pedidos_local, group.prev.pedidos_reparto, true);
  return pickColor(group.curr.pedidos_local, group.curr.pedidos_reparto, false);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const now = new Date();
const CUR_YEAR  = now.getFullYear();
const CUR_MONTH = now.getMonth() + 1;
const CUR_Q     = Math.ceil(CUR_MONTH / 3);
const CUR_SEM   = CUR_MONTH <= 6 ? 1 : 2;

function sumData(data: MapaCliente[]) {
  return data.reduce((acc, c) => ({
    local:    acc.local    + c.pedidos_local,
    reparto:  acc.reparto  + c.pedidos_reparto,
    raciones: acc.raciones + c.total_raciones,
  }), { local: 0, reparto: 0, raciones: 0 });
}

function pct(curr: number, prev: number): string {
  if (prev === 0) return curr > 0 ? '+∞%' : '—';
  const d = Math.round(((curr - prev) / prev) * 100);
  return (d >= 0 ? '+' : '') + d + '%';
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(points as LatLngBoundsExpression, { padding: [48, 48], maxZoom: 13 });
  }, [points, map]);
  return null;
}

function ZoomWatcher({ onZoom }: { onZoom: (z: number) => void }) {
  useMapEvents({ zoomend: (e) => onZoom(e.target.getZoom()) });
  return null;
}

function isPastOrCurrent(period: MapaPeriod, year: number, month: number, quarter: number, semester: number) {
  if (year < CUR_YEAR) return true;
  if (year > CUR_YEAR) return false;
  if (period === 'month')    return month    <= CUR_MONTH;
  if (period === 'quarter')  return quarter  <= CUR_Q;
  if (period === 'semester') return semester <= CUR_SEM;
  return true;
}

// ── Popups ────────────────────────────────────────────────────────────────────

function YearBlock({ c, label, prev }: { c: MapaCliente; label: string; prev?: boolean }) {
  return (
    <div className={`popup-year-block ${prev ? 'popup-year-prev' : 'popup-year-curr'}`}>
      <div className="popup-year-label">{label}</div>
      {c.pedidos_local   > 0 && <div className="popup-local">🏠 {c.pedidos_local} recogida{c.pedidos_local > 1 ? 's' : ''} en local</div>}
      {c.pedidos_reparto > 0 && <div className="popup-reparto">🛵 {c.pedidos_reparto} reparto{c.pedidos_reparto > 1 ? 's' : ''} a domicilio</div>}
      <div className="popup-raciones">{c.total_raciones} raciones</div>
    </div>
  );
}

function CpYearBlock({ agg, label, prev }: { agg: CpAggregate; label: string; prev?: boolean }) {
  return (
    <div className={`popup-year-block ${prev ? 'popup-year-prev' : 'popup-year-curr'}`}>
      <div className="popup-year-label">{label}</div>
      {agg.pedidos_local   > 0 && <div className="popup-local">🏠 {agg.pedidos_local} recogida{agg.pedidos_local > 1 ? 's' : ''} en local</div>}
      {agg.pedidos_reparto > 0 && <div className="popup-reparto">🛵 {agg.pedidos_reparto} reparto{agg.pedidos_reparto > 1 ? 's' : ''} a domicilio</div>}
      <div className="popup-raciones">{agg.total_raciones} raciones · {agg.clientes} cliente{agg.clientes !== 1 ? 's' : ''}</div>
    </div>
  );
}

function MarkerPopup({ curr, prev, currLabel, prevLabel }: {
  curr: MapaCliente; prev?: MapaCliente; currLabel: string; prevLabel: string;
}) {
  return (
    <div className="mapa-popup">
      <strong>{curr.nombre}</strong>
      {curr.direccion_limpia && <div className="popup-address">{curr.direccion_limpia}</div>}
      <YearBlock c={curr} label={currLabel} />
      {prev && <YearBlock c={prev} label={prevLabel} prev />}
    </div>
  );
}

function CpPopupContent({ group, compare, currLabel, prevLabel }: {
  group: CpGroup; compare: boolean; currLabel: string; prevLabel: string;
}) {
  return (
    <div className="mapa-popup">
      <strong>CP {group.cp}</strong>
      {group.curr.total_raciones > 0 && <CpYearBlock agg={group.curr} label={currLabel} />}
      {compare && group.prev.total_raciones > 0 && <CpYearBlock agg={group.prev} label={prevLabel} prev />}
      <div className="popup-cp-hint">Doble clic para ampliar</div>
    </div>
  );
}

// ── Markers de nivel CP (necesitan acceso al mapa para zoom) ──────────────────

function CpMarkers({ groups, compare, currLabel, prevLabel }: {
  groups: CpGroup[]; compare: boolean; currLabel: string; prevLabel: string;
}) {
  const map = useMap();
  return (
    <>
      {groups.map(group => {
        const color = cpColor(group, compare);
        const total = group.curr.total_raciones + (compare ? group.prev.total_raciones : 0);
        return (
          <CircleMarker
            key={`cp-${group.cp}`}
            center={[group.lat, group.lng]}
            radius={cpRadius(total)}
            pathOptions={{ fillColor: color, color: color, fillOpacity: 0.72, weight: 2 }}
            eventHandlers={{
              dblclick: (e) => {
                e.originalEvent.stopPropagation();
                map.setView([group.lat, group.lng], ZOOM_THRESHOLD + 1);
              },
            }}
          >
            <Popup>
              <CpPopupContent group={group} compare={compare} currLabel={currLabel} prevLabel={prevLabel} />
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

// ── Filter ────────────────────────────────────────────────────────────────────

type Filtro = 'todos' | 'local' | 'reparto';

function applyFilter(data: MapaCliente[], filtro: Filtro): MapaCliente[] {
  if (filtro === 'local')   return data.filter(c => c.pedidos_local   > 0);
  if (filtro === 'reparto') return data.filter(c => c.pedidos_reparto > 0);
  return data;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MapaPage() {
  const [period,   setPeriod]   = useState<MapaPeriod>('month');
  const [year,     setYear]     = useState(CUR_YEAR);
  const [month,    setMonth]    = useState(CUR_MONTH);
  const [quarter,  setQuarter]  = useState(CUR_Q);
  const [semester, setSemester] = useState(CUR_SEM);
  const [compare,  setCompare]  = useState(false);
  const [filtro,   setFiltro]   = useState<Filtro>('todos');
  const [zoom,     setZoom]     = useState(7);

  const [resp,      setResp]      = useState<MapaResponse | null>(null);
  const [fitPoints, setFitPoints] = useState<[number, number][]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const isStreetLevel = zoom >= ZOOM_THRESHOLD;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const opts = period === 'month'    ? { month }
                 : period === 'quarter'  ? { quarter }
                 : period === 'semester' ? { semester }
                 : {};
      const data = await getMapaStats(period, year, opts);
      setResp(data);
      const all = [
        ...data.current.data.filter(c => c.lat !== null && c.lng !== null).map(c  => [c.lat!, c.lng!] as [number, number]),
        ...data.previous.data.filter(c => c.lat !== null && c.lng !== null).map(c => [c.lat!, c.lng!] as [number, number]),
      ];
      if (all.length > 0) setFitPoints(all);
    } catch {
      setError('Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, [period, year, month, quarter, semester]);

  useEffect(() => { load(); }, [load]);

  function nav(dir: 1 | -1) {
    if (period === 'month') {
      let m = month + dir, y = year;
      if (m > 12) { m = 1; y++; } if (m < 1) { m = 12; y--; }
      if (isPastOrCurrent('month', y, m, quarter, semester) || dir === -1) { setYear(y); setMonth(m); }
    } else if (period === 'quarter') {
      let q = quarter + dir, y = year;
      if (q > 4) { q = 1; y++; } if (q < 1) { q = 4; y--; }
      if (isPastOrCurrent('quarter', y, month, q, semester) || dir === -1) { setYear(y); setQuarter(q); }
    } else if (period === 'semester') {
      let s = semester + dir, y = year;
      if (s > 2) { s = 1; y++; } if (s < 1) { s = 2; y--; }
      if (isPastOrCurrent('semester', y, month, quarter, s) || dir === -1) { setYear(y); setSemester(s); }
    } else {
      const y = year + dir;
      if (y <= CUR_YEAR || dir === -1) setYear(y);
    }
  }

  function periodLabel() {
    if (period === 'month')    return `${MESES[month - 1]} ${year}`;
    if (period === 'quarter')  return `T${quarter} ${year}`;
    if (period === 'semester') return `${semester === 1 ? '1er' : '2º'} Sem. ${year}`;
    return String(year);
  }

  const isAtMax = (() => {
    if (period === 'month')    { let m = month + 1, y = year; if (m > 12) { m = 1; y++; } return !isPastOrCurrent('month', y, m, quarter, semester); }
    if (period === 'quarter')  { let q = quarter + 1, y = year; if (q > 4) { q = 1; y++; } return !isPastOrCurrent('quarter', y, month, q, semester); }
    if (period === 'semester') { let s = semester + 1, y = year; if (s > 2) { s = 1; y++; } return !isPastOrCurrent('semester', y, month, quarter, s); }
    return year >= CUR_YEAR;
  })();

  const currData = applyFilter(resp?.current.data  ?? [], filtro);
  const prevData = applyFilter(resp?.previous.data ?? [], filtro);

  // Vista calle: solo clientes con coordenadas exactas
  const currGeo = currData.filter(c => c.lat !== null && c.lng !== null);
  const prevGeo = prevData.filter(c => c.lat !== null && c.lng !== null);

  const prevMap = compare
    ? new Map(prevGeo.map(c => [c.cliente_id, c]))
    : new Map<number, MapaCliente>();

  const prevOnly = compare
    ? prevGeo.filter(c => !currGeo.some(cc => cc.cliente_id === c.cliente_id))
    : [];

  // Vista CP: agrupados por código postal
  const cpGroups = groupByCp(currData, prevData, compare);

  const currLabel = resp?.current.label  ?? '';
  const prevLabel = resp?.previous.label ?? '';

  const currSum = sumData(currData);
  const prevSum = sumData(prevData);

  return (
    <div className="mapa-page">

      <div className="mapa-period-tabs">
        {(['month','quarter','semester','year'] as MapaPeriod[]).map(p => (
          <button key={p} className={`mapa-period-tab ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
            {{ month: 'Mes', quarter: 'Trimestre', semester: 'Semestre', year: 'Año' }[p]}
          </button>
        ))}
      </div>

      <div className="mapa-header">
        <div className="mapa-month-nav">
          <button className="mapa-nav-btn" onClick={() => nav(-1)}>‹</button>
          <span className="mapa-month-label">{periodLabel()}</span>
          <button className="mapa-nav-btn" onClick={() => nav(1)} disabled={isAtMax}>›</button>
        </div>
        <div className="mapa-filters">
          {(['todos','local','reparto'] as Filtro[]).map(f => (
            <button key={f} className={`mapa-filter-btn ${filtro === f ? 'active' : ''} mapa-filter-${f}`} onClick={() => setFiltro(f)}>
              {f === 'todos' ? 'Ambos' : f === 'local' ? '🏠 Local' : '🛵 Reparto'}
            </button>
          ))}
        </div>
        <button className={`mapa-compare-btn ${compare ? 'active' : ''}`} onClick={() => setCompare(v => !v)}>
          vs {resp?.previous.label ?? 'año anterior'}
        </button>
      </div>

      {/* Stats bar */}
      <div className="mapa-stats-bar">
        <div className="mapa-stats-period">
          <span className="mapa-stats-label">{currLabel || '…'}</span>
          <span className="mapa-stat"><span className="dot" style={{ background: COLOR_LOCAL }} />{currSum.local} local</span>
          <span className="mapa-stat"><span className="dot" style={{ background: COLOR_REPARTO }} />{currSum.reparto} reparto</span>
          <span className="mapa-stat">🍚 {currSum.raciones}</span>
          <span className="mapa-stat">📍 {currData.length}</span>
        </div>
        {compare && (
          <>
            <div className="mapa-stats-divider">vs</div>
            <div className="mapa-stats-period mapa-stats-prev">
              <span className="mapa-stats-label">{prevLabel || '…'}</span>
              <span className="mapa-stat"><span className="dot" style={{ background: COLOR_PREV_LOCAL }} />{prevSum.local}</span>
              <span className="mapa-stat"><span className="dot" style={{ background: COLOR_PREV_REPARTO }} />{prevSum.reparto}</span>
              <span className="mapa-stat">🍚 {prevSum.raciones}</span>
              <span className="mapa-stat">📍 {prevData.length}</span>
            </div>
            <div className="mapa-deltas">
              <span className={`mapa-delta ${currSum.raciones >= prevSum.raciones ? 'up' : 'down'}`}>{pct(currSum.raciones, prevSum.raciones)} raciones</span>
              <span className={`mapa-delta ${(currSum.local + currSum.reparto) >= (prevSum.local + prevSum.reparto) ? 'up' : 'down'}`}>{pct(currSum.local + currSum.reparto, prevSum.local + prevSum.reparto)} pedidos</span>
            </div>
          </>
        )}
      </div>

      {loading && <div className="mapa-loading">Cargando…</div>}
      {error   && <div className="mapa-error">{error}</div>}

      <div className="mapa-container">
        <MapContainer center={[40.4, -3.7]} zoom={7} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <ZoomWatcher onZoom={setZoom} />
          {fitPoints.length > 0 && <FitBounds points={fitPoints} />}

          {isStreetLevel ? (
            <>
              {/* Solo en año anterior (sin solapamiento) */}
              {prevOnly.map(c => (
                <CircleMarker
                  key={`prev-${c.cliente_id}`}
                  center={[c.lat!, c.lng!]}
                  radius={markerRadius(c.total_raciones)}
                  pathOptions={{ fillColor: markerColor(c, true), color: markerColor(c, true), fillOpacity: 0.7, weight: 1.5 }}
                >
                  <Popup><MarkerPopup curr={c} currLabel={prevLabel} prevLabel={currLabel} /></Popup>
                </CircleMarker>
              ))}

              {/* Año actual */}
              {currGeo.map(c => {
                const prevC = prevMap.get(c.cliente_id);
                const color = (compare && prevC) ? markerColorOverlap(c, prevC) : markerColor(c);
                return (
                  <CircleMarker
                    key={`curr-${c.cliente_id}`}
                    center={[c.lat!, c.lng!]}
                    radius={markerRadius(c.total_raciones)}
                    pathOptions={{ fillColor: color, color: color, fillOpacity: 0.85, weight: 1.5 }}
                  >
                    <Popup>
                      <MarkerPopup curr={c} prev={compare ? prevC : undefined} currLabel={currLabel} prevLabel={prevLabel} />
                    </Popup>
                  </CircleMarker>
                );
              })}
            </>
          ) : (
            /* Vista CP */
            <CpMarkers groups={cpGroups} compare={compare} currLabel={currLabel} prevLabel={prevLabel} />
          )}
        </MapContainer>

        {/* Indicador de nivel de zoom */}
        <div className="mapa-zoom-badge">
          {isStreetLevel ? '📍 Vista calle' : '🗺️ Vista CP — doble clic para ampliar'}
        </div>

        {/* Leyenda */}
        <div className="mapa-legend">
          <div className="legend-section-label">{currLabel}</div>
          <span className="legend-item"><span className="legend-dot" style={{ background: COLOR_LOCAL }} />Local</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: COLOR_REPARTO }} />Reparto</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: COLOR_MIXED }} />Ambos</span>
          {compare && <>
            <div className="legend-section-label" style={{ marginTop: 6 }}>{prevLabel}</div>
            <span className="legend-item"><span className="legend-dot" style={{ background: COLOR_PREV_LOCAL }} />Local</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: COLOR_PREV_REPARTO }} />Reparto</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: COLOR_PREV_MIXED }} />Ambos</span>
            <div className="legend-section-label" style={{ marginTop: 6 }}>Ambos períodos</div>
            <span className="legend-item">
              <span className="legend-dot legend-dot-gradient" style={{ background: `linear-gradient(135deg, ${COLOR_OVERLAP_CURR}, ${COLOR_OVERLAP_PREV})` }} />
              +{currLabel} / +{prevLabel}
            </span>
          </>}
        </div>
      </div>
    </div>
  );
}
