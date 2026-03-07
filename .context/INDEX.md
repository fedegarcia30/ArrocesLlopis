# Indice de Micro-Contextos

Antes de empezar una tarea, lee SOLO el contexto correspondiente a tu intención.
Esto ahorra tokens y acelera el trabajo.

## Mapa de Intención → Contexto

| Si la tarea es sobre... | Leer |
|-------------------------|------|
| Dashboard diario, pedidos, slots, drag-drop | `pedidos-dashboard.md` |
| Crear/modificar nuevo pedido (wizard) | `pedidos-dashboard.md` |
| Login, roles, permisos, guards de ruta | `auth-roles.md` |
| Catálogo de arroces (CRUD) | `catalogo-crud.md` |
| Clientes (buscar, editar, historial) | `catalogo-crud.md` |
| Stock, ingredientes, compras, recetas | `stock-inventario.md` |
| Panel admin, estadísticas, gráficos | `admin-stats.md` |
| CSS, estilos, colores, diseño visual | `estilos-ui.md` |
| Añadir nueva página o ruta | `nueva-pagina.md` |
| Calendario mensual | `pedidos-dashboard.md` |
| Repartos | `auth-roles.md` + `pedidos-dashboard.md` |
| Tipos TypeScript, interfaces | `tipos-api.md` |
| Contrato de API (endpoints) | `tipos-api.md` |

## Estructura de Documentación Completa

Para entendimiento profundo consultar `docs/`:
- `docs/arquitectura.md` — visión global del sistema
- `docs/api-referencia.md` — todos los endpoints con request/response
- `docs/base-datos.md` — modelos ORM y schema MySQL
- `docs/frontend.md` — componentes, hooks, patrones
- `docs/reglas-negocio.md` — límites de slots, roles, estados
- `docs/entorno-despliegue.md` — setup local y producción
