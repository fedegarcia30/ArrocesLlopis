import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { CalendarPage } from './pages/CalendarPage';
import { ClientsPage } from './pages/ClientsPage';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { RicesPage } from './pages/RicesPage';
import { StockPage } from './pages/StockPage';
import { RepartosPage } from './pages/RepartosPage';
import type { ReactNode } from 'react';
import './App.css';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
        Cargando...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    if (user.rol === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.rol === 'cocinero') return <Navigate to="/diario" replace />;
    if (user.rol === 'repartidor') return <Navigate to="/repartos" replace />;
    return <Navigate to="/calendar" replace />;
  }

  return <>{children}</>;
}

function RoleRoute({ children, allowedRoles }: { children: ReactNode, allowedRoles: string[] }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user || (user.rol && !allowedRoles.includes(user.rol))) {
    if (user?.rol === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user?.rol === 'cocinero') return <Navigate to="/diario" replace />;
    if (user?.rol === 'repartidor') return <Navigate to="/repartos" replace />;
    return <Navigate to="/calendar" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route
              path="/stock"
              element={
                <RoleRoute allowedRoles={['admin', 'encargado', 'gerente']}>
                  <StockPage />
                </RoleRoute>
              }
            />
            <Route
              path="/arroces"
              element={
                <RoleRoute allowedRoles={['admin', 'encargado', 'gerente']}>
                  <RicesPage />
                </RoleRoute>
              }
            />
            <Route
              path="/clientes"
              element={
                <RoleRoute allowedRoles={['admin', 'encargado', 'gerente']}>
                  <ClientsPage />
                </RoleRoute>
              }
            />
            <Route
              path="/diario"
              element={
                <RoleRoute allowedRoles={['admin', 'encargado', 'gerente', 'cocinero']}>
                  <DashboardPage />
                </RoleRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <RoleRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </RoleRoute>
              }
            />
            <Route
              path="/repartos"
              element={
                <RoleRoute allowedRoles={['admin', 'gerente', 'encargado', 'cocinero', 'repartidor']}>
                  <RepartosPage />
                </RoleRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <RoleRoute allowedRoles={['admin', 'encargado', 'gerente', 'cocinero']}>
                  <CalendarPage />
                </RoleRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/calendar" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
