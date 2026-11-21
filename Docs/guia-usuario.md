# Guía de Usuario — Arroces Llopis Management

> Última actualización: Noviembre 2026

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
- **Período**: Semana / Mes / Trimestre / Semestre / Año.
- **Navegación de periodos**: por defecto se muestra siempre el **periodo actual**. Con **‹ ›** pasas al periodo anterior o siguiente (p. ej. del 4º Trimestre 2026 al 3º Trimestre 2026) y con el **desplegable de año** saltas al mismo periodo de otro año (p. ej. 4º Trimestre 2023). **"Actual"** vuelve al periodo en curso. No se puede avanzar más allá del periodo actual.
- **Modo**: "Periodo completo" (incluye días futuros del período) vs "Hasta hoy" (solo datos confirmados hasta la fecha actual). En periodos pasados se usa siempre el periodo completo.
- La comparativa es siempre con el **mismo periodo del año anterior** al elegido.
- La navegación de periodos funciona igual en las pestañas **Ingresos**, **Gastos y Stock** y **Clientes**. En Clientes los periodos son de calendario (p. ej. el trimestre natural); además están **Histórico** y **Fechas** (rango libre).

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
- Filtro: Ambos / 🏠 Local / 🛵 Reparto
- Botón **"⇄ vs [período anterior]"** para activar o desactivar la comparativa con el mismo periodo del año anterior
- La leyenda queda en la esquina inferior derecha, compacta para no tapar el mapa

---

### Pantalla: Calendario (`/calendar`)

El mes entero en una pantalla (iPad, PC y móvil), con semanas de lunes a domingo.

- **‹ Mes ›** cambia de mes; **"Hoy"** vuelve al mes actual. Arriba se muestran los **pedidos y raciones totales del mes**.
- Cada día muestra las **raciones** y el número de pedidos (en móvil, solo las raciones).
- El **color dorado** es más intenso cuanto más carga tiene el día respecto al resto del mes, para ver de un vistazo los días fuertes.
- El día de **hoy** aparece recuadrado; los días pasados, atenuados.
- Toca un día para abrir sus pedidos en `/diario`.

---

### Pantalla: Pedidos del día (`/diario`)

Esta es la pantalla operativa principal. Es un **tablero fijo** que muestra **la jornada completa en una sola pantalla**, sin scroll, en tablet, PC y móvil.

**Cabecera:**
- **‹ Día ›**: pasa al día anterior o siguiente. Toca la fecha para abrir el calendario. **"Hoy"** vuelve al día actual.
- Resumen del día: pedidos, raciones, repartos 🛵 y pedidos **por preparar**.
- **"+ Nuevo pedido"** (en móvil, el botón redondo **+** junto a la fecha).

**Producción**: raciones totales de cada arroz del día y cuántas **faltan** por hacer.

**Resaltar**: Todos · Por preparar · 🛵 · 🏠. Estos botones **no ocultan** pedidos: atenúan los que no coinciden, así el tablero nunca cambia de forma. **"Cancelados N"** abre la lista de pedidos cancelados (solo aparece si hay alguno).

**El tablero**: una fila por franja (13:00 a 15:30) y **6 casillas por fila**, una por cada pedido que admite la franja.

- **Columna de la hora**: la hora, una barra de raciones ocupadas sobre 72 y un borde de color:

| Color | Condición |
|-------|-----------|
| 🟢 Verde | 0–3 pedidos Y menos de 36 raciones |
| 🟡 Amarillo | 4–5 pedidos O entre 37–60 raciones |
| 🔴 Rojo | 6 pedidos O más de 60 raciones (lleno) |

- **Casilla con pedido**: cliente, raciones totales (número dorado), arroces, 🛵 si es a domicilio y 📝 si tiene observaciones. El color indica el estado: dorado → confirmado, azul → preparando, verde → listo, gris atenuado → entregado. En móvil la casilla muestra solo las raciones y la abreviatura de los arroces (p. ej. "NEG+SEÑ").
- **Casilla vacía con +**: hueco libre. Tócala para crear un pedido en esa franja.
- **Casilla rayada**: la franja no admite más pedidos porque ya no le quedan raciones.

En el día de hoy, la franja en curso aparece resaltada (**"ahora"**). La pantalla **se refresca sola cada minuto**.

**Ver un pedido y cambiar su estado**: toca la casilla. Se abre el detalle con el teléfono (se puede llamar tocándolo), la dirección, los arroces, el importe y las observaciones, junto a cuatro botones grandes: **Confirmado · Preparando · Listo · Entregado**. Toca el estado nuevo y el panel se cierra.

**Editar o cancelar un pedido**: en el detalle, pulsa **"✏️ Editar pedido"**. Se abre la hoja de pedido, donde puedes cambiar arroces, raciones, día y hora, tipo de entrega, dirección y observaciones, o **cancelar** el pedido. Los pedidos cancelados se pueden reactivar desde "Cancelados".

Si cambias la dirección, la hoja pregunta si es la **dirección habitual del cliente** (actualiza su ficha) o **solo para este pedido** (se anota en observaciones).

**Mover un pedido a otra franja** (arrastrar y soltar): arrastra la casilla a otra fila. En tablet o móvil, mantenla pulsada medio segundo y arrastra. Aparece un modal de confirmación con el resumen del cambio. Si el cliente tiene varios pedidos en el mismo hueco, todos se mueven juntos.

#### Crear un nuevo pedido

Pulsa **"+ Nuevo pedido"** (arriba). No hace falta seleccionar antes una franja: si hay una seleccionada con hueco, se propone como hora.

Se abre la **hoja de pedido**, una sola pantalla con todo lo necesario. En tablet se ve en dos columnas (cliente y entrega a la izquierda, arroces y hora a la derecha); en móvil, en una columna. Los bloques se pueden rellenar **en cualquier orden**, según vaya hablando el cliente:

1. **Cliente** — escribe el teléfono **o** el nombre (mínimo 3 caracteres). Toca el cliente en la lista.
   - Si no existe, pulsa **"+ Crear cliente nuevo"**: se rellenan teléfono o nombre con lo que ya escribiste.
   - Para un cliente habitual verás sus avisos (alergias, notas de su ficha) y sus **últimos pedidos**. **"Repetir"** carga los mismos arroces, raciones y tipo de entrega.
2. **Arroces** — toca un arroz para añadirlo (2 raciones por defecto). Ajusta las raciones con **− / +** o con los atajos **2 · 4 · 6 · 8 · 10 · 12**. Puedes añadir varios arroces: todos van en el **mismo pedido**.
3. **Día y hora** — elige el día (hoy, mañana, los próximos días u "Otra" fecha) y la franja. Cada franja muestra las raciones y pedidos que le quedan; las que no tienen hueco para el pedido aparecen desactivadas.
4. **Entrega** — **Recoge en local** o **A domicilio**. Si es a domicilio, se rellena la dirección de la ficha del cliente; corrígela si hace falta.
5. **Observaciones** (opcional) — atajos para las notas más habituales o texto libre.

La barra inferior resume el pedido (cliente, día, hora, entrega, raciones y total) e indica **qué falta**. Cuando está todo, pulsa **"Confirmar pedido"**. Aparece un aviso de confirmación y, si el pedido es para otro día, la pantalla salta a ese día.

> ℹ️ Varios arroces del mismo cliente forman **un único pedido**, que cuenta como 1 hacia el límite de 6 pedidos por franja. Las raciones de todos los arroces suman para el límite de 72.

> ⚠️ Si al confirmar la franja ya está llena (por otro pedido simultáneo), la hoja muestra el aviso, refresca la disponibilidad y puedes elegir otra hora sin perder lo escrito.

> 🔒 **Días pasados**: solo el administrador puede crear pedidos con fecha pasada o modificar, mover, cancelar o reactivar pedidos de días anteriores. El resto de usuarios ve esos pedidos y puede seguir cambiando su estado (preparando, listo, entregado) y marcar las recogidas de recipientes, pero no ve el botón "Editar pedido" (aparece un aviso 🔒), no puede arrastrarlos y la hoja de pedido no deja elegir fechas pasadas. Si pulsas "+ Nuevo pedido" mientras ves un día pasado, el pedido se propone para hoy.

**¿Puede un mismo cliente tener varios pedidos?** Sí. No hay restricción de un pedido por cliente. Puedes crear tantos pedidos como quieras para el mismo cliente, en el mismo hueco o en distintos huecos.

---

### Pantalla: Clientes (`/clientes`)

Formato **lista + ficha**. En iPad y PC la lista queda a la izquierda y la ficha del cliente seleccionado a la derecha. En móvil, la ficha se abre a pantalla completa (botón **‹** para volver).

**Lista**: buscador por nombre o teléfono y orden **A–Z** o **Más pedidos**. Cada fila muestra nombre, teléfono, dirección y número de pedidos; ⚠ indica que el cliente tiene observaciones (alergias, avisos). Al final, **"Cargar más"** muestra los siguientes clientes.

**Ficha del cliente**:
- **📞 Llamar** y **📈 Análisis** (tendencia semanal e historial completo).
- **Datos** editables: nombre, teléfono, código postal, dirección y observaciones. Pulsa **"Guardar cambios"**.
- **Últimos pedidos**: fecha, hora, arroces, 🏠/🛵, importe y estado.

**Borrar cliente**: dentro de la ficha, **"Borrar cliente"** y confirma. El borrado es lógico: el cliente queda inactivo y su historial de pedidos se conserva.

---

### Pantalla: Arroces (`/arroces`)

Catálogo en tarjetas, con los arroces disponibles primero. Arriba se indica cuántos hay disponibles ("7/8 disponibles"). Cada tarjeta muestra nombre, caldo y precio por ración.

**Disponible / No disponible**: cada tarjeta tiene un **interruptor**. Es la acción del día a día: si hoy no hay un ingrediente (p. ej. bogavante), desactívalo y ese arroz deja de aparecer en la hoja de pedido. Vuelve a activarlo cuando haya. Los pedidos existentes no se ven afectados.

**Añadir un arroz nuevo**: pulsa **"+ Nuevo arroz"** y rellena nombre, caldo y precio.

**Editar un arroz**: toca la tarjeta (nombre o precio). Puedes modificar nombre, caldo y precio, y gestionar su receta.

**¿Qué pasa al cambiar el precio?**
- El nuevo precio se aplica únicamente a los pedidos creados a partir de ese momento.
- Los pedidos existentes conservan el precio que tenían en el momento de su creación (instantánea de precio).
- El sistema registra el historial de precios automáticamente en `historico_precios`.

**Retirar un arroz de la carta**: usa el interruptor "No disponible". El arroz no se borra y su historial de pedidos se conserva.

**Recetas de arroces:**
Cada arroz puede tener una receta asociada (lista de ingredientes con la cantidad necesaria por ración). La receta se gestiona desde el panel de Stock. Cuando se crea un pedido, el sistema descuenta automáticamente los ingredientes de la receta según las raciones pedidas. Cuando se cancela un pedido, el stock se restaura.

> ⚠️ Si un arroz no tiene receta definida, no hay descuento de stock al crear pedidos con ese arroz.

---

### Pantalla: Stock (`/stock`)

Los ingredientes aparecen en tarjetas compactas, **ordenados por urgencia**: primero los que están bajo mínimo, después los próximos al mínimo y al final el resto.

| Color | Significado |
|-------|-------------|
| 🟢 Verde | Stock suficiente |
| 🟡 Amarillo | Próximo a mínimo: stock ≤ 120% del mínimo |
| 🔴 Rojo | Bajo mínimo: stock ≤ stock mínimo |

Cada tarjeta muestra el nombre, el stock actual, una **barra de nivel** (la marca central es el stock mínimo), el mínimo y el precio de coste.

**Controles**: pestañas **Alimentación / Otros**, filtros **Bajo mínimo** y **Próximo** (con su recuento) y buscador.

**Añadir un ingrediente nuevo**: Pulsa **"+ Ingrediente"**. Rellena el formulario:

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| Nombre | Nombre del ingrediente | `Pimentón dulce` |
| Unidad | Unidad de medida | `g`, `ml`, `kg`, `ud` |
| Stock Inicial | Cantidad actual disponible | `500` |
| Stock Mínimo | Umbral de alerta | `100` |
| Precio de Coste Referencia | Precio de coste por unidad (€) | `0.80` |

Pulsa **"Crear Ingrediente"** para añadirlo al sistema. Aparecerá inmediatamente en la cuadrícula.

> ℹ️ Una vez creado, el ingrediente puede asignarse a las recetas de los arroces para que el sistema descuente stock automáticamente al crear pedidos.

**Ajustar stock manualmente**: Toca la tarjeta del ingrediente y modifica cualquier campo (nombre, unidad, stock actual, stock mínimo o precio de referencia). Útil para correcciones o mermas.

**Registrar una compra**: Pulsa **"🛒 Registrar compra"**. Aparece la lista de ingredientes de la pestaña activa, con los que están bajo mínimo primero. Para cada uno que hayas comprado, introduce la cantidad y el precio por unidad; deja en blanco el resto. Abajo se va calculando el **total de la compra**. Al confirmar:
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

El cocinero ve exactamente la misma pantalla que el gerente pero **sin el botón "+ Nuevo pedido"**. No puede crear pedidos.

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

El mismo tablero que el gerente (ver Capítulo 1), con la jornada entera en pantalla. Lo más útil para cocina:

- **Producción**: raciones de cada arroz del día y cuántas faltan.
- **"Por preparar"**: atenúa todo lo que ya está listo o entregado.
- Color de cada casilla: dorado → confirmado, azul → preparando, verde → listo, gris → entregado.

#### Flujo de trabajo recomendado para el cocinero

1. Al empezar el turno, abre `/diario`: se abre en el día de hoy con la franja actual resaltada.
2. Mira la **producción** para planificar las paellas del día.
3. Pulsa **"Por preparar"**.
4. Para cada pedido, toca la casilla y pulsa **Preparando**, después **Listo** y, cuando salga, **Entregado**.
5. Cuando no queda ninguna casilla dorada ni azul, la producción del día está hecha.

#### Pantalla: Calendario (`/calendar`)

El cocinero puede consultar el calendario para ver la carga de trabajo de días futuros y anticipar preparaciones.

#### Pantalla: Repartos (`/repartos`)

El cocinero puede acceder a la pantalla de repartos, principalmente para coordinar con el repartidor o consultar las entregas del día.

---

## Capítulo 4: Repartidor

### Acceso y pantalla de inicio

El repartidor inicia sesión y aterriza directamente en **Repartos** (`/repartos`). Es la única pantalla a la que tiene acceso. Está pensada para usarse con el móvil en la mano.

La pantalla tiene **dos pestañas**: **♻️ Recogidas** y **🛵 Repartos**. Cada pestaña muestra en rojo cuántas tareas quedan pendientes. Puedes cambiar de pestaña tocándolas o deslizando el dedo en horizontal. Por defecto:
- Lunes a jueves → abre en **Recogidas**.
- Viernes a domingo → abre en **Repartos**.

---

### Pestaña: Repartos

Las **entregas de arroz a domicilio**. Los pedidos de recogida en local no aparecen.

#### Lo que ves

- **‹ semana ›**: navega entre semanas (el botón **"Hoy"** vuelve a la actual).
- **Días de la semana**: cada día muestra cuántas entregas quedan pendientes, ✓ si ya están todas hechas o — si no hay repartos. Se abre directamente en **hoy**.
- **Barra de progreso** del día: "5/8 entregados".
- **Tarjetas** en orden de hora. Cada tarjeta muestra la hora, el cliente, los arroces con sus raciones, las observaciones (en amarillo) y la dirección. Si el cliente tiene varios pedidos en la misma franja, van en una sola tarjeta y se entregan juntos.

#### Botones de cada tarjeta

- **📞 Llamar**: llama al cliente.
- **🧭 Cómo llegar**: abre Google Maps con la ruta hasta la dirección.
- **✓ Entregado**: marca la entrega como hecha. La tarjeta se reduce a una línea en verde.

Tocar la tarjeta en sí no hace nada; solo cuentan los botones, para evitar marcar entregas sin querer al desplazarte.

**Deshacer**: en una tarjeta ya entregada, pulsa **"Deshacer"** y confirma. El pedido vuelve a `listo`.

#### Flujo de trabajo de entrega

1. Abre **Repartos**: aparece el día de hoy.
2. Sigue las tarjetas en orden de hora. Para cada una: **🧭 Cómo llegar** → entrega → **✓ Entregado**.
3. Cuando el día muestra ✓ y la barra está completa, has terminado.

---

### Pestaña: Recogidas

La **recogida de recipientes** de clientes a los que se entregó arroz en las últimas 4 semanas.

#### Lo que ves

Las recogidas pendientes agrupadas por semana, **de la más antigua a la más reciente**. Cada tarjeta indica cuándo se entregó ("Entregado dom 25 · hace 9 días"). Las que llevan **7 días o más** se marcan en rojo, porque son las más urgentes. Dentro de cada semana, las pendientes van primero.

#### Marcar una recogida

Pulsa **"✓ Recogido"** en la tarjeta. Se abre una ventana opcional de valoración:
- Puntuación del cliente del **1 al 10** (toca un número; tócalo otra vez para quitarlo).
- Comentario del cliente.
- **"Marcar recogido"** (o **"Guardar y marcar recogido"** si has puesto valoración o comentario).

**Deshacer**: en una tarjeta ya recogida, pulsa **"Deshacer"** y confirma.

#### Flujo de trabajo de recogida

1. Abre **Recogidas** y empieza por las tarjetas en rojo (las más antiguas).
2. Para cada cliente: **🧭 Cómo llegar** → recoge los recipientes → **✓ Recogido** → anota la valoración si el cliente la da.
3. Cuando una semana no tiene pendientes, desaparece de la lista.

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
- Un pedido puede llevar varios arroces (líneas); cuenta como 1 hacia el límite de 6.
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
Ve a `/diario`, toca la casilla del pedido y pulsa "✏️ Editar pedido".

**¿Qué hago si el cliente cancela?**
Desde la hoja de edición, pulsa "Cancelar pedido". Si el pedido es de un día pasado, solo puede hacerlo el administrador. El stock se restaura automáticamente.

**¿Puedo crear un pedido para un cliente nuevo que no está en el sistema?**
Sí. En el bloque Cliente de la hoja de pedido, pulsa "+ Crear cliente nuevo" y rellena teléfono y nombre. El cliente se crea automáticamente al confirmar el pedido.

**¿Qué ocurre si dos personas intentan hacer un pedido en el mismo hueco al mismo tiempo y solo queda uno?**
El backend valida la disponibilidad en el momento de confirmar. El primero en confirmar ocupa el hueco; el segundo recibe un aviso de "hueco lleno" y puede elegir otra franja.

**¿Cómo sé qué pedidos son de recogida en local y cuáles son de reparto?**
En la casilla del pedido, 🛵 indica reparto a domicilio; si no aparece, es recogida en local. Con el botón 🛵 o 🏠 se resaltan solo esos pedidos.

**¿El repartidor ve los pedidos de recogida en local?**
No. La pantalla de Repartos solo muestra pedidos de reparto a domicilio. Los pedidos de recogida en local los gestiona el personal del restaurante.

**¿Qué pasa con un arroz que desactivo?**
Deja de aparecer en la hoja de pedido (no se puede seleccionar para nuevos pedidos), pero los pedidos existentes con ese arroz se mantienen intactos.
