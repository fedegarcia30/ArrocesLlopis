# Interfaz Compartida Backend - Frontend

Este documento sirve como puente para que el equipo de Frontend pueda integrar la API del módulo de Gestión de Pedidos ("Order Management"). 
Se debe respetar estrictamente este contrato de API.

## URL Base y Autenticación
Todas las llamadas a la API deben realizarse a la URL base (ej. `http://localhost:5001/api/v1`).
Los endpoints securizados requieren el envío del header: `Authorization: Bearer <ID_TOKEN>`, donde `<ID_TOKEN>` es el token JWT proporcionado por Firebase Authentication.

---

## 1. Verificación de Disponibilidad (Availability Check)
**Endpoint**: `POST /api/v1/availability/check`
**Auth**: Requerido
**Descripción**: Devuelve la disponibilidad de huecos (slots) para una fecha específica, teniendo en cuenta tanto el número de pedidos (máximo 6 por hueco) como el número de raciones/PAX (máximo 72 por hueco).

**Request Body**:
```json
{
  "date": "2026-05-10"
}
```

**Response**:
```json
{
  "date": "2026-05-10",
  "slots": [
    {
      "time": "13:00",
      "orders_count": 4,
      "pax_total": 48,
      "available": true,
      "remaining_orders": 2,
      "remaining_pax": 24,
      "status": "yellow"
    }
  ]
}
```

---

## 2. Búsqueda de Cliente (Client Lookup)
**Endpoint**: `POST /api/v1/clients/lookup`
**Auth**: Requerido
**Descripción**: Busca un cliente por su número de teléfono.

**Request Body**:
```json
{
  "phone": "600123456"
}
```

**Response (Encontrado)**:
```json
{
  "found": true,
  "client": {
    "id": 123,
    "nombre": "Juan Pérez",
    "direccion": "Calle Mayor 1, Madrid",
    "codigo_postal": "28001",
    "observaciones": "Cliente habitual"
  }
}
```
**Response (No Encontrado)**:
```json
{
  "found": false
}
```

---

## 3. Creación de Pedido (Order Creation)
**Endpoint**: `POST /api/v1/orders/create`
**Auth**: Requerido
**Descripción**: Crea un nuevo pedido. Si el `client.id` es `null`, se creará un nuevo registro de cliente de forma transaccional. El endpoint valida nuevamente la capacidad del hueco antes de confirmar.

**Request Body**:
```json
{
  "date": "2026-05-10",
  "time": "13:30",
  "client": {
    "id": 123, // Enviar null si es un cliente nuevo
    "nombre": "Juan Pérez",
    "telefono": "600123456",
    "direccion": "Calle Mayor 1, Madrid",
    "codigo_postal": "28001"
  },
  "order": {
    "arroz_id": 1,
    "pax": 4,
    "recogida": true, // true si es recogida en local, false si es a domicilio
    "observaciones": "Sin sal"
  }
}
```

**Response (Éxito)**:
```json
{
  "success": true,
  "order_id": 5001,
  "message": "Pedido confirmado correctamente."
}
```

**Response (Fallo - Sin Capacidad)**:
```json
{
  "success": false,
  "error_code": "SLOT_FULL",
  "message": "Lo sentimos, el hueco seleccionado ya no tiene disponibilidad (máximo 6 pedidos o 72 raciones)."
}
```

---

## 4. Catálogo de Arroces (Rice Types)
**Endpoint**: `GET /api/v1/rices`
**Auth**: Requerido (Recomendado)
**Descripción**: Devuelve la lista de tipos de arroces disponibles y sus precios.

**Response**:
```json
[
  { "id": 1, "nombre": "Señoret", "precio": 13.50 },
  { "id": 2, "nombre": "Negro", "precio": 13.50 }
]
```

---

## 5. Listado de Pedidos (Orders List)
**Endpoint**: `GET /api/v1/pedidos`
**Auth**: Requerido
**Descripción**: Devuelve la lista de pedidos. Soporta filtros opcionales por query params.

**Query Params (opcionales)**:
- `status` — Filtrar por estado: `nuevo`, `preparando`, `listo`, `entregado`, `cancelado`
- `fecha` — Filtrar por fecha (formato `YYYY-MM-DD`)
- `cliente_id` — Filtrar por ID de cliente

**Response**:
```json
[
  {
    "id": 5001,
    "cliente_id": 123,
    "cliente_nombre": "Juan Pérez",
    "telefono": "600123456",
    "direccion": "Calle Mayor 1, Madrid",
    "pax": 4,
    "fecha": "2026-05-10",
    "time": "13:30",
    "observaciones": "Sin sal",
    "status": "nuevo",
    "entregado": false,
    "recogido": false,
    "local_recogida": true,
    "lineas": [
      {
        "id": 1,
        "arroz_id": 1,
        "arroz_nombre": "Señoret",
        "precio_unitario": 13.50
      }
    ],
    "created_at": "2026-05-09T10:30:00"
  }
]
```

---

## 6. Actualización de Estado de Pedido
**Endpoint**: `PATCH /api/v1/pedidos/:id/status`
**Auth**: Requerido
**Descripción**: Actualiza el estado de un pedido.

**Request Body**:
```json
{
  "status": "preparando"
}
```

**Response**: El objeto Pedido actualizado (misma estructura que en listado).

---

## 7. CRUD de Clientes (para módulo futuro)
**Endpoint base**: `/api/v1/clientes`
**Auth**: Requerido

- `GET /api/v1/clientes?search=...` — Buscar por nombre o teléfono
- `GET /api/v1/clientes/:id` — Detalle de un cliente
- `POST /api/v1/clientes` — Crear cliente
- `PUT /api/v1/clientes/:id` — Actualizar cliente

---

## Notas para Backend

### Endpoints que el Frontend ya consume (prioridad de implementación):
1. `POST /api/v1/availability/check` — Dashboard principal
2. `POST /api/v1/clients/lookup` — Wizard de nuevo pedido (paso 1)
3. `GET /api/v1/rices` — Wizard de nuevo pedido (paso 2)
4. `POST /api/v1/orders/create` — Wizard de nuevo pedido (paso 4)
5. `GET /api/v1/pedidos?fecha=...` — Lista de pedidos del dashboard
6. `PATCH /api/v1/pedidos/:id/status` — Cambio de estado

### Autenticación
El frontend usa **Firebase Auth**. Envía el `idToken` en cada request como `Authorization: Bearer <idToken>`. El backend debe verificar este token con `firebase_admin.auth.verify_id_token()`.

### Reglas de negocio validadas en frontend (el backend DEBE re-validar):
- PAX mínimo: 2
- Máximo por slot: 6 pedidos ó 72 raciones
- Status permitidos: nuevo → preparando → listo → entregado | cancelado
