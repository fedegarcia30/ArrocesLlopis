# Diagrama de relaciones - Arroces Llopis

Esquema obtenido de la base de datos MySQL configurada actualmente.

## Vista interactiva

Abre [`diagrama-bbdd.html`](../frontend/public/diagrama-bbdd.html) en el navegador o visita `/diagrama-bbdd.html` con el servidor de Vite iniciado.

```mermaid
erDiagram
    CLIENTES ||--o{ PEDIDOS : "realiza"
    USUARIOS ||--o{ PEDIDOS : "tiene asignados"
    PEDIDOS ||--|{ PEDIDO_LINEAS : "contiene"
    ARROCES ||--o{ PEDIDO_LINEAS : "aparece en"
    PEDIDOS ||--o| PEDIDO_FEEDBACK : "puede tener"

    ARROCES ||--o{ ARROZ_INGREDIENTES : "usa"
    INGREDIENTES ||--o{ ARROZ_INGREDIENTES : "forma parte de"

    PROVEEDORES ||--o{ COMPRAS : "recibe"
    COMPRAS ||--|{ COMPRA_LINEAS : "contiene"
    INGREDIENTES ||--o{ COMPRA_LINEAS : "se compra en"

    CLIENTES {
        int id PK
        varchar nombre
        varchar telefono
        varchar direccion
        varchar codigo_postal
        text observaciones
        int num_pedidos
        int raciones
        varchar municipio
        varchar provincia
        boolean activo
        varchar direccion_limpia
        decimal latitud
        decimal longitud
        timestamp deleted_at
    }

    USUARIOS {
        int id PK
        varchar username UK
        varchar password_hash
        enum rol
        boolean activo
    }

    PEDIDOS {
        int id PK
        int cliente_id FK
        int usuario_asignado_id FK
        int pax
        datetime fecha_pedido
        text observaciones
        enum status
        boolean entregado
        boolean recogido
        boolean local_recogida
        int review
        text comentarios_recogida
        timestamp deleted_at
    }

    PEDIDO_LINEAS {
        int id PK
        int pedido_id FK
        int arroz_id FK
        decimal precio_unitario
        int raciones
    }

    PEDIDO_FEEDBACK {
        int id PK
        int pedido_id FK
        int rating
        text comentario
    }

    ARROCES {
        int id PK
        varchar nombre UK
        decimal precio
        varchar caldo
        boolean disponible
        timestamp deleted_at
    }

    INGREDIENTES {
        int id PK
        varchar nombre UK
        varchar unidad_medida
        decimal stock_actual
        decimal stock_minimo
        decimal precio_actual
        enum tipo
    }

    ARROZ_INGREDIENTES {
        int id PK
        int arroz_id FK
        int ingrediente_id FK
        decimal cantidad_por_racion
    }

    PROVEEDORES {
        int id PK
        varchar nombre
        varchar contacto
        varchar telefono
        varchar email
    }

    COMPRAS {
        int id PK
        int proveedor_id FK
        date fecha_compra
        decimal total
        text observaciones
    }

    COMPRA_LINEAS {
        int id PK
        int compra_id FK
        int ingrediente_id FK
        decimal cantidad
        decimal precio_unitario
    }

    HISTORICO_PRECIOS {
        int id PK
        int item_id
        enum tipo_item
        decimal precio
        datetime fecha_inicio
        datetime fecha_fin
    }
```

## Relaciones

| Origen | Destino | Cardinalidad | Clave |
|---|---|---|---|
| clientes | pedidos | 1:N | `pedidos.cliente_id -> clientes.id` |
| usuarios | pedidos | 1:N opcional | `pedidos.usuario_asignado_id -> usuarios.id` |
| pedidos | pedido_lineas | 1:N | `pedido_lineas.pedido_id -> pedidos.id` |
| arroces | pedido_lineas | 1:N | `pedido_lineas.arroz_id -> arroces.id` |
| pedidos | pedido_feedback | 1:0/1 | `pedido_feedback.pedido_id -> pedidos.id` |
| arroces | arroz_ingredientes | 1:N | `arroz_ingredientes.arroz_id -> arroces.id` |
| ingredientes | arroz_ingredientes | 1:N | `arroz_ingredientes.ingrediente_id -> ingredientes.id` |
| proveedores | compras | 1:N | `compras.proveedor_id -> proveedores.id` |
| compras | compra_lineas | 1:N | `compra_lineas.compra_id -> compras.id` |
| ingredientes | compra_lineas | 1:N | `compra_lineas.ingrediente_id -> ingredientes.id` |

`historico_precios` no tiene claves foraneas: `item_id` identifica indirectamente un arroz o ingrediente segun `tipo_item`.

`pedido_feedback.pedido_id` es unico, por lo que cada pedido puede tener como mucho un registro de feedback.

La base de datos tambien contiene las vistas `vista_pedidos_detallados` y `vista_stock_critico`. Ambas son consultas derivadas y no crean relaciones fisicas adicionales.
