import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function Sidebar() {
  const { user, signOut } = useAuth();

  const canSeeCalendar = !user?.rol || ['admin', 'encargado', 'gerente', 'cocinero'].includes(user.rol);
  const canSeeDashboard = !user?.rol || ['admin', 'encargado', 'gerente', 'cocinero'].includes(user.rol);
  const canSeeManagement = !user?.rol || ['admin', 'encargado', 'gerente'].includes(user.rol);
  const canSeeAdmin = user?.rol === 'admin';
  const canSeeRepartos = !user?.rol || ['admin', 'encargado', 'gerente', 'cocinero', 'repartidor'].includes(user.rol);

  return (
    <nav className="sidebar">
      <div className="sidebar-brand">AL</div>

      {canSeeCalendar && (
        <NavLink
          to="/calendar"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          title="Calendario"
        >
          📅
        </NavLink>
      )}

      {canSeeDashboard && (
        <NavLink
          to="/diario"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          title="Pedidos"
        >
          📋
        </NavLink>
      )}

      {canSeeManagement && (
        <>
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
            to="/stock"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            title="Gestión de Stock"
          >
            📦
          </NavLink>
        </>
      )}

      {canSeeAdmin && (
        <NavLink
          to="/admin/dashboard"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          title="Panel de Negocio"
        >
          📊
        </NavLink>
      )}

      {canSeeRepartos && (
        <NavLink
          to="/repartos"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          title="Repartos"
        >
          🛵
        </NavLink>
      )}

      <div className="sidebar-spacer" />

      <button className="sidebar-link sidebar-logout" onClick={signOut} title="Cerrar sesión">
        ⏻
      </button>
    </nav>
  );
}
