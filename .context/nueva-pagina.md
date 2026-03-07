# Contexto: Añadir Nueva Página o Feature

## Checklist para Nueva Página

### 1. Crear la página
```
frontend/src/pages/MiPagina.tsx
frontend/src/pages/MiPagina.css   (si necesita estilos propios)
```

### 2. Añadir ruta en `App.tsx`
```tsx
// Dentro del bloque de rutas protegidas (bajo <ProtectedRoute><Layout />)
<Route
  path="/mi-ruta"
  element={
    <RoleRoute allowedRoles={['admin', 'gerente']}>
      <MiPagina />
    </RoleRoute>
  }
/>
```
Roles disponibles: `'admin'` | `'gerente'` | `'encargado'` | `'cocinero'` | `'repartidor'`

### 3. Añadir enlace en `Sidebar.tsx`
```tsx
// Añadir condición de visibilidad
const canSeeMiPagina = ['admin', 'gerente'].includes(user?.rol ?? '');

// Añadir NavLink en el JSX
{canSeeMiPagina && (
  <NavLink to="/mi-ruta" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} title="Mi Página">
    📄
  </NavLink>
)}
```

### 4. Actualizar `compartido.md` si hay nuevos endpoints
El documento `compartido.md` es el contrato de API entre frontend y backend. Siempre actualizarlo.

## Estructura Típica de una Página

```tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import './MiPagina.css';

export function MiPagina() {
  const { user } = useAuth();
  const [data, setData] = useState<MiTipo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const result = await getMiData();
      setData(result);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="mi-pagina">
      {/* contenido */}
    </div>
  );
}
```

## Añadir Función API

```typescript
// frontend/src/api/miModulo.ts
import { get, post, put, del } from './client';
import type { MiTipo } from '../types';

export async function getMiData(): Promise<MiTipo[]> {
  return get<MiTipo[]>('/mi-endpoint');
}

export async function createMiItem(data: Partial<MiTipo>): Promise<{ id: number; message: string }> {
  return post('/mi-endpoint', data);
}
```

> **Usar siempre `api/client.ts`** (funciones `get/post/put/patch/del`), no `fetch` directo.
> `ingredients.ts` usa fetch directo — es un patrón antiguo a no replicar.

## Añadir Tipo TypeScript

```typescript
// frontend/src/types/index.ts — añadir al final
export interface MiTipo {
  id: number
  nombre: string
  // ...
}
```

## Restricciones TypeScript
- `erasableSyntaxOnly` → NO usar `public` en constructores de clase
- `verbatimModuleSyntax` → usar `import type` para tipos puros
- `noUnusedLocals` → no dejar imports o variables sin usar
- `strict: true` → tipado estricto, sin `any` implícito

## Añadir Modal

```tsx
// Patrón estándar para modales
const [showModal, setShowModal] = useState(false);
const [editingItem, setEditingItem] = useState<MiTipo | null>(null);

// En el JSX
{showModal && (
  <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
    <div className="modal-panel glass-card">
      {/* contenido */}
      <button onClick={() => setShowModal(false)}>Cerrar</button>
    </div>
  </div>
)}
```

## CSS para Nueva Página

```css
/* MiPagina.css */
.mi-pagina {
  padding: 24px;
  max-width: 1200px;
}

/* Usar variables del sistema */
.mi-pagina-card {
  background: var(--bg-card);
  border: var(--glass-border);
  border-radius: var(--radius);
  padding: 16px;
}

/* Mobile */
@media (max-width: 768px) {
  .mi-pagina {
    padding: 16px;
  }
}
```
