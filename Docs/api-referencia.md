# Referencia de API - Arroces Llopis

Base URL dev: `http://localhost:5001/api/v1`
Base URL prod: `https://solvency.ddns.net/management-api` (nginx → `/api/v1`)

Auth: `Authorization: Bearer <Firebase idToken>` en todos los endpoints salvo indicación.

---

## Disponibilidad

### `POST /availability/check`
```json
// Request
{ "date": "2026-05-10" }

// Response
{
  "date": "2026-05-10",
  "slots": [{
    "time": "13:00",
    "orders_count": 4,
    "pax_total": 48,
    "available": true,
    "remaining_orders": 2,
    "remaining_pax": 24,
    "status": "yellow"
  }]
}
```

### `GET /pedidos/calendar?year=YYYY&month=M`
```json
// Response
{
  "2026-05-10": { "count": 3, "total_pax": 24 },
  "2026-05-11": { "count": 1, "total_pax": 8 }
}
```

---

## Pedidos

### `GET /pedidos`
Query params opcionales: `status`, `fecha` (YYYY-MM-DD), `cliente_id`

```json
// Response (array)
[{
  "id": 5001,
  "cliente_id": 123,
  "cliente_nombre": "Juan Pérez",
  "telefono": "600123456",
  "direccion": "Calle Mayor 1",
  "pax": 4,
  "fecha_pedido": "2026-05-10T13:30:00",
  "observaciones": "Sin sal",
  "status": "nuevo",
  "entregado": false,
  "recogido": false,
  "local_recogida": true,
  "lineas": [{ "id": 1, "arroz_id": 1, "arroz_nombre": "Señoret", "precio_unitario": 13.50 }],
  "created_at": "2026-05-09T10:30:00"
}]
```

### `GET /pedidos/:id`
Devuelve un pedido por ID (misma estructura).

### `POST /orders/create`
```json
// Request
{
  "date": "2026-05-10",
  "time": "13:30",
  "client": {
    "id": 123,          // null si cliente nuevo
    "nombre": "Juan Pérez",
    "telefono": "600123456",
    "direccion": "Calle Mayor 1",
    "codigo_postal": "28001"
  },
  "order": {
    "arroz_id": 1,
    "pax": 4,
    "recogida": true,
    "observaciones": "Sin sal"
  }
}

// Response éxito
{ "success": true, "order_id": 5001, "message": "Pedido confirmado correctamente." }

// Response fallo
{ "success": false, "error_code": "SLOT_FULL", "message": "..." }
```

### `PATCH /pedidos/:id/status`
```json
// Request
{ "status": "preparando" }
// Response: objeto Pedido actualizado
```

### `PATCH /pedidos/:id`
Actualización parcial (ej. mover slot): `{ "fecha_pedido": "2026-05-10 14:00" }`

---

## Clientes

### `POST /clients/lookup`
```json
// Request
{ "phone": "600123456" }

// Response encontrado
{ "found": true, "clients": [{ "id": 123, "nombre": "Juan Pérez", ... }] }

// Response no encontrado
{ "found": false }
```

### `GET /clientes`
Lista todos los clientes (paginada o completa según implementación backend).

### `PUT /clientes/:id` o `PATCH /clientes/:id`
Actualización parcial de cliente (nombre, dirección, etc.)

---

## Arroces (Catálogo)

### `GET /rices`
Lista todos los arroces (incluye no disponibles para admin).
```json
[{ "id": 1, "nombre": "Señoret", "precio": 13.50, "caldo": "pollo", "disponible": true }]
```

### `POST /rices`
```json
{ "nombre": "Nuevo Arroz", "precio": 14.00, "caldo": "verduras", "disponible": true }
```

### `PUT /rices/:id`
Edición completa del arroz.

### `DELETE /rices/:id`
Soft-delete (marca `disponible = false`).

### `GET /rices/:id/recipe`
```json
{
  "rice_id": 1,
  "rice_name": "Señoret",
  "ingredients": [{ "ingrediente_id": 5, "nombre": "Gambas", "cantidad_por_racion": 50, "unidad_medida": "g" }]
}
```

### `POST /rices/:id/recipe`
```json
// Body: array de ingredientes
[{ "ingrediente_id": 5, "cantidad_por_racion": 50 }]
```

---

## Ingredientes y Stock

### `GET /ingredients`
Lista todos los ingredientes con stock actual y mínimo.

### `PUT /ingredients/:id`
Actualización de ingrediente (nombre, unidad, stock mínimo, etc.)

### `POST /ingredients/purchase` (+ query param opcional `?fecha=YYYY-MM-DD`)
```json
{
  "proveedor_id": 1,
  "items": [{ "ingrediente_id": 5, "cantidad": 2000, "precio_unitario": 0.015 }],
  "observaciones": "Compra semanal"
}
```

---

## Estadísticas (Admin)

### `GET /stats/dashboard?period=quarter&mode=full`
Parámetros:
- `period`: `month` | `quarter` | `semester` | `ytd`
- `mode`: `full` | `mtd` (mes hasta hoy)

```json
{
  "summary": {
    "revenue": { "value": 15000, "growth": 12.5, "label": "Ingresos", "sublabel": "vs período anterior" },
    "rations": { ... },
    "orders": { ... },
    "avg_ticket": { ... }
  },
  "period_info": { "current": { "label": "Q1 2026" }, "previous": { "label": "Q4 2025" } },
  "top_arroces": [{ "nombre": "Señoret", "rations": 120, "subtotal": 1560 }],
  "top_clients": [{ "nombre": "Juan Pérez", "orders": 5, "spent": 350, "rations": 40 }],
  "top_zipcodes": [{ "cp": "28001", "orders": 12, "revenue": 840 }],
  "busiest_month": "Marzo",
  "history": {
    "revenue": { "current": [...], "prev1": [...], "prev2": [...], "prev3": [...] }
  }
}
```

### `GET /stats/expenses?period=quarter&mode=full`
```json
{
  "summary": {
    "total_expense": { ... },
    "purchases_count": { ... },
    "stock_alerts": { ..., "status": "warning" | "ok" }
  },
  "top_ingredients": [{ "nombre": "Gambas", "qty": 5000, "spent": 75, "unit": "g" }],
  "top_providers": [{ "nombre": "Proveedor S.L.", "count": 4, "spent": 300 }]
}
```

---

## Auth

### `GET /auth/me`
Devuelve el perfil del usuario autenticado (basado en el Firebase token).
```json
{ "id": 1, "username": "admin@arrocesllopis.com", "rol": "admin", "activo": true }
```

---

## Errores Comunes

| Código | Significado |
|--------|-------------|
| 401 | Token inválido o ausente |
| 403 | Usuario no en BD o rol insuficiente |
| 404 | Recurso no encontrado |
| `error_code: "SLOT_FULL"` | Slot sin capacidad al confirmar pedido |
