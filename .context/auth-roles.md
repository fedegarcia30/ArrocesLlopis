# Contexto: Auth y Roles

## Archivos Clave
```
frontend/src/hooks/useAuth.ts          # AuthContext + AuthProvider
frontend/src/api/auth.ts               # signIn, signOut, getUserProfile
frontend/src/config/firebase.ts        # Firebase app init
frontend/src/App.tsx                   # ProtectedRoute, PublicRoute, RoleRoute
frontend/src/components/Layout/Sidebar.tsx   # Navegación filtrada por rol
frontend/src/types/index.ts            # AuthUser
backend/app/auth.py                    # @requires_auth, @requires_role
```

## Roles Disponibles
| Rol | Acceso |
|-----|--------|
| `admin` | Todo |
| `gerente` | Todo excepto /admin/dashboard |
| `encargado` | Todo excepto /admin/dashboard |
| `cocinero` | /diario, /calendar, /repartos (sin botón nuevo pedido) |
| `repartidor` | Solo /repartos |

> Nota: `encargado` existe en el frontend pero NO en el ENUM MySQL de `usuarios.rol`. No se puede crear en BD.

## Interfaz AuthUser
```typescript
interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  rol?: 'admin' | 'cocinero' | 'repartidor' | 'gerente' | 'encargado'
}
```

## useAuth Hook
```typescript
const { user, loading, signIn, signOut, refreshProfile } = useAuth()
// user === null → no autenticado
// user.rol → rol del usuario (viene de la BD a través del backend)
```

Flujo de login:
1. `signIn(email, password)` → Firebase `signInWithEmailAndPassword`
2. `onAuthStateChanged` dispara → set user base (sin rol)
3. `getUserProfile()` → `GET /api/v1/auth/me` con Bearer token
4. Response `{ rol }` se fusiona en user
5. App.tsx redirige según rol

## Guards de Ruta (App.tsx)
```tsx
// Solo usuarios autenticados
<ProtectedRoute>...</ProtectedRoute>

// Solo usuarios NO autenticados (redirige si ya hay sesión)
<PublicRoute>...</PublicRoute>

// Solo roles específicos
<RoleRoute allowedRoles={['admin', 'gerente']}>...</RoleRoute>
```

`RoleRoute` redirige al home del rol si el usuario no tiene acceso:
- admin → `/admin/dashboard`
- cocinero → `/diario`
- repartidor → `/repartos`
- otros → `/calendar`

## Redirección Post-Login
Manejada en `PublicRoute` cuando `user` ya existe:
```typescript
if (user.rol === 'admin') → /admin/dashboard
if (user.rol === 'cocinero') → /diario
if (user.rol === 'repartidor') → /repartos
default → /calendar
```

## Sidebar — Visibilidad por Rol
```typescript
const canSeeCalendar = ['admin', 'encargado', 'gerente', 'cocinero']
const canSeeDashboard = ['admin', 'encargado', 'gerente', 'cocinero']  // /diario
const canSeeManagement = ['admin', 'encargado', 'gerente']  // /clientes, /arroces, /stock
const canSeeAdmin = user?.rol === 'admin'  // /admin/dashboard
const canSeeRepartos = todos los roles
```

## Backend Auth Decorators
```python
# backend/app/auth.py
@requires_auth           # Verifica Firebase token, inyecta request.user
@requires_role(['admin', 'gerente'])  # Requiere rol específico (después de @requires_auth)

# request.user disponible en rutas protegidas:
# { uid, email, rol, id }
```

Flujo backend:
1. `Authorization: Bearer <idToken>` en header
2. `firebase_admin.auth.verify_id_token(token)` → extrae email
3. Busca `Usuario` en BD por `username=email` y `activo=True`
4. Si no existe → 403 Forbidden
5. Inyecta `request.user = { uid, email, rol, id }`

## Añadir Protección a una Nueva Ruta Backend
```python
from app.auth import requires_auth, requires_role

@api_v1_bp.route('/nueva-ruta', methods=['GET'])
@requires_auth
@requires_role(['admin'])  # opcional
def nueva_ruta():
    user = request.user  # { uid, email, rol, id }
    ...
```
