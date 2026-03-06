import { useState } from 'react';
import './OrderWizard.css';

interface AddressModalProps {
    initialAddress: string;
    initialCp: string;
    onConfirm: (address: string, cp: string, isPermanent: boolean) => void;
    onCancel: () => void;
}

export function AddressModal({ initialAddress, initialCp, onConfirm, onCancel }: AddressModalProps) {
    const [address, setAddress] = useState(initialAddress);
    const [cp, setCp] = useState(initialCp);

    return (
        <div className="wizard-overlay" style={{ zIndex: 300 }}>
            <div className="wizard-panel glass-card" style={{ maxWidth: '400px' }}>
                <h3 style={{ marginBottom: '20px' }}>Dirección de Entrega</h3>

                <div className="wizard-step">
                    <div>
                        <label>Calle y Número</label>
                        <input
                            type="text"
                            value={address}
                            onFocus={() => setAddress('')}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Ej: Calle Mayor 1, 2B"
                        />
                    </div>
                    <div>
                        <label>Código Postal</label>
                        <input
                            type="text"
                            value={cp}
                            onFocus={() => setCp('')}
                            onChange={(e) => setCp(e.target.value)}
                            placeholder="Ej: 28001"
                        />
                    </div>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                        className="wizard-btn-next"
                        style={{ width: '100%' }}
                        onClick={() => onConfirm(address, cp, true)}
                    >
                        Actualizar cliente permanentemente
                    </button>

                    <button
                        className="btn-clear-selection"
                        style={{ width: '100%', padding: '14px' }}
                        onClick={() => onConfirm(address, cp, false)}
                    >
                        Usar solo para este pedido
                    </button>

                    <button
                        className="wizard-btn-back"
                        style={{ width: '100%', border: 'none', background: 'none' }}
                        onClick={onCancel}
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}
