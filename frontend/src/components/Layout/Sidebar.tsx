import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function Sidebar() {
  const { signOut } = useAuth();

  return (
    <nav className="sidebar">
      <div className="sidebar-brand">AL</div>

      <NavLink
        to="/"
        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        title="Calendario"
      >
        📅
      </NavLink>

      <NavLink
        to="/dashboard"
        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        title="Pedidos"
      >
        📋
      </NavLink>

      <NavLink
        to="/clientes"
        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        title="Clientes"
      >
        👥
      </NavLink>

      <NavLink
        to="/arroces"
        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        title="Arroces"
      >
        🍚
      </NavLink>

      <NavLink
        to="/admin/dashboard"
        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        title="Panel de Negocio"
      >
        📊
      </NavLink>

      <div className="sidebar-spacer" />

      <button className="sidebar-link sidebar-logout" onClick={signOut} title="Cerrar sesión">
        ⏻
      </button>
    </nav>
  );
}
