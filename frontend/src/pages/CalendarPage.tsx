import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMonthlySummary } from '../api/pedidos';
import type { CalendarMonthResponse } from '../types';
import './CalendarPage.css';

function getMondayOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatWeekLabel(weekStart: Date): string {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    return `${fmt(weekStart)} – ${fmt(end)}`;
}

function toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const WEEK_DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function CalendarPage() {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [summary, setSummary] = useState<CalendarMonthResponse>({});
    const [loading, setLoading] = useState(false);

    // Mobile state
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
    const [mobileWeekStart, setMobileWeekStart] = useState(() => getMondayOfWeek(new Date()));

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // 1-12

    // Detectar cambio de tamaño de pantalla
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // Cuando cambia la semana en mobile, actualizar el mes del que se fetcha data
    useEffect(() => {
        if (isMobile) {
            setCurrentDate(new Date(mobileWeekStart.getFullYear(), mobileWeekStart.getMonth(), 1));
        }
    }, [mobileWeekStart, isMobile]);

    useEffect(() => {
        async function loadSummary() {
            setLoading(true);
            try {
                const data = await getMonthlySummary(year, month);
                setSummary(data);
            } catch (err) {
                console.error('Error loading calendar summary:', err);
            } finally {
                setLoading(false);
            }
        }
        loadSummary();
    }, [year, month]);

    // Use current month calculation
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfMonthRaw = new Date(year, month - 1, 1).getDay(); // 0 (Sun) to 6 (Sat)

    // Adjust to start on Monday (0 = Mon, 6 = Sun)
    const firstDayIndex = (firstDayOfMonthRaw + 6) % 7;

    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    function handlePrevMonth() {
        setCurrentDate(new Date(year, month - 2, 1));
    }

    function handleNextMonth() {
        setCurrentDate(new Date(year, month, 1));
    }

    function handlePrevWeek() {
        const prev = new Date(mobileWeekStart);
        prev.setDate(prev.getDate() - 7);
        setMobileWeekStart(prev);
    }

    function handleNextWeek() {
        const next = new Date(mobileWeekStart);
        next.setDate(next.getDate() + 7);
        setMobileWeekStart(next);
    }

    function handleDayClick(day: number) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        navigate(`/diario?date=${dateStr}`);
    }

    const todayStr = toDateStr(new Date());

    // Días de la semana para vista mobile
    const mobileWeekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(mobileWeekStart);
        d.setDate(mobileWeekStart.getDate() + i);
        return d;
    });

    // Grid de días para vista desktop
    const calendarDays = [];
    for (let i = 0; i < firstDayIndex; i++) {
        calendarDays.push(<div key={`pad-${i}`} className="calendar-day padding" />);
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayData = summary[dateStr];
        calendarDays.push(
            <div
                key={d}
                className={`calendar-day ${dayData ? 'has-orders' : ''}`}
                onClick={() => handleDayClick(d)}
            >
                <span className="day-number">{d}</span>
                {dayData && (
                    <div className="day-stats">
                        <span className="stat-orders">{dayData.count} pedidos</span>
                        <span className="stat-pax">{dayData.total_pax} PAX</span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="calendar-page">
            <div className="calendar-header">
                <h1 className="calendar-title">Calendario de Pedidos</h1>

                {/* Navegación: semanal en mobile, mensual en desktop */}
                {isMobile ? (
                    <div className="calendar-nav glass-card">
                        <button onClick={handlePrevWeek} title="Semana anterior">&lt;</button>
                        <span className="calendar-week-label">{formatWeekLabel(mobileWeekStart)}</span>
                        <button onClick={handleNextWeek} title="Semana siguiente">&gt;</button>
                    </div>
                ) : (
                    <div className="calendar-nav glass-card">
                        <button onClick={handlePrevMonth} title="Mes anterior">&lt;</button>
                        <h2>{monthNames[month - 1]} {year}</h2>
                        <button onClick={handleNextMonth} title="Mes siguiente">&gt;</button>
                    </div>
                )}
            </div>

            {/* Vista mobile: filas verticales por día */}
            {isMobile ? (
                <div className="calendar-week-rows">
                    {mobileWeekDates.map((d, i) => {
                        const dateStr = toDateStr(d);
                        const dayData = summary[dateStr];
                        const isToday = dateStr === todayStr;
                        return (
                            <button
                                key={dateStr}
                                className={`calendar-week-row${isToday ? ' today' : ''}${dayData ? ' has-orders' : ''}`}
                                onClick={() => navigate(`/diario?date=${dateStr}`)}
                            >
                                <div className="week-row-left">
                                    <span className="week-row-name">{WEEK_DAY_NAMES[i]}</span>
                                    <span className="week-row-number">{d.getDate()}</span>
                                </div>
                                <div className="week-row-stats">
                                    {dayData ? (
                                        <>
                                            <span className="week-row-orders">{dayData.count} pedidos</span>
                                            <span className="week-row-pax">{dayData.total_pax} PAX</span>
                                        </>
                                    ) : (
                                        <span className="week-row-empty">Sin pedidos</span>
                                    )}
                                </div>
                                <span className="week-row-arrow">›</span>
                            </button>
                        );
                    })}
                </div>
            ) : (
                /* Vista desktop: grid mensual */
                <div className="calendar-grid">
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                        <div key={d} className="calendar-weekday">{d}</div>
                    ))}
                    {calendarDays}
                </div>
            )}

            {loading && <div className="calendar-loading">Cargando...</div>}
        </div>
    );
}
