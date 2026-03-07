import './AdminStatCard.css';

interface StatData {
    value: number;
    growth: number;
    label: string;
    sublabel: string;
    inverse?: boolean;
    sparkline?: number[];
}

interface AdminStatCardProps {
    data: StatData;
    periodLabel?: string;
}

export function AdminStatCard({ data, periodLabel }: AdminStatCardProps) {
    const { value, growth, label, inverse, sparkline } = data;

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
        <div className={`stat-card glass-card ${colorClass}`}>
            {renderSparkline()}
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
                    <span className="growth-subtext">{label}</span>
                </div>
            </div>
        </div>
    );
}
