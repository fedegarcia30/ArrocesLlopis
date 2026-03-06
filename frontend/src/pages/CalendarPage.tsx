import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMonthlySummary } from '../api/pedidos';
import type { CalendarMonthResponse } from '../types';
import './CalendarPage.css';

export function CalendarPage() {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [summary, setSummary] = useState<CalendarMonthResponse>({});
    const [loading, setLoading] = useState(false);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // 1-12

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

    function handleDayClick(day: number) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        navigate(`/dashboard?date=${dateStr}`);
    }

    const calendarDays = [];
    // Padding for first week
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
                <div className="calendar-nav glass-card">
                    <button onClick={handlePrevMonth} title="Mes anterior">&lt;</button>
                    <h2>{monthNames[month - 1]} {year}</h2>
                    <button onClick={handleNextMonth} title="Mes siguiente">&gt;</button>
                </div>
            </div>

            <div className="calendar-grid">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                    <div key={d} className="calendar-weekday">{d}</div>
                ))}
                {calendarDays}
            </div>

            {loading && <div className="calendar-loading">Cargando...</div>}
        </div>
    );
}
