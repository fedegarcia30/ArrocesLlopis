import { useState } from 'react';
import './AdminStatCard.css';

interface StatData {
    value: number;
    growth: number;
    label: string;
    sublabel: string;
    inverse?: boolean;
    sparkline?: number[];
}

export interface StatInfo {
    description: string;
    calculation: string;
    example: string;
}

interface AdminStatCardProps {
    data: StatData;
    periodLabel?: string;
    info?: StatInfo;
}

export function AdminStatCard({ data, periodLabel, info }: AdminStatCardProps) {
    const { value, growth, label, inverse, sparkline } = data;
    const [showInfo, setShowInfo] = useState(false);

    const isPositive = growth > 0;
    const isNeutral = growth === 0;

    let colorClass = '';
    let statusIcon = '';

    if (!isNeutral) {
        const isActuallyGood = inverse ? !isPositive : isPositive;
        colorClass = isActuallyGood ? 'stat-green' : 'stat-red';
        statusIcon = isActuallyGood ? '⬆' : '⬇';
    }

    const growthFormatted = `${Math.abs(growth)}%`;

    // Sparkline SVG logic
    const renderSparkline = () => {
        if (!sparkline || sparkline.length < 2) return null;
        const max = Math.max(...sparkline, 1);
        const min = Math.min(...sparkline);
        const range = max - min || 1;
        const width = 100;
        const height = 40;
        const padding = 2;

        const points = sparkline.map((v, i) => {
            const x = (i / (sparkline.length - 1)) * width;
            const y = height - padding - ((v - min) / range) * (height - padding * 2);
            return `${x},${y}`;
        }).join(' ');

        // Close the polygon for the area chart
        const areaPoints = `0,${height} ` + points + ` ${width},${height}`;

        return (
            <div className="stat-sparkline-bg">
                <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="sparkline-svg">
                    <polygon
                        points={areaPoints}
                        fill="currentColor"
                        opacity="0.1"
                    />
                    <polyline
                        points={points}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeOpacity="0.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
        );
    };

    return (
        <>
            <div className={`stat-card glass-card ${colorClass}`}>
                {renderSparkline()}
                {info && (
                    <button
                        className="stat-info-btn"
                        onClick={(e) => { e.stopPropagation(); setShowInfo(true); }}
                        title="Ver explicación"
                    >
                        i
                    </button>
                )}
                <div className="stat-content">
                    <div className="stat-info">
                        <div className="stat-label">{periodLabel || label}</div>
                        <div className="stat-value">
                            {typeof value === 'number' && !label.includes('Ticket')
                                ? value.toLocaleString()
                                : value}
                            {label.includes('Facturación') || label.includes('Ticket') ? '€' : ''}
                        </div>
                    </div>
                    <div className="stat-growth">
                        {!isNeutral && (
                            <div className="growth-pill">
                                <span className="growth-icon">{statusIcon}</span>
                                <span className="growth-text">{growthFormatted}</span>
                            </div>
                        )}
                        {label !== (periodLabel || label) && <span className="growth-subtext">{label}</span>}
                    </div>
                </div>
            </div>

            {showInfo && info && (
                <div className="stat-info-overlay" onClick={() => setShowInfo(false)}>
                    <div className="stat-info-modal glass-card" onClick={e => e.stopPropagation()}>
                        <header className="stat-info-modal-header">
                            <h3>{label}</h3>
                            <button className="stat-info-modal-close" onClick={() => setShowInfo(false)}>&times;</button>
                        </header>
                        <div className="stat-info-modal-body">
                            <div className="stat-info-section">
                                <span className="stat-info-section-icon">?</span>
                                <div>
                                    <h4>Qué mide</h4>
                                    <p>{info.description}</p>
                                </div>
                            </div>
                            <div className="stat-info-section">
                                <span className="stat-info-section-icon">=</span>
                                <div>
                                    <h4>Cómo se calcula</h4>
                                    <p>{info.calculation}</p>
                                </div>
                            </div>
                            <div className="stat-info-section">
                                <span className="stat-info-section-icon">!</span>
                                <div>
                                    <h4>Cómo interpretarlo</h4>
                                    <p>{info.example}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
