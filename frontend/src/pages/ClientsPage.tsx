import { useState, useEffect, useCallback } from 'react';
import { getClientes, updateCliente, deleteCliente } from '../api/clientes';
import { ClientAnalysisModal } from '../components/Clients/ClientAnalysisModal';
import type { Cliente } from '../types';
import './ClientsPage.css';

export function ClientsPage() {
    const [clients, setClients] = useState<Cliente[]>([]);
    const [search, setSearch] = useState('');
    const [loadingList, setLoadingList] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState<string>('nombre');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [editingClient, setEditingClient] = useState<Cliente | null>(null);
    const [analyzingClient, setAnalyzingClient] = useState<Cliente | null>(null);

    const loadListData = useCallback(async () => {
        setLoadingList(true);
        try {
            const response = await getClientes(search, page, sortBy, sortOrder);
            setClients(response.clients);
            setTotalPages(response.pages);
        } catch (err) {
            console.error('[ClientsPage] Error loading clients:', err);
        } finally {
            setLoadingList(false);
        }
    }, [search, page, sortBy, sortOrder]);

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
        setPage(1);
    };

    const renderSortIcon = (field: string) => {
        if (sortBy !== field) return <span className="sort-icon">↕</span>;
        return <span className={`sort-icon active ${sortOrder}`}>{sortOrder === 'asc' ? '▲' : '▼'}</span>;
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            loadListData();
        }, 300);
        return () => clearTimeout(timer);
    }, [loadListData]);

    const handleUpdateClient = async (updated: Partial<Cliente>) => {
        if (!editingClient) return;
        try {
            if (updated.activo === false) {
                await handleDeleteClient(editingClient.id);
                return;
            }
            const result = await updateCliente(editingClient.id, updated);
            setClients(prev => prev.map(c => c.id === result.id ? result : c));
            setEditingClient(null);
        } catch (err) {
            alert('Error al actualizar cliente');
        }
    };

    const handleDeleteClient = async (id: number) => {
        if (!window.confirm('¿Seguro que quieres borrar este cliente?')) return;
        try {
            await deleteCliente(id);
            setClients(prev => prev.filter(c => c.id !== id));
            setEditingClient(null);
        } catch (err) {
            alert('Error al borrar cliente');
        }
    };

    return (
        <div className="clients-page">
            <header className="page-header">
                <div className="header-top">
                    <h1>Gestión de Clientes</h1>
                </div>
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Buscar por nombre o teléfono..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        autoFocus
                    />
                </div>
            </header>

            <div className="clients-grid glass-card">
                <table className="clients-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('nombre')} className="sortable-th">
                                Nombre {renderSortIcon('nombre')}
                            </th>
                            <th onClick={() => handleSort('telefono')} className="sortable-th">
                                Teléfono {renderSortIcon('telefono')}
                            </th>
                            <th>Dirección</th>
                            <th onClick={() => handleSort('num_pedidos')} className="sortable-th">
                                Pedidos {renderSortIcon('num_pedidos')}
                            </th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingList ? (
                            <tr><td colSpan={5} className="loading-row">Cargando...</td></tr>
                        ) : clients.length === 0 ? (
                            <tr><td colSpan={5} className="empty-row">No se encontraron clientes</td></tr>
                        ) : (
                            clients.map(client => (
                                <tr key={client.id} onClick={() => setEditingClient(client)}>
                                    <td className="client-name-cell">{client.nombre}</td>
                                    <td>{client.telefono || '—'}</td>
                                    <td>{client.direccion ? `${client.direccion} (${client.codigo_postal || ''})` : '—'}</td>
                                    <td>{client.num_pedidos}</td>
                                    <td>
                                        <div className="actions-cell">
                                            <button
                                                className="edit-btn"
                                                title="Analizar tendencia"
                                                onClick={(e) => { e.stopPropagation(); setAnalyzingClient(client); }}
                                            >
                                                🔍
                                            </button>
                                            <button className="edit-btn" title="Editar" onClick={(e) => { e.stopPropagation(); setEditingClient(client); }}>✏️</button>
                                            <button
                                                className="delete-btn"
                                                title="Borrar"
                                                onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {totalPages > 1 && (
                    <div className="pagination">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
                        <span>Página {page} de {totalPages}</span>
                        <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
                    </div>
                )}
            </div>

            {editingClient && (
                <ClientEditModal
                    client={editingClient}
                    onSave={handleUpdateClient}
                    onClose={() => setEditingClient(null)}
                />
            )}

            {analyzingClient && (
                <ClientAnalysisModal
                    client={analyzingClient}
                    onClose={() => setAnalyzingClient(null)}
                />
            )}
        </div>
    );
}

function ClientEditModal({ client, onSave, onClose }: { client: Cliente, onSave: (d: Partial<Cliente>) => void, onClose: () => void }) {
    const [formData, setFormData] = useState({
        nombre: client.nombre,
        telefono: client.telefono || '',
        direccion: client.direccion || '',
        codigo_postal: client.codigo_postal || '',
        observaciones: client.observaciones || ''
    });

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
                <h2 className="modal-title">Editar Cliente</h2>
                <div className="modal-body edit-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label>Nombre</label>
                            <input
                                value={formData.nombre}
                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Teléfono</label>
                            <input
                                value={formData.telefono}
                                onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Dirección</label>
                            <input
                                value={formData.direccion}
                                onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Código Postal</label>
                            <input
                                value={formData.codigo_postal}
                                onChange={e => setFormData({ ...formData, codigo_postal: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Observaciones</label>
                        <textarea
                            value={formData.observaciones}
                            onChange={e => setFormData({ ...formData, observaciones: e.target.value })}
                            rows={3}
                        />
                    </div>
                </div>
                <div className="modal-actions">
                    <button className="btn-modal-delete" onClick={() => onSave({ activo: false })}>Borrar Cliente</button>
                    <div style={{ flex: 1 }} />
                    <button className="btn-modal-cancel" onClick={onClose}>Cancelar</button>
                    <button className="btn-modal-confirm" onClick={() => onSave(formData)}>Guardar Cambios</button>
                </div>
            </div>
        </div>
    );
}
