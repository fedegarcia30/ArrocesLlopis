# Guía de Usuario — Arroces Llopis Management

> Última actualización: Marzo 2026

---

## ¿Cuál es tu rol? Ve directamente a tu capítulo

| Rol | Ir a |
|-----|------|
| 👑 **Administrador** | [Capítulo 1](#capítulo-1-administrador) |
| 🧑‍💼 **Gerente / Encargado** | [Capítulo 2](#capítulo-2-gerente-y-encargado) |
| 👨‍🍳 **Cocinero** | [Capítulo 3](#capítulo-3-cocinero) |
| 🛵 **Repartidor** | [Capítulo 4](#capítulo-4-repartidor) |

---

## Introducción

### ¿Para qué sirve esta aplicación?

Arroces Llopis Management es el sistema de gestión interna de Arroces Llopis, un servicio de catering especializado en arroces. La aplicación centraliza todo el ciclo operativo del negocio: desde que un cliente llama para hacer un pedido hasta que el repartidor recoge los recipientes después de la entrega.

El sistema permite:
- Registrar y gestionar pedidos en franjas horarias con control de capacidad
- Organizar los repartos a domicilio y los turnos de recogida de recipientes
- Mantener el catálogo de arroces con precios y recetas
- Controlar el stock de ingredientes en tiempo real
- Gestionar la base de datos de clientes
- Ver estadísticas y métricas de negocio

### ¿Cómo funciona el negocio?

Arroces Llopis sirve pedidos en franjas de 15 minutos entre las 13:00 y las 15:30. Cada franja soporta un máximo de **6 pedidos** o **72 raciones** (lo que se alcance primero). Cuando un cliente hace un pedido, puede elegir:

- **Recogida en local**: el cliente viene al restaurante a recoger su arroz.
- **Reparto a domicilio**: el equipo lleva el arroz a la dirección del cliente en los recipientes propios del negocio. Días después, el repartidor vuelve a recoger esos recipientes.

### Los 5 roles del sistema

| Rol | Perfil típico | Acceso |
|-----|---------------|--------|
| **admin** | Propietario o responsable técnico | Todo el sistema |
| **gerente** | Responsable de negocio | Gestión completa excepto panel de analíticas avanzadas |
| **encargado** | Responsable operativo | Idéntico al gerente |
| **cocinero** | Personal de cocina | Solo consulta de pedidos y logística |
| **repartidor** | Equipo de reparto | Solo pantalla de repartos y recogidas |

> **Nota**: Gerente y encargado tienen exactamente los mismos permisos. La distinción es organizativa.

---

## Capítulo 1: Administrador

### Acceso y pantalla de inicio

El administrador inicia sesión en `/login` con su email y contraseña de Firebase. Al entrar, aterriza directamente en el **Panel de Negocio** (`/admin/dashboard`).

Desde la barra lateral puede acceder a **todas** las secciones:

| Icono | Sección | Ruta |
|-------|---------|------|
| 📅 | Calendario | `/calendar` |
| 📋 | Pedidos del día | `/diario` |
| 👥 | Clientes | `/clientes` |
| 🍚 | Arroces | `/arroces` |
| 📦 | Stock | `/stock` |
| 📊 | Panel de Negocio | `/admin/dashboard` |
| 🛵 | Repartos | `/repartos` |

---

### Pantalla: Panel de Negocio (`/admin/dashboard`)

El panel tiene tres pestañas: **Ingresos**, **Gastos y Stock** y **Clientes**.

#### Pestaña Ingresos

**Controles superiores:**
- **Período**: Semana / Mes / Trimestre / Semestre / Año Actual
- **Modo**: "Periodo completo" (incluye días futuros del período) vs "Hasta hoy" (solo datos confirmados hasta la fecha actual)

**Tarjetas de resumen** (con comparativa respecto al mismo período del año anterior):
- Ingresos totales (€)
- Raciones servidas
- Pedidos realizados
- Ticket medio por pedido

**Gráfico de tendencias históricas**: muestra la evolución mensual de hasta 4 años. Se puede seleccionar la métrica (ingresos, raciones, pedidos o clientes) y activar el modo acumulado (YTD). Haz clic en las etiquetas de año para mostrar u ocultar cada serie.

**Rankings del período**:
- Top arroces: los más pedidos por raciones e ingresos generados
- Mejores clientes: por raciones, pedidos y gasto total
- Por código postal: concentración geográfica de ingresos

#### Pestaña Gastos y Stock

- Total gastado en compras y número de facturas registradas
- Alertas de stock crítico (ingredientes por debajo del mínimo)
- Top ingredientes por gasto
- Top proveedores por facturación

#### Pestaña Clientes (Mapa)

Mapa interactivo con la distribución geográfica de los clientes que han pedido en el período seleccionado.

**Dos niveles de zoom:**
- **Vista código postal** (zoom < 12): una burbuja por CP. El tamaño es proporcional a las raciones totales. Doble clic para ampliar.
- **Vista calle** (zoom ≥ 12): marcador individual por cliente geoposicionado.

**Colores de marcadores:**
- 🟡 Dorado: cliente de recogida en local (período actual)
- 🩵 Teal: cliente de reparto a domicilio (período actual)
- 🟣 Índigo/Esmeralda: cliente del año de comparación
- Gradiente ámbar↔violeta: cliente presente en ambos períodos (más ámbar = más volumen en el período actual; más violeta = más en el período comparado)

**Controles del mapa:**
- Tabs de período: Mes / Trimestre / Semestre / Año
- Navegación ‹ › para cambiar al período anterior o siguiente
- Filtro: Ambos / Solo local / Solo reparto
- Botón "vs [período anterior]" para activar la comparativa

---

### Pantalla: Calendario (`/calendar`)

Vista mensual con un cuadro por cada día. Cada día muestra el número de pedidos y las raciones totales. Los días con pedidos están resaltados.

**Cómo usar**: Haz clic en un día para ir directamente a la pantalla de pedidos de ese día.

---

### Pantalla: Pedidos del día (`/diario`)

Esta es la pantalla operativa principal. Está dividida en dos paneles.

#### Panel izquierdo — Cuadrícula de disponibilidad

Muestra los 11 huecos horarios (13:00 a 15:30, cada 15 min). Cada hueco tiene un color según su estado:

| Color | Condición |
|-------|-----------|
| 🟢 Verde | 0–3 pedidos Y menos de 36 raciones |
| 🟡 Amarillo | 4–5 pedidos O entre 37–60 raciones |
| 🔴 Rojo | 6 pedidos O más de 60 raciones (lleno) |

Haz clic en un hueco para filtrar el panel derecho y ver solo los pedidos de esa franja.

#### Panel derecho — Lista de pedidos

- **Sin hueco seleccionado**: resumen por franja — una fila por horario con píldoras que muestran el tipo de arroz y las raciones.
- **Con hueco seleccionado**: detalle completo de cada pedido en esa franja.

Cada tarjeta de pedido muestra: cliente, tipo de arroz, raciones, horario, estado y tipo (local/reparto).

**Cambiar estado de un pedido**: Haz clic en el estado actual de la tarjeta para despleguar las opciones: `preparando`, `listo`, `entregado`, `cancelado`.

**Flujo de estados obligatorio:**
```
nuevo → preparando → listo → entregado
                                 ↓
              (cualquier estado) → cancelado
```

> ⚠️ Al cancelar un pedido, el stock de ingredientes se restaura automáticamente.

**Editar un pedido** (desliza a la izquierda la tarjeta): Abre el modal de edición donde puedes cambiar:
- Tipo de arroz
- Número de raciones (PAX)
- Dirección de entrega (si es reparto)
- Observaciones

Si cambias la dirección de un cliente que tiene más pedidos, el sistema te avisa antes de guardar y te muestra qué otros pedidos se verán afectados.

**Cancelar un pedido**: Dentro del modal de edición, pulsa "Cancelar pedido" y confirma. El pedido pasa a estado `cancelado` y el stock se restaura.

**Mover un pedido a otra franja** (arrastrar y soltar): Arrastra una tarjeta de pedido a otro hueco horario. Aparece un modal de confirmación con el resumen del cambio. Si el cliente tiene varios pedidos en el mismo hueco, todos se mueven juntos.

#### Crear un nuevo pedido

Pulsa **"NUEVO PEDIDO"** (arriba a la derecha) para abrir el asistente de 4 pasos.

**Paso 1 — Datos del cliente:**
1. Introduce el teléfono del cliente. El sistema busca automáticamente si ya existe.
2. Si existe: los datos se pre-rellenan (nombre, dirección, CP). Puedes editarlos.
3. Si no existe: rellena manualmente nombre (obligatorio), teléfono, dirección y CP.

**Paso 2 — Selección de arroz:**
1. Verás el catálogo de arroces disponibles con su precio por ración.
2. Selecciona un arroz y después introduce las raciones (PAX).
   - **Mínimo: 2 raciones**
   - **Máximo: las raciones que queden disponibles en el hueco seleccionado**
3. Pulsa "Siguiente".

**Paso 3 — Tipo de entrega:**
1. Elige entre **Recogida en local** o **Reparto a domicilio**.
2. Si es reparto, verifica o modifica la dirección de entrega.
3. Añade observaciones si el cliente tiene alguna indicación especial.

**Paso 4 — Confirmación:**
1. Revisa el resumen: tipo de arroz, raciones, horario, tipo de entrega.
2. ¿El cliente quiere más de un tipo de arroz? Pulsa **"Añadir otro arroz"**: vuelves al Paso 2 con el mismo cliente para añadir otro tipo. Repite cuantas veces necesites.
3. Cuando esté todo correcto, pulsa **"Confirmar Pedido"**.

> ℹ️ Cada tipo de arroz genera un pedido independiente en el mismo hueco. Si añades 2 tipos, se crean 2 pedidos, que cuentan como 2 hacia el límite de 6 por hueco.

> ⚠️ Si al confirmar el hueco ya está lleno (por otro pedido simultáneo), el sistema te informará y podrás elegir otro hueco.

**¿Puede un mismo cliente tener varios pedidos?** Sí. No hay restricción de un pedido por cliente. Puedes crear tantos pedidos como quieras para el mismo cliente, en el mismo hueco o en distintos huecos.

---

### Pantalla: Clientes (`/clientes`)

Lista paginada de todos los clientes con buscador (por nombre o teléfono).

**Columnas**: Nombre, Teléfono, Dirección, Número de pedidos históricos.

**Estadísticas del período** (Quarter/Month/Semester/YTD):
- Total de clientes activos
- Clientes nuevos vs. churned (sin actividad reciente)
- Power users (los de mayor gasto)

**Editar cliente**: Haz clic en el botón de editar (✏️) de cualquier fila. Puedes modificar nombre, teléfono, dirección, código postal y observaciones internas.

**Eliminar cliente**: El borrado es lógico (no físico). El cliente queda marcado como inactivo pero su historial de pedidos se conserva íntegro.

---

### Pantalla: Arroces (`/arroces`)

Catálogo de arroces en formato de tarjetas. Los arroces no disponibles aparecen atenuados con la etiqueta "No disponible".

Cada tarjeta muestra: nombre, tipo de caldo y precio por ración.

**Añadir un arroz nuevo**: Pulsa "Nuevo Arroz" y rellena nombre, caldo, precio y si está disponible.

**Editar un arroz**: Haz clic en la tarjeta. Puedes modificar nombre, caldo, precio y disponibilidad.

**¿Qué pasa al cambiar el precio?**
- El nuevo precio se aplica únicamente a los pedidos creados a partir de ese momento.
- Los pedidos existentes conservan el precio que tenían en el momento de su creación (instantánea de precio).
- El sistema registra el historial de precios automáticamente en `historico_precios`.

**Eliminar un arroz**: El arroz se marca como "no disponible" (borrado lógico). No desaparece del historial de pedidos pasados.

**Recetas de arroces:**
Cada arroz puede tener una receta asociada (lista de ingredientes con la cantidad necesaria por ración). La receta se gestiona desde el panel de Stock. Cuando se crea un pedido, el sistema descuenta automáticamente los ingredientes de la receta según las raciones pedidas. Cuando se cancela un pedido, el stock se restaura.

> ⚠️ Si un arroz no tiene receta definida, no hay descuento de stock al crear pedidos con ese arroz.

---

### Pantalla: Stock (`/stock`)

Cuadrícula de ingredientes con indicador visual de nivel:

| Color | Significado |
|-------|-------------|
| 🟢 Verde | Stock suficiente |
| 🟡 Amarillo | Aviso: stock ≤ 120% del mínimo |
| 🔴 Rojo | Crítico: stock ≤ stock mínimo |

Cada tarjeta muestra: nombre del ingrediente, stock actual (con unidad), stock mínimo y precio de referencia.

**Añadir un ingrediente nuevo**: Pulsa **"➕ Nuevo Ingrediente"**. Rellena el formulario:

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| Nombre | Nombre del ingrediente | `Pimentón dulce` |
| Unidad | Unidad de medida | `g`, `ml`, `kg`, `ud` |
| Stock Inicial | Cantidad actual disponible | `500` |
| Stock Mínimo | Umbral de alerta | `100` |
| Precio de Coste Referencia | Precio de coste por unidad (€) | `0.80` |

Pulsa **"Crear Ingrediente"** para añadirlo al sistema. Aparecerá inmediatamente en la cuadrícula.

> ℹ️ Una vez creado, el ingrediente puede asignarse a las recetas de los arroces para que el sistema descuente stock automáticamente al crear pedidos.

**Ajustar stock manualmente**: Haz clic en la tarjeta del ingrediente y modifica cualquier campo (nombre, unidad, stock actual, stock mínimo o precio de referencia). Útil para correcciones o mermas.

**Registrar una compra**: Pulsa **"🛒 Registrar Compra"**. Aparece un formulario con todos los ingredientes. Para los que has comprado, introduce la cantidad y el precio unitario. Puedes dejar en blanco los que no hayas comprado. Al confirmar:
- El stock de cada ingrediente se incrementa con la cantidad comprada.
- Se registra la compra en el histórico con proveedor, fecha e importe.
- El precio de coste del ingrediente se actualiza en el sistema.

**Gestionar recetas**: Desde la edición de cada ingrediente (o desde la edición de cada arroz) puedes asignar qué ingredientes y en qué cantidad por ración lleva cada arroz.

---

### Pantalla: Repartos (`/repartos`)

Ver el capítulo del Repartidor para una descripción completa de esta pantalla. El administrador tiene acceso total a todas las funcionalidades.

---

## Capítulo 2: Gerente y Encargado

Gerente y encargado tienen exactamente los mismos permisos. Al iniciar sesión, aterrizan en el **Calendario** (`/calendar`).

Tienen acceso a las siguientes secciones:

| Icono | Sección |
|-------|---------|
| 📅 | Calendario |
| 📋 | Pedidos del día |
| 👥 | Clientes |
| 🍚 | Arroces |
| 📦 | Stock |
| 🛵 | Repartos |

> ❌ **Sin acceso**: Panel de Negocio / Analíticas avanzadas / Mapa de clientes. Estas funciones son exclusivas del administrador.

Todo el funcionamiento de cada pantalla es **idéntico al del administrador** descrito en el Capítulo 1, con la única diferencia de que no existe el acceso al Panel de Negocio.

### Responsabilidades habituales del gerente

- Gestionar el día a día de los pedidos: crear, modificar, cambiar estados.
- Supervisar la disponibilidad de huecos y redistribuir pedidos si es necesario.
- Mantener actualizado el catálogo de arroces (precios, disponibilidad).
- Registrar compras de ingredientes y revisar el estado del stock.
- Consultar y actualizar la base de datos de clientes.
- Revisar el calendario para planificar la semana.

---

## Capítulo 3: Cocinero

### Acceso y pantalla de inicio

El cocinero inicia sesión y aterriza directamente en **Pedidos del día** (`/diario`).

Tiene acceso a:

| Icono | Sección |
|-------|---------|
| 📅 | Calendario |
| 📋 | Pedidos del día |
| 🛵 | Repartos |

> ❌ **Sin acceso**: Clientes, Arroces, Stock, Panel de Negocio.

### Lo que puede hacer el cocinero

#### Pantalla: Pedidos del día (`/diario`)

El cocinero ve exactamente la misma pantalla que el gerente pero **sin el botón "Nuevo Pedido"**. No puede crear pedidos.

Lo que sí puede:
- Ver todos los pedidos del día organizados por franjas horarias.
- Cambiar el estado de los pedidos según avanza la preparación:
  - **nuevo → preparando**: cuando empieza a preparar un arroz.
  - **preparando → listo**: cuando el arroz está listo para entregar o recoger.
  - **listo → entregado**: cuando el cliente lo recoge o se entrega.
- Ver si un pedido es de recogida en local o de reparto a domicilio.
- Consultar las observaciones del cliente (indicaciones especiales).
- Mover pedidos entre franjas si es necesario (arrastrar y soltar).

#### Lo que ve el cocinero en `/diario`

**Panel izquierdo** — cuadrícula de huecos horarios:

```
13:00  [🟢 2 pedidos · 14 rac · quedan 4/58]
13:15  [🟡 5 pedidos · 44 rac · quedan 1/28]
13:30  [🔴 6 pedidos · 72 rac · LLENO       ]
...
```

Haz clic en un hueco para ver el detalle en el panel derecho.

**Panel derecho** — sin hueco seleccionado (resumen del día):

Cada franja horaria muestra una fila con píldoras de colores. Cada píldora representa un pedido: muestra el nombre del arroz y las raciones. El color indica el estado:
- Sin color / neutro → `nuevo`
- Azul → `preparando`
- Verde → `listo`
- Gris → `entregado` o `cancelado`

**Panel derecho** — con hueco seleccionado (detalle):

Cada tarjeta de pedido muestra:
- Nombre del cliente
- Tipo de arroz y raciones
- 🏠 si es recogida en local / 🛵 si es reparto a domicilio
- Observaciones del cliente (si las hay)
- Estado actual (badge de color)

Para cambiar el estado: pulsa el badge de estado de la tarjeta y selecciona el siguiente.

#### Flujo de trabajo recomendado para el cocinero

1. Al empezar el turno, abre `/diario` con la fecha de hoy.
2. En la vista de resumen (sin seleccionar hueco), tienes una visión global de la carga del día.
3. Haz clic en el primer hueco con pedidos.
4. Para cada tarjeta de pedido en ese hueco:
   - Cuando empieces a prepararlo: cambia a `preparando`.
   - Cuando esté listo: cambia a `listo`.
   - Cuando el cliente lo recoja o el repartidor salga: cambia a `entregado`.
5. Pasa al siguiente hueco.

> ✅ Un hueco cuyos pedidos están todos en `listo` o `entregado` está gestionado.

> ℹ️ Si la vista está en resumen (sin hueco seleccionado), las píldoras de colores te dan una visión rápida de qué está por preparar. Haz clic en un hueco para ver el detalle.

#### Pantalla: Calendario (`/calendar`)

El cocinero puede consultar el calendario para ver la carga de trabajo de días futuros y anticipar preparaciones.

#### Pantalla: Repartos (`/repartos`)

El cocinero puede acceder a la pantalla de repartos, principalmente para coordinar con el repartidor o consultar las entregas del día.

---

## Capítulo 4: Repartidor

### Acceso y pantalla de inicio

El repartidor inicia sesión y aterriza directamente en **Repartos** (`/repartos`). Es la única pantalla a la que tiene acceso.

La pantalla tiene **dos pestañas**: **Repartos** y **Recogidas**. Puedes navegar entre ellas deslizando o pulsando las pestañas. Por defecto:
- Lunes a jueves → abre en **Recogidas** (días de recogida de recipientes).
- Viernes a domingo → abre en **Repartos** (días de entrega).

---

### Pestaña: Repartos

Aquí gestionas las **entregas de arroz a domicilio** de la semana actual.

> ℹ️ Solo aparecen los pedidos con **reparto a domicilio** (`local_recogida = false`). Los pedidos de recogida en local no aparecen aquí porque el cliente ya los recoge por su cuenta.

#### Lo que ves

Una cuadrícula semanal (lunes a domingo). Cada día muestra el número de entregas pendientes. Los días sin entregas aparecen con "—".

**Haz clic en un día** para ver el detalle de entregas de ese día.

#### Detalle de un día

Los pedidos del día se agrupan por **franja horaria** y dentro de cada franja, por **cliente**.

Cada grupo (franja + cliente) aparece como una tarjeta (píldora) con:
- Nombre del cliente
- Arroces pedidos y raciones (ej: "Arroz Negro ×4")
- Dirección de entrega
- Teléfono de contacto
- Estado actual (pendiente o entregado)

Las franjas horarias donde todos los pedidos ya están entregados se **colapsan automáticamente** (muestra "✓ Todo entregado"). Puedes expandirlas pulsando en la cabecera.

#### Marcar como entregado

Pulsa la tarjeta del cliente. La tarjeta cambia a "entregado" (aspecto diferente).

Si el cliente tiene varios arroces pedidos (varios pedidos en el mismo hueco), todos se marcan como entregados a la vez.

#### Deshacer una entrega

Si marcaste como entregado por error, pulsa la tarjeta de nuevo. Aparece un modal de confirmación: "¿Anular el estado de [cliente]?". Confirma y el estado vuelve a `listo`.

#### Flujo de trabajo de entrega

1. Abre la pestaña **Repartos**.
2. Pulsa en el día de hoy (o el día que corresponda).
3. Ve franja por franja y para cada cliente:
   a. Comprueba la dirección y el teléfono.
   b. Entrega el pedido.
   c. Pulsa la tarjeta para marcarlo como entregado.
4. Cuando todas las franjas muestran "✓ Todo entregado", el día está completo.

---

### Pestaña: Recogidas

Aquí gestionas la **recogida de recipientes** de clientes a los que entregamos arroces días atrás.

El negocio sirve los arroces en sus propios recipientes. Cuando el repartidor hace una entrega, deja los recipientes con el cliente. Después —normalmente unos días más tarde— hay que volver a recoger esos recipientes.

> ℹ️ Solo aparecen pedidos de reparto (no de recogida en local) que estén en estado `entregado` y con la recogida de recipiente pendiente, de las últimas 4 semanas.

#### Lo que ves

Una lista agrupada por semana (de más reciente a más antigua). Cada semana solo se muestra si tiene recogidas pendientes.

Dentro de cada semana, los pedidos se agrupan por cliente. Cada tarjeta muestra el mismo contenido que en Repartos (nombre, arroces, dirección, teléfono).

#### Marcar una recogida como completada

Pulsa la tarjeta del cliente. Se abre el **modal de feedback** donde puedes:
- Puntuar la satisfacción del cliente de 1 a 10 estrellas (opcional).
- Añadir un comentario del cliente (opcional).
- Pulsar **"Guardar y marcar recogido"** para confirmar la recogida con el feedback introducido.
- Pulsar **"Saltar"** si no hay feedback que registrar, para marcar solo como recogido.

#### Deshacer una recogida

Si marcaste como recogido por error, pulsa la tarjeta (que aparece con aspecto diferente). Aparece el modal de confirmación para anular. El pedido vuelve a aparecer como pendiente de recogida.

#### Flujo de trabajo de recogida

1. Abre la pestaña **Recogidas**.
2. Ve semana por semana. Empieza por la más antigua (parte inferior).
3. Para cada cliente pendiente:
   a. Dirígete a su dirección.
   b. Recoge los recipientes.
   c. Pulsa la tarjeta.
   d. Si el cliente tiene algún comentario o quiere puntuar el servicio, regístralo en el modal.
   e. Pulsa "Guardar y marcar recogido" o "Saltar".
4. Cuando todas las tarjetas de una semana estén completadas, esa semana desaparece de la lista.

---

## Apéndice A: Restricciones y Reglas de Negocio

### Franjas horarias y capacidad

- **Horario**: 13:00 a 15:30, cada 15 minutos (11 franjas en total).
- **Límite por franja**: máximo **6 pedidos** O **72 raciones** (el que se alcance primero).
- El sistema valida la capacidad tanto en el frontend (para la experiencia de usuario) como en el backend (para evitar conflictos concurrentes).

### Semáforo de disponibilidad

| Estado | Condición |
|--------|-----------|
| 🟢 Verde | 0–3 pedidos Y menos de 36 raciones |
| 🟡 Amarillo | 4–5 pedidos O entre 37–60 raciones |
| 🔴 Rojo | 6 pedidos O más de 60 raciones |

### Creación de pedidos

- **PAX mínimo**: 2 raciones por pedido.
- **PAX máximo**: lo que reste de capacidad en la franja.
- Un mismo cliente puede tener varios pedidos en el mismo hueco o en diferentes.
- Cada tipo de arroz crea un pedido independiente (cuenta como 1 hacia el límite de 6).
- El precio del arroz queda fijado en el momento de crear el pedido.

### Stock

- Al crear un pedido, el stock de ingredientes de la receta del arroz se descuenta automáticamente.
- Al cancelar un pedido, el stock se restaura automáticamente.
- Si un arroz no tiene receta, no hay movimiento de stock.

### Precios

- Cambiar el precio de un arroz no afecta a los pedidos existentes.
- El historial de precios se registra automáticamente.

### Eliminación de datos

- Los clientes y arroces nunca se eliminan físicamente; se marcan como inactivos (borrado lógico).
- El historial de pedidos se conserva siempre, independientemente del estado del cliente o del arroz.

---

## Apéndice B: Preguntas frecuentes

**¿Qué hago si el cliente llama para cambiar de arroz o de raciones?**
Ve a `/diario`, busca el pedido, desliza a la izquierda para abrir el modal de edición y modifica lo que necesites.

**¿Qué hago si el cliente cancela?**
Desde el modal de edición, pulsa "Cancelar pedido". El stock se restaura automáticamente.

**¿Puedo crear un pedido para un cliente nuevo que no está en el sistema?**
Sí. En el Paso 1 del asistente, si el teléfono no existe, rellena los datos manualmente. El cliente se crea automáticamente al confirmar el pedido.

**¿Qué ocurre si dos personas intentan hacer un pedido en el mismo hueco al mismo tiempo y solo queda uno?**
El backend valida la disponibilidad en el momento de confirmar. El primero en confirmar ocupa el hueco; el segundo recibe un aviso de "hueco lleno" y puede elegir otra franja.

**¿Cómo sé qué pedidos son de recogida en local y cuáles son de reparto?**
En la tarjeta de pedido: un icono 🏠 indica recogida en local; 🛵 indica reparto a domicilio.

**¿El repartidor ve los pedidos de recogida en local?**
No. La pantalla de Repartos solo muestra pedidos de reparto a domicilio. Los pedidos de recogida en local los gestiona el personal del restaurante.

**¿Qué pasa con un arroz que desactivo?**
Deja de aparecer en el asistente de nuevo pedido (no se puede seleccionar para nuevos pedidos), pero los pedidos existentes con ese arroz se mantienen intactos.
