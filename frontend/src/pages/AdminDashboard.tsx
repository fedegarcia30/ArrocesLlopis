import { useState, useEffect, useCallback } from 'react';
import { getDashboardStats, type DashboardStats } from '../api/stats';
import { AdminStatCard } from '../components/Stats/AdminStatCard';
import './AdminDashboard.css';

export function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [period, setPeriod] = useState('quarter');
    const [loading, setLoading] = useState(true);

    const loadStats = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getDashboardStats(period);
            setStats(data);
        } catch (err) {
            console.error('Error loading dashboard stats:', err);
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    if (loading && !stats) return <div className="loading-screen">Cargando análisis...</div>;

    return (
        <div className="admin-dashboard">
            <header className="dashboard-header">
                <h1>Panel de Negocio</h1>
                <div className="period-filters">
                    {['month', 'quarter', 'semester', 'ytd'].map((p) => (
                        <button
                            key={p}
                            className={period === p ? 'active' : ''}
                            onClick={() => setPeriod(p)}
                        >
                            {p === 'month' ? 'Mes' : p === 'quarter' ? 'Trimestre' : p === 'semester' ? 'Semestre' : 'Año Actual'}
                        </button>
                    ))}
                </div>
            </header>

            {stats && (
                <>
                    <section className="stats-grid">
                        <AdminStatCard data={stats.summary.revenue} />
                        <AdminStatCard data={stats.summary.rations} />
                        <AdminStatCard data={stats.summary.orders} />
                        <AdminStatCard data={stats.summary.avg_ticket} />
                    </section>

                    <section className="charts-section">
                        <div className="chart-container glass-card">
                            <div className="chart-title">
                                Tendencia de Ingresos Mensuales
                                {stats.busiest_month && (
                                    <span className="busiest_month-tag">
                                        Pico: {stats.busiest_month}
                                    </span>
                                )}
                            </div>
                            <div className="chart-legend">
                                <div className="legend-item">
                                    <div className="legend-color" style={{ background: 'var(--gold)' }}></div>
                                    Año Actual
                                </div>
                                <div className="legend-item">
                                    <div className="legend-color" style={{ background: 'rgba(255,255,255,0.3)', border: '1px dashed' }}></div>
                                    Año -1
                                </div>
                                <div className="legend-item">
                                    <div className="legend-color" style={{ background: 'rgba(255,255,255,0.1)' }}></div>
                                    Año -2
                                </div>
                            </div>
                            <TrendChart data={stats.history} />
                        </div>

                        <div className="ranking-card glass-card">
                            <h3 className="ranking-title">🏆 Top Arroces</h3>
                            <div className="ranking-list">
                                {stats.top_arroces.map((a, i) => (
                                    <div key={i} className="ranking-item">
                                        <div className="item-info">
                                            <span className="item-name">{a.nombre}</span>
                                            <span className="item-sub">{a.rations} raciones</span>
                                        </div>
                                        <span className="item-value">{a.subtotal.toFixed(2)}€</span>
                                    </div>
                                ))}
                                {stats.top_arroces.length === 0 && <p className="empty-msg">Sin datos</p>}
                            </div>
                        </div>
                    </section>

                    <section className="rankings-grid">
                        <div className="ranking-card glass-card">
                            <h3 className="ranking-title">👤 Mejores Clientes</h3>
                            <div className="ranking-list">
                                {stats.top_clients.map((c, i) => (
                                    <div key={i} className="ranking-item">
                                        <div className="item-info">
                                            <span className="item-name">{c.nombre}</span>
                                            <span className="item-sub">{c.orders} pedidos</span>
                                        </div>
                                        <span className="item-value">{c.spent.toFixed(2)}€</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="ranking-card glass-card">
                            <h3 className="ranking-title">📍 Por Código Postal</h3>
                            <div className="ranking-list">
                                {stats.top_zipcodes.map((z, i) => (
                                    <div key={i} className="ranking-item">
                                        <div className="item-info">
                                            <span className="item-name">CP {z.cp}</span>
                                            <span className="item-sub">{z.orders} pedidos</span>
                                        </div>
                                        <span className="item-value">{z.revenue.toFixed(2)}€</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                    <div className="horizontal-scroll-hint">Desliza para ver más rankings →</div>
                </>
            )}
        </div>
    );
}

function TrendChart({ data }: { data: DashboardStats['history'] }) {
    const months = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    const maxValue = Math.max(...data.current, ...data.prev1, ...data.prev2, ...data.prev3, 100);
    const height = 240;
    const width = 800;
    const padding = 30;

    const getPoints = (values: number[]) => {
        return values.map((v, i) => {
            const x = padding + (i * (width - padding * 2) / 11);
            const y = height - padding - (v / maxValue * (height - padding * 2));
            return `${x},${y}`;
        }).join(' ');
    };

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="svg-chart">
            {/* Grid lines */}
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" />

            {/* Previous years (subtle lines) */}
            <polyline points={getPoints(data.prev3)} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <polyline points={getPoints(data.prev2)} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <polyline points={getPoints(data.prev1)} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeDasharray="4" />

            {/* Current year (gold line) */}
            <polyline points={getPoints(data.current)} fill="none" stroke="var(--gold)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

            {/* Area under current line */}
            <path
                d={`M ${padding},${height - padding} ${getPoints(data.current)} L ${width - padding},${height - padding} Z`}
                fill="url(#gradient-gold)"
                style={{ opacity: 0.1 }}
            />

            {/* Labels */}
            {months.map((m, i) => (
                <text
                    key={i}
                    x={padding + (i * (width - padding * 2) / 11)}
                    y={height - 5}
                    textAnchor="middle"
                    fill="var(--text-muted)"
                    fontSize="10"
                >{m}</text>
            ))}

            <defs>
                <linearGradient id="gradient-gold" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--gold)" />
                    <stop offset="100%" stopColor="transparent" />
                </linearGradient>
            </defs>
        </svg>
    );
}
