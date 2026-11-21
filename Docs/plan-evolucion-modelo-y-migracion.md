# Plan: Evolución del modelo + migración de datos históricos + cambios en la app

> Documento de trabajo para ejecutar la evolución del modelo de datos, la migración
> desde `Datos/Arroces_Llopis.db` (SQLite) a MySQL, y las modificaciones necesarias en
> backend y frontend. Escrito para que otra LLM/agente pueda ejecutarlo paso a paso.

---

## 0. Objetivo

1. **Evolucionar el modelo MySQL actual** para que sea explotable analíticamente:
   - raciones por línea de pedido,
   - histórico de precios con vigencia,
   - municipio/provincia estructurados en clientes.
2. **Eliminar los datos dummy** actuales de MySQL (conservando configuración operativa:
   usuarios, stock, recetas).
3. **Migrar el histórico completo 2020–2025** desde la SQLite legacy.
4. **Adaptar la app** (backend + frontend) al modelo evolucionado y al pedido
   multi-producto real (un pedido = un encargo con N líneas).

---

## 1. Estado actual (diagnóstico ya verificado)

### 1.1 MySQL actual (`arroces_llopis`)

Tablas reales (DDL real, no `schema.sql`, que está desactualizado):

- `pedidos`: `id, cliente_id, usuario_asignado_id, pax, fecha_pedido(datetime),
  observaciones, status enum, entregado, recogido, local_recogida, review,
  comentarios_recogida, created_at, updated_at, deleted_at`. **No tiene `arroz_id`.**
- `pedido_lineas`: `id, pedido_id, arroz_id, precio_unitario` con
  `UNIQUE(pedido_id, arroz_id)`. **No tiene `raciones`.**
- `clientes`: `id, nombre, telefono, direccion, codigo_postal, observaciones,
  num_pedidos, raciones, activo, direccion_limpia, latitud, longitud, created_at,
  updated_at, deleted_at`. **No tiene municipio/provincia.**
- `arroces`: `id, nombre(unique), precio, caldo, disponible, ...`.
- `historico_precios`: `id, item_id, tipo_item('venta','compra'), precio,
  fecha_inicio`. **No tiene `fecha_fin`.**
- Tablas sobrantes: `clientes_backup`, `mes_mapping` (restos de una importación previa).

Datos dummy actuales (a borrar): 981 clientes, 2.371 pedidos, 2.314 líneas, 11 arroces.
Conservar: 1 usuario (admin), 15 ingredientes, 0 recetas (`arroz_ingredientes`), 0 compras.

### 1.2 SQLite legacy (`Datos/Arroces_Llopis.db`)

Esquema: `categorias, productos(14), precios(22), clientes(2.973), direcciones(2.844),
franjas(23), jornadas(730), pedidos(6.103), detalle_pedidos(7.859), anotaciones(5.181)`.

Hechos verificados:

- **UTF-8 limpio** (no hay que arreglar encoding).
- `productos`: 14 (9 arroces/fideuá + 5 "otros platos"): SEÑORET, BANDA, NEGRO, PULPO,
  POLLO, ALCACHOFAS, VERDURAS, PAELLA, CARABINERO, FIDEUÁ, COCIDO, CALLOS, CARRILLERAS,
  POLLO EN PEPITORIA.
- `precios`: precio en céntimos con `vigente_desde`/`vigente_hasta`.
- `detalle_pedidos.id_precio` está relleno en 7.855 de 7.859 filas → snapshot directo.
- `detalle_pedidos`: `id_producto` NULL en 3 filas; `raciones` NULL en 10 filas.
- `pedidos`: `id_jornada` nunca NULL; `id_franja` NULL en 133; `id_direccion_entrega`
  NULL en 1.281; `fecha_pedido` es solo fecha (la hora viene de `franjas`).
- Estados legacy: `Realizado` (6.072), `Anulado` (26), `Pendiente de aclarar` (5).
- `modalidad` es siempre `Desconocida`.
- `anotaciones`: tipos `Total` (4.595) y `Nota` (586).

---

## 2. Modelo objetivo (esquema evolucionado)

### 2.1 Cambios de esquema

```sql
-- 1. Raciones por línea de pedido (clave para analítica por producto)
ALTER TABLE pedido_lineas
  ADD COLUMN raciones INT NOT NULL DEFAULT 0 COMMENT 'Raciones de este arroz en el pedido';

-- 2. Localización estructurada en clientes (análisis por zona)
ALTER TABLE clientes
  ADD COLUMN municipio VARCHAR(100) NULL COMMENT 'Municipio (análisis por zona)',
  ADD COLUMN provincia VARCHAR(100) NULL COMMENT 'Provincia (análisis por zona)';

-- 3. Cierre de vigencia en histórico de precios
ALTER TABLE historico_precios
  ADD COLUMN fecha_fin DATETIME NULL COMMENT 'Fin de vigencia (NULL = vigente)';

-- Índices para analítica
CREATE INDEX idx_pedido_lineas_arroz ON pedido_lineas(arroz_id);
CREATE INDEX idx_historico_precios_item ON historico_precios(tipo_item, item_id, fecha_inicio);
CREATE INDEX idx_clientes_municipio ON clientes(municipio);
```

Notas:

- `pedidos.pax` se mantiene como **total de raciones del pedido** (denormalizado,
  igual a `SUM(pedido_lineas.raciones)`).
- El `UNIQUE(pedido_id, arroz_id)` de `pedido_lineas` se mantiene (una línea por arroz
  por pedido).
- La regla de disponibilidad (máx. 6 pedidos / 72 raciones por slot) pasa a contar
  **pedidos** (encargos), no líneas, que es lo correcto.

### 2.2 Decisiones de diseño (recomendación marcada)

| # | Decisión | Recomendación | Alternativa |
|---|---|---|---|
| D1 | Semántica de `pedidos` | **1 pedido = 1 encargo con N líneas** (multi-producto real). Coincide con la legacy y con el carrito multi-item que ya tiene el frontend | 1 pedido por arroz (modelo actual; menor cambio pero pierde la estructura de encargo) |
| D2 | Productos a importar | **Los 14** (todos son platos del menú) | Solo categoría "Arroces" (9) |
| D3 | Normalización de nombres | **Title Case** con mapeo explícito (sección 6.1) | Mantener MAYÚSCULAS legacy |
| D4 | `caldo` de arroces | **NULL** (la legacy no lo tiene) | Mapeo manual por nombre (Señoret/Negro/Banda → Pescado) |
| D5 | Estado histórico | `Realizado → entregado` (entregado=True), `Anulado → cancelado`, `Pendiente de aclarar → nuevo` | `Realizado → listo` |
| D6 | Direcciones múltiples por cliente | **Aplanar a 1 dirección** (la más usada en pedidos) | Crear tabla `direcciones` en MySQL |
| D7 | Cliente "DESCONOCIDO" (id_cliente=2) | **Importarlo** como cliente normal (los pedidos requieren `cliente_id NOT NULL`) | — |
| D8 | `anotaciones` legacy | **Opcional**: crear tabla `anotaciones` simple y migrarlas | No importar |
| D9 | `clientes_backup` y `mes_mapping` | **Eliminar** tras el backup (restos) | Conservar |
| D10 | `usuarios` e `ingredientes` | **Conservar** (configuración operativa, no son datos dummy) | — |

---

## 3. Fase 0 — Backup de seguridad (obligatorio)

```bash
# Desde la raíz del repo (Windows PowerShell)
mysqldump -u root -p"Ckarmen!234" -h localhost --routines --triggers arroces_llopis > backup_arroces_llopis_$(Get-Date -Format yyyyMMdd_HHmmss).sql
```

Guardar el `.sql` fuera del repo o confirmar que existe antes de continuar.

---

## 4. Fase 1 — Evolucionar el esquema (MySQL)

Aplicar en orden (archivo sugerido: `database/migracion_2026_evolucion.sql`):

```sql
USE arroces_llopis;

ALTER TABLE pedido_lineas
  ADD COLUMN raciones INT NOT NULL DEFAULT 0 COMMENT 'Raciones de este arroz en el pedido';

ALTER TABLE clientes
  ADD COLUMN municipio VARCHAR(100) NULL,
  ADD COLUMN provincia VARCHAR(100) NULL;

ALTER TABLE historico_precios
  ADD COLUMN fecha_fin DATETIME NULL;

CREATE INDEX idx_pedido_lineas_arroz ON pedido_lineas(arroz_id);
CREATE INDEX idx_historico_precios_item ON historico_precios(tipo_item, item_id, fecha_inicio);
CREATE INDEX idx_clientes_municipio ON clientes(municipio);
```

Ejecutar: `mysql -u root -p"Ckarmen!234" -h localhost < database/migracion_2026_evolucion.sql`

---

## 5. Fase 2 — Borrar datos actuales (solo transaccionales)

```sql
USE arroces_llopis;
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE pedido_feedback;
TRUNCATE TABLE pedido_lineas;
TRUNCATE TABLE pedidos;
TRUNCATE TABLE clientes;
TRUNCATE TABLE arroces;
TRUNCATE TABLE historico_precios;
SET FOREIGN_KEY_CHECKS = 1;

-- Limpieza de restos (opcional, tras verificar el backup)
DROP TABLE IF EXISTS clientes_backup;
DROP TABLE IF EXISTS mes_mapping;
```

**Conservar** (NO truncar): `usuarios`, `ingredientes`, `arroz_ingredientes`,
`proveedores`, `compras`, `compra_lineas`.

> ⚠️ El trigger `trg_clientes_num_pedidos_insert` se dispara al insertar pedidos vía SQL
> y actualizará `num_pedidos`; la migración puede ignorarlo (se recalcula al final). Para
> evitar doble conteo se puede desactivar antes del bulk y recalcular al final
> (ver sección 6.4).

---

## 6. Fase 3 — Migración SQLite → MySQL

Script propuesto: `database/migrate_sqlite_to_mysql.py` (Python, usa
`mysql.connector` — ya está en requirements — y `sqlite3` de stdlib). Leer
`DATABASE_URL` de `backend/.env` para conectar.

### 6.1 Mapeo y reglas

#### A. `productos` + `precios` → `arroces` + `historico_precios`

- Insertar los **14 productos** en `arroces`:
  - `nombre`: normalizar a Title Case con este mapeo exacto:

    | Legacy | MySQL |
    |---|---|
    | SEÑORET | Señoret |
    | BANDA | Banda |
    | NEGRO | Negro |
    | PULPO | Pulpo |
    | POLLO | Pollo |
    | ALCACHOFAS | Alcachofas |
    | VERDURAS | Verduras |
    | PAELLA | Paella |
    | CARABINERO | Carabinero |
    | FIDEUÁ | Fideuá |
    | COCIDO | Cocido |
    | CALLOS | Callos |
    | CARRILLERAS | Carrilleras |
    | POLLO EN PEPITORIA | Pollo en Pepitoria |

  - `precio`: precio vigente = `precios` con `vigente_hasta IS NULL`
    (`precio_por_racion_centimos / 100`).
  - `caldo`: NULL. `disponible`: TRUE.
- Insertar en `historico_precios` una fila por cada fila legacy de `precios`:
  - `item_id` = id MySQL del arroz mapeado,
  - `tipo_item` = 'venta',
  - `precio` = `precio_por_racion_centimos / 100.0`,
  - `fecha_inicio` = `vigente_desde`,
  - `fecha_fin` = `vigente_hasta`.
- Guardar mapa `map_arroz: {id_producto_legacy -> id_arroces_mysql}`.

#### B. `clientes` + `direcciones` → `clientes`

Por cada `clientes` legacy:

- `nombre` = unir con espacios y quitar NULLs: `nombre`, `primer_apellido`,
  `segundo_apellido`. Si queda vacío → `'Sin Nombre'`.
- `telefono` = `telefono_principal`; si es NULL → `telefono_secundario`.
- Selección de dirección principal (determinista):
  1. Direcciones del cliente ordenadas por `activa DESC, id_direccion`.
  2. Si el cliente tiene pedidos con `id_direccion_entrega` no nulo, elegir la
     dirección **más referenciada** por sus pedidos; en empate, `activa` y luego id.
  3. Componer `direccion`:
     - Si `completa = 1` y `texto_original` no vacío → usar `texto_original`.
     - Si no → unir `calle, numero, bloque_escalera, piso, puerta` (no nulos), y añadir
       `municipio` y `provincia` si existen.
  4. `codigo_postal`, `municipio`, `provincia` desde la dirección elegida.
- `observaciones` = legacy `observaciones` + (si `pendiente_revision=1`) prefijo
  `'Pendiente revisión: ' + motivo_revision`.
- `activo` = TRUE. `created_at` = `fecha_alta` (importante para análisis de cohortes).
- `num_pedidos` y `raciones`: se dejan en 0 y se recalculan al final (6.4).
- **Importar el cliente `DESCONOCIDO`** (id_cliente=2) tal cual.
- Guardar mapa `map_cliente: {id_cliente_legacy -> id_clientes_mysql}`.

#### C. `jornadas` + `franjas` + `pedidos` + `detalle_pedidos` → `pedidos` + `pedido_lineas`

Por cada `pedidos` legacy (1:1 con `pedidos` MySQL):

- `cliente_id` = `map_cliente[id_cliente]`.
- `fecha_pedido` (datetime):
  - `fecha` = `jornadas[id_jornada].fecha`.
  - `hora` = `franjas[id_franja].hora_entrega` si `id_franja` no NULL; si NULL →
    `'13:00'` (placeholder documentado; afecta a 133 pedidos).
  - `datetime = fecha + ' ' + hora`.
- `pax` = `SUM(detalle_pedidos.raciones)` del pedido (NULL→0). Si `pax < 1`, **saltar
  el pedido** y loguearlo.
- `status`:

  | Legacy | MySQL |
  |---|---|
  | Realizado | `entregado` |
  | Anulado | `cancelado` |
  | Pendiente de aclarar | `nuevo` |

- `entregado` = True solo si `status='entregado'`.
- `recogido` = FALSE, `local_recogida` = FALSE (modalidad siempre `Desconocida`).
- `observaciones` = legacy `observaciones` + `dudas_pendientes` (si no vacío).
- `created_at` = `fecha_pedido` (para auditoría/analítica temporal).

Por cada `detalle_pedidos` del pedido:

- Saltar si `id_producto` es NULL (3 filas) y loguear.
- `arroz_id` = `map_arroz[id_producto]`.
- `raciones` = `detalle_pedidos.raciones` (NULL→0).
- `precio_unitario`:
  - Si `id_precio` válido → `precios[id_precio].precio_por_racion_centimos / 100.0`.
  - Si no → resolver por fecha: `precios` con
    `id_producto` igual y `vigente_desde <= fecha_pedido < vigente_hasta`; si no hay,
    usar `arroces.precio` actual.
- Insertar `pedido_lineas(pedido_id, arroz_id, precio_unitario, raciones)`.

#### D. `anotaciones` (opcional, decisión D8)

Si se decide conservar:

```sql
CREATE TABLE anotaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATE NOT NULL,
  tipo VARCHAR(50),
  concepto VARCHAR(255),
  observaciones TEXT
);
```

Migrar: `fecha` = `jornadas.fecha` (join `id_jornada`), `tipo`, `concepto`,
`observaciones`. Las de tipo `Total` pueden usarse para **validar** la migración
(comparar raciones/día).

### 6.2 Estructura del script (pseudocódigo)

```python
import sqlite3, mysql.connector
# 1. Conectar sqlite (Datos/Arroces_Llopis.db) y mysql (credenciales de backend/.env)
# 2. Cargar en memoria: productos, precios, clientes, direcciones, jornadas, franjas,
#    pedidos, detalle_pedidos (con dicts y agrupaciones)
# 3. Migrar arroces + historico_precios (construir map_arroz)
# 4. Migrar clientes (construir map_cliente)
# 5. Migrar pedidos + pedido_lineas (usando map_arroz y map_cliente)
# 6. (opcional) Migrar anotaciones
# 7. Recalcular clientes.num_pedidos y clientes.raciones
# 8. commit y log de filas saltadas/errores
```

Insertar en **bulk** (`executemany`) y dentro de una transacción. No usar los modelos
SQLAlchemy para el bulk (más lento); `mysql.connector` con `executemany` es suficiente.

### 6.3 Recalcular contadores de cliente (al final)

```sql
UPDATE clientes c
SET
  num_pedidos = (
    SELECT COUNT(*) FROM pedidos p
    WHERE p.cliente_id = c.id AND p.status <> 'cancelado' AND p.deleted_at IS NULL
  ),
  raciones = (
    SELECT COALESCE(SUM(p.pax), 0) FROM pedidos p
    WHERE p.cliente_id = c.id AND p.status <> 'cancelado' AND p.deleted_at IS NULL
  );
```

### 6.4 Triggers

Desactivar temporalmente antes del bulk si interfiere, y reactivar al final:

```sql
-- (opcional) para no disparar trg_clientes_num_pedidos_insert durante el bulk
ALTER TABLE pedidos DISABLE TRIGGER?  -- no válido en MySQL; en su lugar:
-- opción simple: ignorar y recalcular num_pedidos en 6.3 (el UPDATE sobrescribe el valor)
```

En la práctica **no hace falta tocar triggers**: el `UPDATE` de 6.3 sobrescribe
`num_pedidos`/`raciones` con el valor correcto.

---

## 7. Fase 4 — Verificación de la migración

Ejecutar y comprobar:

```sql
SELECT COUNT(*) FROM clientes;      -- esperado: 2973
SELECT COUNT(*) FROM pedidos;       -- esperado: 6103 (menos los pax<1 saltados)
SELECT COUNT(*) FROM pedido_lineas; -- esperado: 7856 (7859 - 3 id_producto NULL)
SELECT COUNT(*) FROM arroces;       -- esperado: 14
SELECT COUNT(*) FROM historico_precios; -- esperado: 22
```

Ingresos históricos por año (deben coincidir legacy vs MySQL):

```sql
-- MySQL (nuevo modelo)
SELECT YEAR(fecha_pedido) y, ROUND(SUM(l.raciones * l.precio_unitario), 2) ingreso
FROM pedidos p JOIN pedido_lineas l ON l.pedido_id = p.id
WHERE p.status <> 'cancelado' AND p.deleted_at IS NULL
GROUP BY YEAR(fecha_pedido) ORDER BY y;
```

```sql
-- Legacy (control, ejecutar sobre la SQLite)
SELECT substr(j.fecha,1,4) y, ROUND(SUM(d.raciones * pr.precio_por_racion_centimos)/100.0, 2) ingreso
FROM detalle_pedidos d
JOIN pedidos p ON p.id_pedido = d.id_pedido
JOIN precios pr ON pr.id_precio = d.id_precio
JOIN jornadas j ON j.id_jornada = p.id_jornada
WHERE p.estado <> 'Anulado'
GROUP BY substr(j.fecha,1,4) ORDER BY y;
```

Ambos resultados deben ser iguales (salvo redondeo de céntimos). También comprobar
`SUM(raciones)`, número de pedidos por año y distribución por franja.

---

## 8. Fase 5 — Cambios en backend

### 8.1 `backend/app/models.py`

- `PedidoLinea`: añadir
  `raciones = db.Column(db.Integer, nullable=False, default=0)`.
- `Cliente`: añadir
  `municipio = db.Column(db.String(100))`,
  `provincia = db.Column(db.String(100))`.
- `HistoricoPrecio`: añadir
  `fecha_fin = db.Column(db.DateTime)`.

### 8.2 `backend/app/routes/orders.py` (`create_order`)

Cambiar el payload para aceptar **N líneas** manteniendo retrocompatibilidad:

```python
# order_data puede venir así (nuevo):
#   "order": { "lines": [{"arroz_id": 1, "pax": 4}, {"arroz_id": 8, "pax": 2}],
#              "recogida": true, "observaciones": "..." }
# o así (viejo):
#   "order": { "arroz_id": 1, "pax": 4, "recogida": true }

lines = order_data.get('lines')
if lines:
    items = [(int(l['arroz_id']), int(l['pax'])) for l in lines]
else:
    items = [(int(order_data['arroz_id']), requested_pax)]

total_pax = sum(pax for _, pax in items)
# validar: total_pax >= 2, cada pax >= 0
# disponibilidad del slot: usar total_pax (igual que ahora, con pedidos.pax)
# crear UN solo Pedido con pax=total_pax y UNA PedidoLinea por item:
#   PedidoLinea(pedido_id, arroz_id, precio_unitario=precio_vigente(arroz, fecha), raciones=pax)
# stock: por cada item, adjust_stock_from_order(arroz_id, pax)
```

Añadir helper `precio_vigente(arroz_id, fecha)` que resuelva desde `historico_precios`
(si no hay fila, usar `arroces.precio`). Ver 8.4.

### 8.3 `backend/app/routes/pedidos.py`

- `_serialize_pedido`: en cada línea añadir `"raciones": l.raciones`.
- `update_pedido_status`: al cancelar/descancelar, el bucle de stock ya itera líneas
  pero usa `pedido.pax`; cambiar a `l.raciones`:
  `adjust_stock_from_order(l.arroz_id, l.raciones, restore=True/False)`.
- `update_pedido` (PATCH `/pedidos/<id>`): hoy asume **una sola línea**
  (`current_linea = ...first()`, `linea.arroz_id`). Rehacer para:
  - Si llega `lines` → reemplazar líneas del pedido (borrar y reinsertar), actualizar
    `pax = suma`, y sincronizar stock (restaurar líneas viejas, restar nuevas).
  - Si llega `pax` a secas (sin `lines`) → repartir la variación sobre la primera línea
    (comportamiento compatible).
  - Si llega `arroz_id` a secas → aplicarlo a la primera línea (compatible).

### 8.4 `backend/app/routes/rices.py`

- En `POST /rices` (crear) ya inserta `HistoricoPrecio`; no cambiar (o añadir
  `fecha_inicio=now` explícito).
- En `PUT /rices/<id>` cuando cambia el precio:
  - Cerrar la fila abierta anterior: `UPDATE historico_precios SET fecha_fin=now
    WHERE item_id=:id AND tipo_item='venta' AND fecha_fin IS NULL`.
  - Insertar la nueva fila con `fecha_inicio=now`.
- (Opcional) Añadir `GET /rices/<id>/precios` que devuelva el histórico de precios del
  arroz ordenado por `fecha_inicio`.

### 8.5 `backend/app/routes/stats.py` (CRÍTICO)

Todas las métricas de ingreso usan hoy
`func.sum(Pedido.pax * PedidoLinea.precio_unitario)` **join** con líneas. Con pedidos
multi-línea esto **multiplica mal** (pax total × cada línea). Sustituir en **todas**
las queries de `stats.py`:

- Ingreso: `func.sum(PedidoLinea.raciones * PedidoLinea.precio_unitario)`.
- Raciones totales: puede seguir siendo `func.sum(Pedido.pax)` (equivale a la suma de
  líneas) **o** `func.sum(PedidoLinea.raciones)`.
- `count(DISTINCT Pedido.id)` se mantiene (número de pedidos/encargos).

Localizaciones afectadas (líneas aprox. en el archivo actual): 83-84, 103, 116, 128,
139, 210-211, 492, 729, 765. Revisar también el bloque de "best sellers" (líneas
102-108) para que agrupe por `Arroz` sumando `raciones` y `raciones*precio`.

### 8.6 `backend/app/routes/clients.py`

- `serialize_client`: añadir `municipio`, `provincia`.
- `update_client` (PUT): aceptar `municipio`, `provincia`.

### 8.7 `backend/app/utils/stock.py`

Sin cambios de firma. Solo asegurar que los llamadores pasen `linea.raciones` en lugar
de `pedido.pax`.

### 8.8 Nota sobre migraciones

El proyecto no usa Alembic. Aplicar los `ALTER TABLE` de la Fase 1 directamente con
SQL (o con `db.create_all()` tras editar los modelos si la BD estuviera vacía; **no
usar `create_all` aquí** porque ya existen las tablas).

---

## 9. Fase 6 — Cambios en frontend

### 9.1 `frontend/src/types/index.ts`

- `PedidoLinea`: añadir `raciones: number;`.
- `Cliente`: añadir `municipio?: string; provincia?: string;`.
- `OrderCreateRequest['order']`: añadir
  `lines?: { arroz_id: number; pax: number }[];` (convivir con `arroz_id`/`pax`).

### 9.2 `frontend/src/components/OrderWizard/OrderWizard.tsx`

- `handleConfirm`: **no** iterar `createOrder` por item. Enviar **una sola** llamada:

```ts
await createOrder({
  date,
  time: activeSlot.time,
  client: { id: client?.id ?? null, nombre: ..., telefono: phone, direccion: ..., codigo_postal: ... },
  order: {
    lines: finalItems.map(i => ({ arroz_id: i.rice.id, pax: i.pax })),
    recogida,
    observaciones: observaciones || undefined,
  },
});
```

- Mantener el resto del flujo (pasos, carrito `items`, cambios de slot).

### 9.3 `frontend/src/api/pedidos.ts`

- Sin cambios (el tipo de `OrderCreateRequest` ya actualizado en 9.1).

### 9.4 Revisión de renderizados

- Buscar usos de `linea.precio_unitario` / `pedido.pax` en
  [DashboardPage](C:/Users/fgarcia/ArrocesLlopis/ArrocesLlopis/frontend/src/pages/DashboardPage.tsx),
  [RepartosPage](C:/Users/fgarcia/ArrocesLlopis/ArrocesLlopis/frontend/src/pages/RepartosPage.tsx)
  y componentes de detalle: el total en € de un pedido multi-línea debe ser
  `sum(lineas: raciones * precio_unitario)`, no `pax * precio de una línea`.
- [StepConfirm.tsx](C:/Users/fgarcia/ArrocesLlopis/ArrocesLlopis/frontend/src/components/OrderWizard/StepConfirm.tsx)
  ya muestra cada item con su subtotal; verificar que el total usa todos los `items`.

---

## 10. Fase 7 — Documentación a actualizar

- [database/schema.sql](C:/Users/fgarcia/ArrocesLlopis/ArrocesLlopis/database/schema.sql):
  alinear con el esquema real (o añadir comentario apuntando a la migración). Actualizar
  `pedidos` (sin `arroz_id`), `pedido_lineas` (con `raciones`), `clientes` (con
  `municipio`/`provincia`), `historico_precios` (con `fecha_fin`).
- [compartido.md](C:/Users/fgarcia/ArrocesLlopis/ArrocesLlopis/compartido.md):
  - Sección "Creación de Pedido": documentar payload con `lines`.
  - Sección "Listado de Pedidos": documentar `raciones` en cada línea.
  - Añadir endpoint de histórico de precios si se implementa.
- [Docs/base-datos.md](C:/Users/fgarcia/ArrocesLlopis/ArrocesLlopis/Docs/base-datos.md):
  reflejar el modelo evolucionado.

---

## 11. Orden de ejecución / checklist

1. ☐ Fase 0: backup `mysqldump`.
2. ☐ Fase 1: `ALTER TABLE`s (archivo SQL).
3. ☐ Fase 2: `TRUNCATE` de tablas transaccionales.
4. ☐ Fase 3: escribir y ejecutar `database/migrate_sqlite_to_mysql.py`.
5. ☐ Fase 4: queries de verificación (recuentos + ingresos por año).
6. ☐ Fase 5: cambios backend (`models.py`, `orders.py`, `pedidos.py`, `rices.py`,
   `stats.py`, `clients.py`).
7. ☐ Fase 6: cambios frontend (`types`, `OrderWizard`, revisión de renderizados).
8. ☐ Validar: `python -m pytest backend/tests` (si aplica), `cd frontend && npm run build`
   y `npm run lint`.
9. ☐ Fase 7: actualizar `schema.sql`, `compartido.md`, `Docs/base-datos.md`.

---

## 12. Riesgos y notas

- **`stats.py` es el punto más delicado**: sin el cambio de 8.5, todos los ingresos
  quedarán mal con pedidos multi-línea. Validar con un pedido de 2 líneas a mano.
- **Disponibilidad**: al migrar, los pedidos históricos ocuparán slots del pasado; no
  afecta a la operativa (solo se consultan fechas futuras).
- **Pedidos sin franja (133)**: se asignan a `13:00` como placeholder; documentar para
  no confundir en analítica por franja.
- **`detalle_pedidos` con `id_producto` NULL (3)**: se descartan (no se puede mapear).
- La legacy no trae `modalidad` (entrega/recogida) útil; los históricos quedarán como
  no-recogida (FALSE) por defecto.
