# Base de Datos - Arroces Llopis

## Motor
MySQL. Schema en `database/schema.sql`. ORM: SQLAlchemy (backend/app/models.py).

## Modelos ORM

### Cliente (`clientes`)
```python
id, nombre, telefono, direccion, codigo_postal, observaciones
num_pedidos   # auto-actualizado por trigger MySQL
raciones      # total de raciones históricas
activo        # soft-enable
created_at, updated_at, deleted_at  # soft-delete via deleted_at
```

### Arroz (`arroces`)
```python
id, nombre (unique), precio (Numeric 10,2)
caldo         # tipo de caldo usado
disponible    # si aparece en el catálogo activo
created_at, updated_at, deleted_at
```

### Usuario (`usuarios`)
```python
id, username (= email Firebase), password_hash
rol           # ENUM: 'admin' | 'cocinero' | 'repartidor' | 'gerente'
activo
created_at
```
> Nota: el rol 'encargado' existe en el frontend pero NO en el ENUM de MySQL. El backend rechazaría ese rol al crear usuarios.

### Pedido (`pedidos`)
```python
id
cliente_id    # FK → clientes
usuario_asignado_id  # FK → usuarios (opcional)
pax           # número de comensales
fecha_pedido  # DateTime (incluye hora del slot)
observaciones
status        # ENUM: 'nuevo'|'preparando'|'listo'|'entregado'|'cancelado'
entregado     # Boolean
recogido      # Boolean
local_recogida # true = recogen en local, false = domicilio
review        # puntuación (1-5?)
comentarios_recogida
created_at, updated_at, deleted_at
```

### PedidoLinea (`pedido_lineas`)
```python
id
pedido_id     # FK → pedidos
arroz_id      # FK → arroces
precio_unitario  # snapshot del precio en el momento del pedido
```
> Un pedido puede tener múltiples líneas (un cliente puede pedir varios tipos de arroz).

### Ingrediente (`ingredientes`)
```python
id, nombre (unique)
unidad_medida   # 'g', 'ml', 'ud', etc.
stock_actual    # Numeric 10,3
stock_minimo    # Numeric 10,3 (para alertas)
precio_actual   # Numeric 10,2 (último precio de compra)
created_at, updated_at
```

### ArrozIngrediente (`arroz_ingredientes`)
```python
id
arroz_id        # FK → arroces
ingrediente_id  # FK → ingredientes
cantidad_por_racion  # Numeric 10,3 (cuánto se usa por PAX)
```
> Vincula la receta de cada arroz con sus ingredientes.

### Proveedor (`proveedores`)
```python
id, nombre, contacto, telefono, email, created_at
```

### Compra (`compras`)
```python
id, proveedor_id, fecha_compra, total, observaciones, created_at
```

### CompraLinea (`compra_lineas`)
```python
id, compra_id, ingrediente_id, cantidad, precio_unitario
```

### HistoricoPrecio (`historico_precios`)
```python
id, item_id, tipo_item ('venta'|'compra'), precio, fecha_inicio
```

## Vistas MySQL
- `vista_pedidos_detallados` — pedidos con datos de cliente y líneas
- `vista_stock_critico` — ingredientes por debajo o cerca del stock mínimo

## Triggers MySQL
- Auto-actualiza `clientes.num_pedidos` en INSERT y soft-delete de pedidos

## Convenciones
- Soft delete: `deleted_at IS NOT NULL` = eliminado (nunca borrar físicamente clientes/pedidos/arroces)
- Todos los precios en `Numeric(10,2)` (euros)
- Cantidades de ingredientes en `Numeric(10,3)` (precisión para gramos/ml)
- `fecha_pedido` en `pedidos` es un `DateTime` que codifica tanto la fecha como el slot horario
