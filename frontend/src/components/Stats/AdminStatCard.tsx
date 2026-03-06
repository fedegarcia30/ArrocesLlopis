import './AdminStatCard.css';

interface StatData {
    value: number;
    growth: number;
    label: string;
    sublabel: string;
    inverse?: boolean;
}

interface AdminStatCardProps {
    data: StatData;
}

export function AdminStatCard({ data }: AdminStatCardProps) {
    const { value, growth, label, sublabel, inverse } = data;

    const isPositive = growth > 0;
    const isNeutral = growth === 0;

    // Decide color: usually positive is green, unless inverse is true (like for churn)
    let colorClass = '';
    if (!isNeutral) {
        if (inverse) {
            colorClass = isPositive ? 'stat-red' : 'stat-green';
        } else {
            colorClass = isPositive ? 'stat-green' : 'stat-red';
        }
    }

    const growthFormatted = `${isPositive ? '+' : ''}${growth}%`;

    return (
        <div className="stat-card glass-card">
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
            <div className={`stat-growth ${colorClass}`}>
                <span className="growth-value">{isNeutral ? '—' : growthFormatted}</span>
                <span className="growth-sublabel">{sublabel}</span>
            </div>
        </div>
    );
}
