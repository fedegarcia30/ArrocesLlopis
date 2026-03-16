import { useState } from 'react';
import type { StatInfo } from './AdminStatCard';

interface SectionInfoBtnProps {
    info: StatInfo;
    title: string;
}

export function SectionInfoBtn({ info, title }: SectionInfoBtnProps) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                className="section-info-btn"
                onClick={(e) => { e.stopPropagation(); setOpen(true); }}
                title="Ver explicación"
            >
                i
            </button>

            {open && (
                <div className="stat-info-overlay" onClick={() => setOpen(false)}>
                    <div className="stat-info-modal glass-card" onClick={e => e.stopPropagation()}>
                        <header className="stat-info-modal-header">
                            <h3>{title}</h3>
                            <button className="stat-info-modal-close" onClick={() => setOpen(false)}>&times;</button>
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
