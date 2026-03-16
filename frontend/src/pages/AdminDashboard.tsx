import { useState, useEffect, useCallback } from 'react';
import { getDashboardStats, getExpenseStats, type DashboardStats, type ExpenseStats } from '../api/stats';
import { getClientStats, getAnalysisDashboard } from '../api/clientes';
import { AdminStatCard, type StatInfo } from '../components/Stats/AdminStatCard';
import { SectionInfoBtn } from '../components/Stats/SectionInfoBtn';
import { MapaPage } from './MapaPage';
import './AdminDashboard.css';

export function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<'revenue' | 'expenses' | 'clients'>('revenue');
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [expenseStats, setExpenseStats] = useState<ExpenseStats | null>(null);
    const [clientStats, setClientStats] = useState<any>(null);
    const [clientAnalysis, setClientAnalysis] = useState<any>(null);
    const [period, setPeriod] = useState('quarter');
    const [mode, setMode] = useState<'full' | 'mtd'>('full');
    const [loading, setLoading] = useState(true);
    const [loadingClients, setLoadingClients] = useState(false);
    const [trendMetric, setTrendMetric] = useState<'revenue' | 'rations' | 'orders' | 'clients'>('revenue');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [mapSegment, setMapSegment] = useState<string>('todos');

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

    const loadClientData = useCallback(async () => {
        if (period === 'custom' && (!customStart || !customEnd)) return;
        setLoadingClients(true);
        try {
            const sd = period === 'custom' ? customStart : undefined;
            const ed = period === 'custom' ? customEnd : undefined;
            const [cStats, cAnalysis] = await Promise.all([
                getClientStats(period, sd, ed),
                getAnalysisDashboard(period, sd, ed)
            ]);
            setClientStats(cStats);
            setClientAnalysis(cAnalysis);
        } catch (err) {
            console.error('Error loading client stats:', err);
        } finally {
            setLoadingClients(false);
        }
    }, [period, customStart, customEnd]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    useEffect(() => {
        if (activeTab === 'clients') {
            loadClientData();
            setMapSegment('todos');
        }
    }, [activeTab, loadClientData]);

    if (loading && !stats) return <div className="loading-screen">Cargando análisis...</div>;

    const clientPeriodOptions = ['month', 'quarter', 'semester', 'ytd', 'all', 'custom'] as const;
    const clientPeriodLabels: Record<string, string> = {
        month: 'Mes', quarter: 'Trimestre', semester: 'Semestre', ytd: 'Año', all: 'Histórico', custom: 'Fechas'
    };

    const statInfoMap: Record<string, StatInfo> = {
        // Revenue tab
        revenue: {
            description: 'Importe total facturado por todos los pedidos completados en el periodo seleccionado.',
            calculation: 'Suma de (raciones × precio unitario) de cada línea de pedido no cancelado dentro del rango de fechas. Se compara con el mismo periodo del año anterior.',
            example: 'Si muestra 12.500€ con +15%, significa que se ha facturado 12.500€ en este periodo, un 15% más que en el mismo periodo del año pasado.'
        },
        rations: {
            description: 'Número total de raciones servidas en pedidos no cancelados durante el periodo.',
            calculation: 'Suma del campo PAX de todos los pedidos válidos (no cancelados ni eliminados) en el rango de fechas.',
            example: 'Si muestra 840 raciones con -5%, se han servido 840 raciones, un 5% menos que en el periodo equivalente del año anterior.'
        },
        orders: {
            description: 'Cantidad de pedidos únicos registrados en el periodo, excluyendo cancelados.',
            calculation: 'Recuento de pedidos distintos con estado diferente a "cancelado" dentro del rango de fechas.',
            example: 'Si muestra 95 pedidos con +20%, ha habido 95 pedidos este periodo frente a unos 79 en el mismo periodo del año pasado.'
        },
        avg_ticket: {
            description: 'Importe medio por pedido, indicador del gasto promedio de cada encargo.',
            calculation: 'Facturación total del periodo dividida entre el número de pedidos. Se compara interanualmente.',
            example: 'Si muestra 131€ con +8%, el cliente medio gasta 131€ por pedido, 8% más que antes. Un ticket medio alto puede indicar pedidos más grandes o precios ajustados.'
        },
        // Expenses tab
        total_expense: {
            description: 'Gasto total en compras de ingredientes y materias primas durante el periodo.',
            calculation: 'Suma de los totales de todas las facturas de compra registradas en el rango de fechas.',
            example: 'Si muestra 3.200€ con +10%, el gasto en compras ha sido de 3.200€, un 10% más que el año pasado. Al ser un gasto, que suba se muestra en rojo.'
        },
        purchases_count: {
            description: 'Número de facturas o albaranes de compra registrados en el periodo.',
            calculation: 'Recuento de compras distintas dentro del rango de fechas.',
            example: 'Si muestra 18 facturas con -2%, se han registrado 18 compras, prácticamente igual que el año anterior.'
        },
        stock_alerts: {
            description: 'Ingredientes cuyo stock actual está por debajo del mínimo configurado.',
            calculation: 'Recuento de ingredientes donde stock_actual ≤ stock_mínimo. No depende del periodo, es el estado actual.',
            example: 'Si muestra 3, hay 3 ingredientes que necesitan reposición urgente. Revisa la página de Stock para ver cuáles son.'
        },
        // Clients tab
        total_clients: {
            description: 'Clientes únicos que han realizado al menos un pedido en el periodo seleccionado.',
            calculation: 'Recuento de IDs de cliente distintos en pedidos no cancelados dentro del rango de fechas. Se compara con el mismo periodo del año anterior.',
            example: 'Si muestra 42 con +10%, significa que 42 clientes distintos han hecho pedidos este periodo, un 10% más que el año pasado.'
        },
        dormant_clients: {
            description: 'Clientes que pidieron en el periodo pero llevan más de 12 semanas sin hacerlo. Son clientes que estuvieron activos pero se han "dormido".',
            calculation: 'Dentro de los clientes con pedidos en el periodo, se busca aquellos cuyo último pedido fue hace más de 12 semanas respecto al final del periodo. Se compara con el mismo cálculo del año anterior.',
            example: 'Si muestra 15 con +25%, hay 15 clientes dormidos, un 25% más que el año pasado. Es una señal de alerta: conviene contactarlos para reactivarlos antes de perderlos definitivamente.'
        },
        churn_clients: {
            description: 'Clientes que pidieron en el mismo periodo del año anterior pero no han hecho ningún pedido en el periodo actual.',
            calculation: 'Se comparan los clientes con pedidos en el periodo equivalente del año pasado con los del periodo actual. Los que estaban antes y ya no están se cuentan como perdidos. Coincide con el valor de "Perdidos" en Movimiento de Cartera.',
            example: 'Si muestra 5 con +50%, hay 5 clientes perdidos respecto al año pasado, un 50% más que la comparación anterior. Al ser negativo, que suba se muestra en rojo. Conviene contactarlos.'
        },
        power_users: {
            description: 'Clientes "VIP" cuyo número de pedidos supera la media del periodo.',
            calculation: 'Se calcula la media de pedidos por cliente en el periodo. Los clientes que superan esa media se consideran VIP.',
            example: 'Si muestra 12, hay 12 clientes que piden más que la media. Son los más fieles y conviene cuidarlos especialmente.'
        },
        // Sections — Clients tab
        segments: {
            description: 'Clasifica a los clientes según su actividad reciente dentro del periodo seleccionado.',
            calculation: 'Se busca el último pedido de cada cliente en el periodo. Activo: pidió hace <4 semanas. Riesgo: 4-8 semanas. Inactivo: 8-12 semanas. Dormido: >12 semanas sin pedir.',
            example: 'Si hay 20 activos, 5 en riesgo y 3 dormidos, la cartera está sana pero conviene contactar a los 5 en riesgo antes de que pasen a dormidos.'
        },
        cohorts: {
            description: 'Compara la cartera de clientes del periodo actual con el periodo anterior para detectar movimientos.',
            calculation: 'Nuevos: pidieron ahora pero no antes. Perdidos: pidieron antes pero no ahora. Creciendo: repiten y piden más raciones. Bajando: repiten pero piden menos.',
            example: 'Si hay 8 nuevos y 3 perdidos, la cartera crece en neto (+5). Si hay 4 bajando, hay que investigar por qué reducen volumen.'
        },
        suggestions: {
            description: 'Recomendaciones automáticas generadas a partir de los datos de segmentación y cohortes.',
            calculation: 'Se analizan los indicadores: si hay clientes perdidos se sugiere campaña de recuperación, si hay clientes bajando se alerta sobre calidad, si hay clientes en riesgo se propone reactivación.',
            example: 'Una sugerencia "Recuperación de Clientes" con impacto Crítico y 5 perdidos indica que deberías contactarlos con una oferta o encuesta de satisfacción.'
        },
        cp_patterns: {
            description: 'Muestra qué arroces son más populares en cada código postal dentro del periodo.',
            calculation: 'Se agrupan los pedidos por código postal del cliente y arroz, sumando raciones. Se muestran los 3 arroces más pedidos por cada zona.',
            example: 'Si CP 46001 muestra "Paella Mixta (120)", significa que en esa zona se han pedido 120 raciones de paella mixta en el periodo. Útil para campañas localizadas.'
        },
        top_clients_section: {
            description: 'Ranking de clientes ordenados por importe total gastado en el periodo.',
            calculation: 'Se suman las líneas de pedido (raciones × precio) de cada cliente en el periodo y se ordenan de mayor a menor gasto.',
            example: 'El primer cliente de la lista es quien más ha gastado. Muestra también sus raciones y número de pedidos para entender si es un cliente de volumen o de frecuencia.'
        },
        // Sections — Revenue tab
        trends: {
            description: 'Gráfico comparativo que muestra la evolución mensual de la métrica seleccionada a lo largo de varios años.',
            calculation: 'Se agrupa por mes y año la métrica elegida (ingresos, raciones, pedidos o clientes únicos). Cada línea representa un año. El toggle "Acumulado" suma los valores progresivamente.',
            example: 'Si la línea dorada (año actual) está por encima de la azul (año anterior) en los mismos meses, el negocio está creciendo. El modo acumulado permite comparar el ritmo anual.'
        },
        top_arroces: {
            description: 'Ranking de los arroces más vendidos por raciones en el periodo seleccionado.',
            calculation: 'Se suman las raciones (PAX) de cada arroz en pedidos no cancelados del periodo, y se muestran los 5 con más raciones junto a su facturación.',
            example: 'Si "Paella Valenciana" lidera con 250 raciones y 3.125€, es el producto estrella. Si un arroz tiene muchas raciones pero poca facturación, su precio puede ser bajo.'
        },
        top_clients_revenue: {
            description: 'Ranking de los 5 clientes que más han gastado en el periodo.',
            calculation: 'Se suman las líneas de pedido de cada cliente (raciones × precio unitario) y se ordenan por importe total descendente.',
            example: 'Si un cliente aparece con 15 pedidos y 2.800€, es un cliente de alta frecuencia y alto valor. Conviene fidelizarlo con atención especial.'
        },
        top_zipcodes: {
            description: 'Zonas geográficas con más pedidos en el periodo, agrupadas por código postal.',
            calculation: 'Se cuentan los pedidos por código postal del cliente y se suman sus importes. Se muestran los 5 CPs con más actividad.',
            example: 'Si CP 46005 tiene 30 pedidos por 4.200€, es la zona más activa. Puede justificar repartidores dedicados o promociones específicas para esa área.'
        },
        // Sections — Expenses tab
        top_ingredients: {
            description: 'Ingredientes en los que más se ha gastado durante el periodo.',
            calculation: 'Se suman las líneas de compra (cantidad × precio unitario) de cada ingrediente en las facturas del periodo, ordenadas por gasto total.',
            example: 'Si "Arroz Bomba" lidera con 150kg y 450€, es el ingrediente de mayor coste. Comparar con periodos anteriores ayuda a detectar subidas de precio.'
        },
        top_providers: {
            description: 'Proveedores a los que más se ha comprado en el periodo.',
            calculation: 'Se suman los totales de las facturas de compra agrupadas por proveedor, ordenados por importe descendente.',
            example: 'Si un proveedor tiene 8 facturas por 1.200€, es el principal suministrador. Útil para negociar descuentos por volumen o diversificar proveedores.'
        },
        map_section: {
            description: 'Mapa interactivo con la ubicación de los clientes que han hecho pedidos.',
            calculation: 'Se geolocalizan los clientes usando su dirección o código postal y se representan como marcadores. El tamaño o color puede indicar volumen de pedidos.',
            example: 'Las zonas con más concentración de marcadores indican dónde está la mayor demanda. Útil para planificar rutas de reparto y detectar zonas sin explotar.'
        }
    };

    // Compute filterClientIds for map based on selected segment
    type MapFilter = { key: string; label: string; color: string; source: 'segment' | 'cohort' | 'vip' };

    const mapFilterOptions: MapFilter[] = [
        { key: 'todos', label: 'Todos', color: 'var(--text-muted)', source: 'segment' },
        { key: 'active', label: `Activos (${clientAnalysis?.segments?.active ?? 0})`, color: '#2ecc71', source: 'segment' },
        { key: 'at_risk', label: `Riesgo (${clientAnalysis?.segments?.at_risk ?? 0})`, color: '#f1c40f', source: 'segment' },
        { key: 'inactive', label: `Inactivos (${clientAnalysis?.segments?.inactive ?? 0})`, color: '#e67e22', source: 'segment' },
        { key: 'churned', label: `Dormidos (${clientAnalysis?.segments?.churned ?? 0})`, color: '#e74c3c', source: 'segment' },
        { key: 'new', label: `Nuevos (${clientAnalysis?.cohorts?.new ?? 0})`, color: '#3498db', source: 'cohort' },
        { key: 'lost', label: `Perdidos (${clientAnalysis?.cohorts?.lost ?? 0})`, color: '#c0392b', source: 'cohort' },
        { key: 'grown', label: `Creciendo (${clientAnalysis?.cohorts?.grown ?? 0})`, color: '#1abc9c', source: 'cohort' },
        { key: 'decreased', label: `Bajando (${clientAnalysis?.cohorts?.decreased ?? 0})`, color: '#e67e22', source: 'cohort' },
        { key: 'vip', label: `VIP (${clientStats?.power_users?.value ?? 0})`, color: '#D4AF37', source: 'vip' },
    ];

    const activeFilter = mapFilterOptions.find(f => f.key === mapSegment);

    const mapFilterIds = (() => {
        if (mapSegment === 'todos') return null;
        if (activeFilter?.source === 'segment') return clientAnalysis?.segment_ids?.[mapSegment] as number[] ?? null;
        if (activeFilter?.source === 'cohort') return clientAnalysis?.cohort_ids?.[mapSegment] as number[] ?? null;
        if (mapSegment === 'vip') return clientStats?.vip_ids as number[] ?? null;
        return null;
    })();

    return (
        <div className={`admin-dashboard${activeTab === 'clients' ? ' clients-mode' : ''}`}>
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
                        <button
                            className={`nav-tab ${activeTab === 'clients' ? 'active' : ''}`}
                            onClick={() => setActiveTab('clients')}
                        >
                            Clientes
                        </button>
                    </div>
                    {activeTab !== 'clients' && stats && (
                        <div className="comparison-label">
                            <span className="current-period">{stats.period_info.current.label}</span>
                            <span className="vs">vs</span>
                            <span className="prev-period">{stats.period_info.previous.label}</span>
                        </div>
                    )}
                </div>
                <div className="dashboard-controls">
                    <div className="period-filters">
                        {(activeTab === 'clients' ? clientPeriodOptions : ['week', 'month', 'quarter', 'semester', 'ytd']).map((p) => (
                            <button
                                key={p}
                                className={period === p ? 'active' : ''}
                                onClick={() => setPeriod(p)}
                            >
                                {activeTab === 'clients'
                                    ? clientPeriodLabels[p]
                                    : (p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : p === 'quarter' ? 'Trimestre' : p === 'semester' ? 'Semestre' : 'Año Actual')
                                }
                            </button>
                        ))}
                    </div>

                    {activeTab === 'clients' && period === 'custom' && (
                        <div className="custom-date-range">
                            <input
                                type="date"
                                value={customStart}
                                onChange={e => setCustomStart(e.target.value)}
                                className="date-input"
                            />
                            <span className="date-separator">—</span>
                            <input
                                type="date"
                                value={customEnd}
                                onChange={e => setCustomEnd(e.target.value)}
                                className="date-input"
                            />
                        </div>
                    )}

                    {activeTab !== 'clients' && (
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
                    )}
                </div>
            </header>

            {/* Panel de Clientes */}
            {activeTab === 'clients' && (
                <div className="dashboard-panel">
                    {loadingClients && !clientStats ? (
                        <div className="loading-screen">Cargando análisis de clientes...</div>
                    ) : (
                        <>
                            {clientStats && (
                                <section className="stats-grid">
                                    <AdminStatCard data={clientStats.total_clients} info={statInfoMap.total_clients} />
                                    <AdminStatCard data={{
                                        value: clientAnalysis?.segments?.churned ?? clientStats.dormant_clients.value,
                                        growth: clientStats.dormant_clients.growth,
                                        label: 'Clientes dormidos',
                                        sublabel: clientStats.dormant_clients.sublabel,
                                        inverse: true
                                    }} info={statInfoMap.dormant_clients} />
                                    <AdminStatCard data={{
                                        value: clientAnalysis?.cohorts?.lost ?? clientStats.churn_clients.value,
                                        growth: clientStats.churn_clients.growth,
                                        label: 'Clientes perdidos',
                                        sublabel: clientStats.churn_clients.sublabel,
                                        inverse: true
                                    }} info={statInfoMap.churn_clients} />
                                    <AdminStatCard data={clientStats.power_users} info={statInfoMap.power_users} />
                                </section>
                            )}

                            {clientAnalysis && (
                                <>
                                    <section className="client-segments-section">
                                        <div className="ranking-card glass-card">
                                            <h3 className="ranking-title">📊 Segmentación de Cartera <SectionInfoBtn info={statInfoMap.segments} title="Segmentación de Cartera" /></h3>
                                            <div className="segment-bar">
                                                {(() => {
                                                    const s = clientAnalysis.segments;
                                                    const total = s.active + s.at_risk + s.inactive + s.churned || 1;
                                                    return (
                                                        <>
                                                            <div style={{ width: `${(s.active / total) * 100}%`, background: '#2ecc71' }} />
                                                            <div style={{ width: `${(s.at_risk / total) * 100}%`, background: '#f1c40f' }} />
                                                            <div style={{ width: `${(s.inactive / total) * 100}%`, background: '#e67e22' }} />
                                                            <div style={{ width: `${(s.churned / total) * 100}%`, background: '#e74c3c' }} />
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                            <div className="segment-legend">
                                                <span><span className="legend-dot" style={{ background: '#2ecc71' }} /> Activos ({clientAnalysis.segments.active})</span>
                                                <span><span className="legend-dot" style={{ background: '#f1c40f' }} /> Riesgo ({clientAnalysis.segments.at_risk})</span>
                                                <span><span className="legend-dot" style={{ background: '#e67e22' }} /> Inactivos ({clientAnalysis.segments.inactive})</span>
                                                <span><span className="legend-dot" style={{ background: '#e74c3c' }} /> Dormidos ({clientAnalysis.segments.churned})</span>
                                            </div>
                                        </div>
                                    </section>

                                    {clientAnalysis.cohorts && (
                                        <section className="cohort-section">
                                            <h3 className="ranking-title">🔄 Movimiento de Cartera <SectionInfoBtn info={statInfoMap.cohorts} title="Movimiento de Cartera" /></h3>
                                            <div className="cohort-grid">
                                                <div className="cohort-card glass-card new">
                                                    <span className="cohort-label">Nuevos</span>
                                                    <span className="cohort-value">{clientAnalysis.cohorts.new}</span>
                                                    <span className="cohort-desc">Primer pedido en este periodo</span>
                                                </div>
                                                <div className="cohort-card glass-card lost">
                                                    <span className="cohort-label">Perdidos</span>
                                                    <span className="cohort-value">{clientAnalysis.cohorts.lost}</span>
                                                    <span className="cohort-desc">No han vuelto desde el anterior</span>
                                                </div>
                                                <div className="cohort-card glass-card grown">
                                                    <span className="cohort-label">Creciendo</span>
                                                    <span className="cohort-value">{clientAnalysis.cohorts.grown}</span>
                                                    <span className="cohort-desc">Han subido su volumen</span>
                                                </div>
                                                <div className="cohort-card glass-card decreased">
                                                    <span className="cohort-label">Bajando</span>
                                                    <span className="cohort-value">{clientAnalysis.cohorts.decreased}</span>
                                                    <span className="cohort-desc">Han bajado su volumen</span>
                                                </div>
                                            </div>
                                        </section>
                                    )}

                                    {clientAnalysis.suggestions && clientAnalysis.suggestions.length > 0 && (
                                        <section className="suggestions-section">
                                            <h3 className="ranking-title">💡 Recomendaciones <SectionInfoBtn info={statInfoMap.suggestions} title="Recomendaciones" /></h3>
                                            <div className="suggestions-grid">
                                                {clientAnalysis.suggestions.map((s: any, i: number) => (
                                                    <div key={i} className="suggestion-card glass-card">
                                                        <div className={`suggestion-impact impact-${s.impact === 'Crítico' ? 'critical' : 'high'}`}>
                                                            {s.impact}
                                                        </div>
                                                        <h4>{s.title}</h4>
                                                        <p>{s.description}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    <section className="client-rankings-section">
                                        <div className="rankings-grid">
                                            <div className="ranking-card glass-card">
                                                <h3 className="ranking-title">📍 Patrones por Código Postal <SectionInfoBtn info={statInfoMap.cp_patterns} title="Patrones por Código Postal" /></h3>
                                                <div className="ranking-list cp-patterns-list">
                                                    {Object.entries(clientAnalysis.patterns || {}).slice(0, 8).map(([cp, arroces]: [string, any]) => (
                                                        <div key={cp} className="cp-row">
                                                            <span className="cp-badge">CP {cp}</span>
                                                            <div className="cp-arroces">
                                                                {arroces.map((a: any, j: number) => (
                                                                    <span key={j} className="rice-mini-tag">{a.arroz} ({a.rations})</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {stats && (
                                                <div className="ranking-card glass-card">
                                                    <h3 className="ranking-title">👤 Mejores Clientes <SectionInfoBtn info={statInfoMap.top_clients_section} title="Mejores Clientes" /></h3>
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
                                            )}
                                        </div>
                                    </section>
                                </>
                            )}

                            <section className="map-section">
                                <h3 className="section-title-gold">🗺️ Distribución Geográfica <SectionInfoBtn info={statInfoMap.map_section} title="Distribución Geográfica" /></h3>
                                <div className="map-segment-filters">
                                    {mapFilterOptions.map(f => (
                                        <button
                                            key={f.key}
                                            className={`map-segment-btn ${mapSegment === f.key ? 'active' : ''}`}
                                            style={{
                                                '--seg-color': f.color,
                                                borderColor: mapSegment === f.key ? f.color : undefined,
                                            } as React.CSSProperties}
                                            onClick={() => setMapSegment(f.key)}
                                        >
                                            <span className="map-seg-dot" style={{ background: f.color }} />
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="map-panel">
                                    <MapaPage
                                        filterClientIds={mapFilterIds}
                                        filterColor={activeFilter?.color}
                                        filterLabel={activeFilter?.label}
                                    />
                                </div>
                            </section>
                        </>
                    )}
                </div>
            )}

            {/* Panel de Ingresos */}
            {activeTab === 'revenue' && stats && (
                <div className="dashboard-panel">
                    <section className="stats-grid">
                        <AdminStatCard data={stats.summary.revenue} info={statInfoMap.revenue} />
                        <AdminStatCard data={stats.summary.rations} info={statInfoMap.rations} />
                        <AdminStatCard data={stats.summary.orders} info={statInfoMap.orders} />
                        <AdminStatCard data={stats.summary.avg_ticket} info={statInfoMap.avg_ticket} />
                    </section>

                    <section className="charts-section">
                        <div className="ranking-card glass-card trend-card">
                            <div className="trend-header">
                                <h3 className="ranking-title trend-title">📈 Tendencias Históricas <SectionInfoBtn info={statInfoMap.trends} title="Tendencias Históricas" /></h3>
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
                            <h3 className="ranking-title">🏆 Top Arroces <SectionInfoBtn info={statInfoMap.top_arroces} title="Top Arroces" /></h3>
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
                            <h3 className="ranking-title">👤 Mejores Clientes <SectionInfoBtn info={statInfoMap.top_clients_revenue} title="Mejores Clientes" /></h3>
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
                            <h3 className="ranking-title">📍 Por Código Postal <SectionInfoBtn info={statInfoMap.top_zipcodes} title="Por Código Postal" /></h3>
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
                </div>
            )}

            {/* Panel de Gastos */}
            {activeTab === 'expenses' && expenseStats && (
                <div className="dashboard-panel">
                    <section className="stats-grid">
                        <AdminStatCard data={{ ...expenseStats.summary.total_expense, inverse: true }} info={statInfoMap.total_expense} />
                        <AdminStatCard data={{ ...expenseStats.summary.purchases_count, inverse: true }} info={statInfoMap.purchases_count} />
                        <AdminStatCard data={expenseStats.summary.stock_alerts} info={statInfoMap.stock_alerts} />
                    </section>

                    <section className="rankings-grid">
                        <div className="ranking-card glass-card">
                            <h3 className="ranking-title">🛒 Mayores Gastos (Ingredientes) <SectionInfoBtn info={statInfoMap.top_ingredients} title="Mayores Gastos (Ingredientes)" /></h3>
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
                            <h3 className="ranking-title">🏢 Top Proveedores <SectionInfoBtn info={statInfoMap.top_providers} title="Top Proveedores" /></h3>
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
                </div>
            )}
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
