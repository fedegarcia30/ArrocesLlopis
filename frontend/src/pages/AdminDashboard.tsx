import { useState, useEffect, useCallback } from 'react';
import { getDashboardStats, getExpenseStats, type DashboardStats, type ExpenseStats } from '../api/stats';
import { AdminStatCard } from '../components/Stats/AdminStatCard';
import './AdminDashboard.css';

export function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<'revenue' | 'expenses'>('revenue');
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [expenseStats, setExpenseStats] = useState<ExpenseStats | null>(null);
    const [period, setPeriod] = useState('quarter');
    const [mode, setMode] = useState<'full' | 'mtd'>('full');
    const [loading, setLoading] = useState(true);
    const [trendMetric, setTrendMetric] = useState<'revenue' | 'rations' | 'orders' | 'clients'>('revenue');

    const loadStats = useCallback(async () => {
        setLoading(true);
        try {
            const [revData, expData] = await Promise.all([
                getDashboardStats(period, mode),
                getExpenseStats(period, mode)
            ]);
            setStats(revData);
            setExpenseStats(expData);
        } catch (err) {
            console.error('Error loading dashboard stats:', err);
        } finally {
            setLoading(false);
        }
    }, [period, mode]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    if (loading && !stats) return <div className="loading-screen">Cargando análisis...</div>;

    return (
        <div className="admin-dashboard">
            <header className="dashboard-header">
                <div className="header-main">
                    <div className="title-nav">
                        <button
                            className={`nav-tab ${activeTab === 'revenue' ? 'active' : ''}`}
                            onClick={() => setActiveTab('revenue')}
                        >
                            Ingresos
                        </button>
                        <button
                            className={`nav-tab ${activeTab === 'expenses' ? 'active' : ''}`}
                            onClick={() => setActiveTab('expenses')}
                        >
                            Gastos y Stock
                        </button>
                    </div>
                    {stats && (
                        <div className="comparison-label">
                            <span className="current-period">{stats.period_info.current.label}</span>
                            <span className="vs">vs</span>
                            <span className="prev-period">{stats.period_info.previous.label}</span>
                        </div>
                    )}
                </div>
                <div className="dashboard-controls">
                    <div className="period-filters">
                        {['week', 'month', 'quarter', 'semester', 'ytd'].map((p) => (
                            <button
                                key={p}
                                className={period === p ? 'active' : ''}
                                onClick={() => setPeriod(p)}
                            >
                                {p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : p === 'quarter' ? 'Trimestre' : p === 'semester' ? 'Semestre' : 'Año Actual'}
                            </button>
                        ))}
                    </div>

                    <div className="mode-toggle">
                        <button
                            className={`mode-btn ${mode === 'mtd' ? 'active' : ''}`}
                            onClick={() => setMode('mtd')}
                            title="Solo pedidos hasta el día de hoy"
                        >
                            Hasta Hoy
                        </button>
                        <button
                            className={`mode-btn ${mode === 'full' ? 'active' : ''}`}
                            onClick={() => setMode('full')}
                            title="Mes/periodo completo incluyendo previsiones"
                        >
                            Periodo Completo
                        </button>
                    </div>
                </div>
            </header>

            <div className="dashboard-content-slider" style={{
                display: 'flex',
                transition: 'transform 0.5s ease',
                transform: `translateX(${activeTab === 'revenue' ? '0' : '-100%'})`,
                width: '100%'
            }}>
                {/* Panel de Ingresos */}
                <div className="dashboard-page-view" style={{ minWidth: '100%', padding: '0 20px' }}>
                    {stats && (
                        <>
                            <section className="stats-grid">
                                <AdminStatCard data={stats.summary.revenue} />
                                <AdminStatCard data={stats.summary.rations} />
                                <AdminStatCard data={stats.summary.orders} />
                                <AdminStatCard data={stats.summary.avg_ticket} />
                            </section>

                            <section className="charts-section">
                                <div className="ranking-card glass-card trend-card">
                                    <div className="trend-header">
                                        <h3 className="ranking-title trend-title">📈 Tendencias Históricas</h3>
                                        <div className="metric-selector">
                                            {(['revenue', 'rations', 'orders', 'clients'] as const).map(m => (
                                                <button
                                                    key={m}
                                                    className={`metric-btn ${trendMetric === m ? 'active' : ''}`}
                                                    onClick={() => setTrendMetric(m)}
                                                >
                                                    {m === 'revenue' ? 'Ingresos' : m === 'rations' ? 'Raciones' : m === 'orders' ? 'Pedidos' : 'Clientes'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <TrendChart data={stats.history[trendMetric]} periodLabel={stats.period_info.current.label} metricType={trendMetric} />
                                </div>

                                <div className="ranking-card glass-card">
                                    <h3 className="ranking-title">🏆 Top Arroces</h3>
                                    <div className="ranking-list">
                                        {stats.top_arroces.map((a: { nombre: string; rations: number; subtotal: number }, i: number) => (
                                            <div key={i} className="ranking-item">
                                                <div className="item-info">
                                                    <span className="item-name">{a.nombre}</span>
                                                    <span className="item-sub">{a.rations} raciones</span>
                                                </div>
                                                <span className="item-value">{a.subtotal.toFixed(2)}€</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            <section className="rankings-grid">
                                <div className="ranking-card glass-card">
                                    <h3 className="ranking-title">👤 Mejores Clientes</h3>
                                    <div className="ranking-list">
                                        {stats.top_clients.map((c: { nombre: string; rations: number; orders: number; spent: number }, i: number) => (
                                            <div key={i} className="ranking-item">
                                                <div className="item-info">
                                                    <span className="item-name">{c.nombre}</span>
                                                    <span className="item-sub">{c.rations} raciones · {c.orders} pedidos</span>
                                                </div>
                                                <span className="item-value">{c.spent.toFixed(2)}€</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="ranking-card glass-card">
                                    <h3 className="ranking-title">📍 Por Código Postal</h3>
                                    <div className="ranking-list">
                                        {stats.top_zipcodes.map((z: { cp: string; orders: number; revenue: number }, i: number) => (
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
                        </>
                    )}
                </div>

                {/* Panel de Gastos */}
                <div className="dashboard-page-view" style={{ minWidth: '100%', padding: '0 20px' }}>
                    {expenseStats && (
                        <>
                            <section className="stats-grid">
                                <AdminStatCard data={{ ...expenseStats.summary.total_expense, inverse: true }} />
                                <AdminStatCard data={{ ...expenseStats.summary.purchases_count, inverse: true }} />
                                <AdminStatCard data={expenseStats.summary.stock_alerts} />
                            </section>

                            <section className="rankings-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
                                <div className="ranking-card glass-card">
                                    <h3 className="ranking-title">🛒 Mayores Gastos (Ingredientes)</h3>
                                    <div className="ranking-list">
                                        {expenseStats.top_ingredients.map((ing: { nombre: string; qty: number; unit: string; spent: number }, i: number) => (
                                            <div key={i} className="ranking-item">
                                                <div className="item-info">
                                                    <span className="item-name">{ing.nombre}</span>
                                                    <span className="item-sub">{ing.qty.toFixed(1)} {ing.unit} comprados</span>
                                                </div>
                                                <span className="item-value">{ing.spent.toFixed(2)}€</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="ranking-card glass-card">
                                    <h3 className="ranking-title">🏢 Top Proveedores</h3>
                                    <div className="ranking-list">
                                        {expenseStats.top_providers.map((p: { nombre: string; count: number; spent: number }, i: number) => (
                                            <div key={i} className="ranking-item">
                                                <div className="item-info">
                                                    <span className="item-name">{p.nombre}</span>
                                                    <span className="item-sub">{p.count} facturas</span>
                                                </div>
                                                <span className="item-value">{p.spent.toFixed(2)}€</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </div>
            <div className="horizontal-scroll-hint">
                {activeTab === 'revenue' ? 'Desliza → para ver Gastos' : '← Desliza para ver Ingresos'}
            </div>
        </div>
    );
}

function TrendChart({ data, periodLabel, metricType }: { data: DashboardStats['history']['revenue'], periodLabel: string, metricType: string }) {
    // Extract base year from periodLabel (e.g. "Marzo 2026" -> 2026)
    const match = periodLabel.match(/\d{4}/);
    const baseYear = match ? parseInt(match[0], 10) : new Date().getFullYear();

    const [visible, setVisible] = useState({
        current: true,
        prev1: true,
        prev2: false,
        prev3: false
    });

    const [isCumulative, setIsCumulative] = useState(false);

    const toggleYear = (key: keyof typeof visible) => {
        setVisible(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const months = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

    const formatTooltipValue = (val: number) => {
        if (metricType === 'revenue') return `${val.toFixed(0)}€`;
        return val.toString();
    };

    // Calculate cumulative sums on the fly if toggle is active
    const processData = (arr: number[]) => {
        if (isCumulative) {
            return arr.map((_, i, a) => a.slice(0, i + 1).reduce((acc, curr) => acc + curr, 0));
        }
        return arr;
    };

    const processedData = {
        current: processData(data.current),
        prev1: processData(data.prev1),
        prev2: processData(data.prev2),
        prev3: processData(data.prev3),
    };

    // Calculate max value based ONLY on visible series + processed values
    const visibleValues = [
        ...(visible.current ? processedData.current : []),
        ...(visible.prev1 ? processedData.prev1 : []),
        ...(visible.prev2 ? processedData.prev2 : []),
        ...(visible.prev3 ? processedData.prev3 : []),
        100 // minimum floor
    ];
    const maxValue = Math.max(...visibleValues);

    const height = 180; // Reduced height to save space
    const width = 800;
    const padding = 30;

    const colorPrev1 = "rgba(52, 152, 219, 0.6)"; // Subtle blue
    const colorPrev2 = "rgba(155, 89, 182, 0.5)"; // Subtle purple
    const colorPrev3 = "rgba(26, 188, 156, 0.4)"; // Subtle teal

    const getPointsRaw = (values: number[]) => {
        return values.map((v, i) => {
            const x = padding + (i * (width - padding * 2) / 11);
            const y = height - padding - (v / (maxValue || 1) * (height - padding * 2));
            return { x, y, val: v };
        });
    };

    const getPointsPath = (points: { x: number, y: number }[]) => {
        return points.map(p => `${p.x},${p.y}`).join(' ');
    };

    const drawPoints = (points: { x: number, y: number, val: number }[], color: string, isCurrent: boolean = false) => {
        return points.map((p, i) => (
            <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={isCurrent ? "4" : "3"}
                fill={isCurrent ? "var(--bg-card)" : "var(--bg-card)"}
                stroke={color}
                strokeWidth={isCurrent ? "2" : "1.5"}
                style={{ cursor: 'pointer', transition: 'r 0.2s' }}
                onMouseEnter={(e) => (e.currentTarget.r.baseVal.value = isCurrent ? 6 : 5)}
                onMouseLeave={(e) => (e.currentTarget.r.baseVal.value = isCurrent ? 4 : 3)}
            >
                <title>{`${months[i]}: ${formatTooltipValue(p.val)}`}</title>
            </circle>
        ));
    };

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: `0 ${padding}px`, marginBottom: '8px' }}>
                <div className="chart-legend interactive-legend" style={{ gap: '16px', margin: 0 }}>
                    <div
                        className={`legend-item interactive ${visible.current ? 'active' : ''}`}
                        onClick={() => toggleYear('current')}
                    >
                        <div className="legend-color" style={{ background: visible.current ? 'var(--gold)' : 'transparent', border: '1px solid var(--gold)' }}></div>
                        {baseYear}
                    </div>
                    <div
                        className={`legend-item interactive ${visible.prev1 ? 'active' : ''}`}
                        onClick={() => toggleYear('prev1')}
                    >
                        <div className="legend-color" style={{ background: visible.prev1 ? colorPrev1 : 'transparent', border: `1px solid ${colorPrev1}` }}></div>
                        {baseYear - 1}
                    </div>
                    <div
                        className={`legend-item interactive ${visible.prev2 ? 'active' : ''}`}
                        onClick={() => toggleYear('prev2')}
                    >
                        <div className="legend-color" style={{ background: visible.prev2 ? colorPrev2 : 'transparent', border: `1px solid ${colorPrev2}` }}></div>
                        {baseYear - 2}
                    </div>
                    <div
                        className={`legend-item interactive ${visible.prev3 ? 'active' : ''}`}
                        onClick={() => toggleYear('prev3')}
                    >
                        <div className="legend-color" style={{ background: visible.prev3 ? colorPrev3 : 'transparent', border: `1px solid ${colorPrev3}` }}></div>
                        {baseYear - 3}
                    </div>

                    {/* Cumulative Toggle */}
                    <div className="cumulative-toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <span>Acumulado (YTD)</span>
                        <button
                            className={`mode-btn ${isCumulative ? 'active' : ''}`}
                            onClick={() => setIsCumulative(!isCumulative)}
                            style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                        >
                            {isCumulative ? 'ON' : 'OFF'}
                        </button>
                    </div>
                </div>
            </div>

            <svg viewBox={`0 0 ${width} ${height}`} className="svg-chart">
                {/* Grid lines */}
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" />

                {/* Previous years lines */}
                {visible.prev3 && <polyline points={getPointsPath(getPointsRaw(processedData.prev3))} fill="none" stroke={colorPrev3} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
                {visible.prev2 && <polyline points={getPointsPath(getPointsRaw(processedData.prev2))} fill="none" stroke={colorPrev2} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
                {visible.prev1 && <polyline points={getPointsPath(getPointsRaw(processedData.prev1))} fill="none" stroke={colorPrev1} strokeWidth="2" strokeDasharray="4" strokeLinecap="round" strokeLinejoin="round" />}

                {/* Current year (gold line) */}
                {visible.current && (
                    <>
                        <polyline points={getPointsPath(getPointsRaw(processedData.current))} fill="none" stroke="var(--gold)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                        {/* Area under current line */}
                        <path
                            d={`M ${padding},${height - padding} ${getPointsPath(getPointsRaw(processedData.current))} L ${width - padding},${height - padding} Z`}
                            fill="url(#gradient-gold)"
                            style={{ opacity: 0.15 }}
                        />
                    </>
                )}

                {/* Data Points (Rendered last so they are on top) */}
                {visible.prev3 && drawPoints(getPointsRaw(processedData.prev3), colorPrev3)}
                {visible.prev2 && drawPoints(getPointsRaw(processedData.prev2), colorPrev2)}
                {visible.prev1 && drawPoints(getPointsRaw(processedData.prev1), colorPrev1)}
                {visible.current && drawPoints(getPointsRaw(processedData.current), 'var(--gold)', true)}

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
        </div>
    );
}
