import { useState, useEffect } from 'react';
import { getClientWeeklyStats, getClientFullHistory } from '../../api/clientes';
import type { Cliente } from '../../types';

interface ClientAnalysisModalProps {
    client: Cliente;
    onClose: () => void;
}

export function ClientAnalysisModal({ client, onClose }: ClientAnalysisModalProps) {
    const [view, setView] = useState<'weekly' | 'monthly'>('weekly');
    const [weeklyData, setWeeklyData] = useState<any[]>([]);
    const [fullHistory, setFullHistory] = useState<{ monthly: any[], recent_orders: any[] } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const [weekly, full] = await Promise.all([
                    getClientWeeklyStats(client.id),
                    getClientFullHistory(client.id)
                ]);
                setWeeklyData(weekly);
                setFullHistory(full);
            } catch (err) {
                console.error('Error loading client analysis:', err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [client.id]);

    const activeData = view === 'weekly' ? weeklyData : (fullHistory?.monthly || []);
    const maxValue = Math.max(...activeData.map(d => d.orders_count), 5);
    const height = 150;
    const width = 450;
    const padding = 35;
    const barWidth = (width - padding * 2) / Math.max(activeData.length, 1) * 0.6;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass-card client-analysis-expanded" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <div className="header-brand">
                        <span className="brand-dot"></span>
                        <h2 className="modal-title">Análisis Premium: {client.nombre}</h2>
                    </div>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </header>

                <div className="modal-body analysis-body-scroll">
                    {loading ? (
                        <div className="loading-screen">Analizando historial...</div>
                    ) : (
                        <>
                            <div className="view-toggle-container">
                                <div className="toggle-box glass-card">
                                    <button 
                                        className={`toggle-btn ${view === 'monthly' ? 'active' : ''}`}
                                        onClick={() => setView('monthly')}
                                    >
                                        Vista Mensual
                                    </button>
                                    <button 
                                        className={`toggle-btn ${view === 'weekly' ? 'active' : ''}`}
                                        onClick={() => setView('weekly')}
                                    >
                                        Vista Semanal
                                    </button>
                                </div>
                            </div>

                            <div className="analysis-chart-section glass-card">
                                <h3 className="section-subtitle">
                                    {view === 'monthly' ? 'Pedidos por Mes' : 'Pedidos por Semana' }
                                </h3>
                                
                                {activeData.length === 0 ? (
                                    <div className="empty-chart">Sin datos suficientes para mostrar pedidos</div>
                                ) : (
                                    <svg viewBox={`0 0 ${width} ${height}`} className="premium-svg-chart">
                                        <defs>
                                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="var(--gold-primary)" stopOpacity="0.8" />
                                                <stop offset="100%" stopColor="var(--gold-primary)" stopOpacity="0.2" />
                                            </linearGradient>
                                        </defs>

                                        {/* Y-Axis lines */}
                                        {[0, 0.5, 1].map(p => {
                                            const y = height - padding - (p * (height - padding * 2));
                                            return (
                                                <line key={p} x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
                                            );
                                        })}

                                        {activeData.map((d, i) => {
                                            const x = padding + (i * (width - padding * 2) / Math.max(activeData.length - 1, 1));
                                            const barHeight = (d.orders_count / maxValue * (height - padding * 2));
                                            const y = height - padding - barHeight;
                                            
                                            return (
                                                <g key={i} className="chart-bar-group">
                                                    <rect 
                                                        x={x - barWidth / 2} 
                                                        y={y} 
                                                        width={barWidth} 
                                                        height={barHeight} 
                                                        fill="url(#barGradient)" 
                                                        rx="4"
                                                        className="chart-bar"
                                                    >
                                                        <title>{d.label}: {d.orders_count} pedidos</title>
                                                    </rect>
                                                    <text x={x} y={height - 10} textAnchor="middle" fontSize="9" fill="var(--text-dim)" fontWeight="700">{d.label}</text>
                                                    <text x={x} y={y - 5} textAnchor="middle" fontSize="10" fill="var(--gold-primary)" fontWeight="800">{d.orders_count}</text>
                                                </g>
                                            );
                                        })}
                                    </svg>
                                )}
                            </div>

                            <div className="orders-detail-section">
                                <h3 className="section-subtitle">Historial de Pedidos Detallado</h3>
                                <div className="orders-list-premium">
                                    {(fullHistory?.recent_orders || []).map(order => (
                                        <div key={order.id} className="order-item-glass glass-card">
                                            <div className="order-meta">
                                                <span className="order-date">{new Date(order.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                <span className={`order-type-badge ${order.tipo.toLowerCase()}`}>{order.tipo}</span>
                                            </div>
                                            <div className="order-content">
                                                <div className="order-items-scroll">
                                                    {order.items.map((it: any, idx: number) => (
                                                        <span key={idx} className="rice-tag">
                                                            {it.nombre} <b style={{ color: 'var(--gold-primary)' }}>x{it.pax}</b>
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="order-rations-total">
                                                    <span className="pax-total-pill">{order.pax} raciones</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="modal-actions-premium">
                    <button className="btn-premium-close" onClick={onClose}>Finalizar Consulta</button>
                </div>
            </div>
        </div>
    );
}
