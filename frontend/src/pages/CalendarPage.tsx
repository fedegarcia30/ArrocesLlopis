import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMonthlySummary } from '../api/pedidos';
import type { CalendarMonthResponse } from '../types';
import { todayIso } from '../utils/pedidos';
import './CalendarPage.css';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/**
 * Calendario mensual: el mes entero cabe en pantalla (iPad, PC y móvil).
 * La intensidad de cada día indica la carga en raciones. Toque → pedidos de ese día.
 */
export function CalendarPage() {
    const navigate = useNavigate();
    const today = todayIso();
    const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) }));
    const [summary, setSummary] = useState<CalendarMonthResponse>({});
    const [loading, setLoading] = useState(true);
    const { y, m } = ym;

    useEffect(() => {
        let vivo = true;
        getMonthlySummary(y, m)
            .then(d => { if (vivo) setSummary(d); })
            .catch(() => { if (vivo) setSummary({}); })
            .finally(() => { if (vivo) setLoading(false); });
        return () => { vivo = false; };
    }, [y, m]);

    function irA(ny: number, nm: number) {
        setLoading(true);
        setYm({ y: ny, m: nm });
    }

    function mover(delta: number) {
        const d = new Date(y, m - 1 + delta, 1);
        irA(d.getFullYear(), d.getMonth() + 1);
    }

    const diasMes = new Date(y, m, 0).getDate();
    const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7; // lunes = 0
    const semanas = Math.ceil((offset + diasMes) / 7);
    const key = (d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const valores = Object.values(summary);
    const maxPax = Math.max(1, ...valores.map(v => v.total_pax));
    const totPedidos = valores.reduce((s, v) => s + v.count, 0);
    const totPax = valores.reduce((s, v) => s + v.total_pax, 0);
    const esMesActual = today.startsWith(`${y}-${String(m).padStart(2, '0')}`);

    return (
        <div className="cal-page">
            <header className="cal-header">
                <div className="cal-nav">
                    <button className="cal-navbtn" onClick={() => mover(-1)} aria-label="Mes anterior">‹</button>
                    <h1 className="cal-title">{MESES[m - 1]} <span>{y}</span></h1>
                    <button className="cal-navbtn" onClick={() => mover(1)} aria-label="Mes siguiente">›</button>
                    {!esMesActual && (
                        <button className="cal-today" onClick={() => irA(Number(today.slice(0, 4)), Number(today.slice(5, 7)))}>Hoy</button>
                    )}
                </div>
                <div className="cal-totals">
                    <span><strong>{totPedidos}</strong> pedidos</span>
                    <span><strong>{totPax.toLocaleString('es-ES')}</strong> raciones</span>
                    {loading && <span className="cal-loading">Cargando…</span>}
                </div>
            </header>

            <div className="cal-grid" style={{ gridTemplateRows: `auto repeat(${semanas}, minmax(0, 1fr))` }}>
                {DIAS.map(d => <div key={d} className="cal-weekday">{d}</div>)}
                {Array.from({ length: offset }, (_, i) => <div key={`p${i}`} className="cal-day cal-pad" />)}
                {Array.from({ length: diasMes }, (_, i) => {
                    const d = i + 1;
                    const k = key(d);
                    const info = summary[k];
                    const intensidad = info ? info.total_pax / maxPax : 0;
                    return (
                        <button
                            key={k}
                            className={`cal-day ${info ? 'has-orders' : ''} ${k === today ? 'today' : ''} ${k < today ? 'past' : ''}`}
                            style={info ? { ['--heat' as string]: (0.08 + intensidad * 0.42).toFixed(2) } : undefined}
                            onClick={() => navigate(`/diario?date=${k}`)}
                            aria-label={`${d} de ${MESES[m - 1]}: ${info ? `${info.count} pedidos, ${info.total_pax} raciones` : 'sin pedidos'}`}
                        >
                            <span className="cal-num">{d}</span>
                            {info && (
                                <span className="cal-stats">
                                    <strong>{info.total_pax}</strong>
                                    <small>rac</small>
                                    <span className="cal-orders">{info.count} ped.</span>
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
