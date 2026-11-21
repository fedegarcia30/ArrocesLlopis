# Propuesta de estilo visual: «Horario de servicio»

> Noviembre 2026 · Estado: **propuesta, sin implementar**
> Boceto de referencia: `.impeccable/mocks/decision/assigned.html` (ábrelo en el navegador)

---

## 1. Diagnóstico del estilo actual

| Problema | Dónde | Efecto en el uso |
|---|---|---|
| Fondo casi negro con degradado radial y superficies translúcidas (`backdrop-filter` en 12 hojas de estilo) | `index.css`, `Layout.css`, modales, Stats, Repartos, Mapa… | Con la luz de la cocina o al sol se convierte en un espejo y se lee mal. El desenfoque además pesa en tablets y móviles modestos. |
| Todos los títulos `h1–h3` en dorado `#d4af37` | `index.css` | El color que debería señalar «aquí hay una acción» también marca los títulos, así que el dorado deja de significar algo. |
| El texto atenuado `#666` sobre `#0a0a0b` tiene un contraste de 3,4:1 | Etiquetas, metadatos | No llega al mínimo AA (4,5:1); justo los datos secundarios (dirección, pax, hora) son los que más cuesta leer. |
| 17 reglas con texto de 10–11px | Panel de Negocio, AdminStatCard, ClientAnalysisModal | Se puede leer en el escritorio, pero no en un móvil a la distancia del brazo. |
| Emojis como iconos de navegación (📅📋👥🍚📦📊🛵) y sin etiqueta de texto | `Sidebar.tsx` y 11 componentes | Cada sistema los dibuja distinto, no se puede ajustar su color al estado activo y obligan a adivinar qué es cada sección. |
| 164 referencias a «gold», 175 `rgba()` sueltos y alias heredados (`--gold`, `--accent-gold`, `--surface`…) | Toda la app | No hay un sistema de verdad: cada página reinventa sus grises y transparencias. |
| Dos tipografías de exhibición (Montserrat 800 + Inter) | Global | Titulares pesados y cifras sin alinear (sin `tabular-nums`): las horas y las raciones bailan en las columnas. |
| Barra inferior móvil con hasta 8 iconos | `Layout.css` | Objetivos táctiles de unos 40px y ninguna etiqueta. |

**Conclusión:** el estilo actual prioriza el efecto «premium» frente a lo que necesita un equipo en pleno servicio: leer hora, raciones y estado de un vistazo y con luz real.

---

## 2. La dirección: «Horario de servicio»

**Idea:** el servicio del mediodía se presenta como un **horario impreso de trenes** (Cercanías, paneles de salidas). Cada franja de 15 minutos es una *salida* y cada pedido es una fila con su estado. Cualquiera sabe leer un horario sin que se lo expliquen: la hora es grande y va a la izquierda, los detalles se alinean en columnas y la próxima salida destaca.

Por qué encaja:

- **Claro y de alto contraste**: pensado para la cocina iluminada y el reparto a pleno sol.
- **Natural y actual**: papel blanco, tinta negra y un solo color de marca. Nada de brillos, cristales ni degradados.
- **Hecho para cifras**: las horas, las raciones y los importes se alinean en columnas tabulares.
- **Un solo lenguaje** para todos los roles y dispositivos.

### El gesto característico

**La franja en curso va invertida (fondo negro, texto blanco)**, como la próxima salida en un panel de estación. Cada franja muestra su **presupuesto fijo**, `17 /72` raciones y `3/6` pedidos, alineado a la derecha y con una barra fina. Al acercarse al límite la cifra cambia a ámbar y al llenarse, a rojo, siempre con texto («Completa») y no solo con color.

---

## 3. Sistema de diseño

### 3.1 Color

Estrategia **contenida**: neutros + un color de marca que trabaja (navegación y acciones) + colores de estado que **solo** comunican estado.

| Token | Valor | Uso | Contraste |
|---|---|---|---|
| `--paper` | `#F4F6F5` | Fondo de la app | — |
| `--surface` | `#FFFFFF` | Paneles, tablas, hojas | — |
| `--ink` | `#14181B` | Texto principal, filetes de cabecera, franja actual | 16,4:1 ✔ AAA |
| `--ink-2` | `#5B6670` | Texto secundario, etiquetas | 5,4:1 ✔ AA |
| `--rule` | `#D5DBD8` | Filetes de 1px entre filas | — |
| `--line` | `#0F5C4A` | **Color de marca**: raíl de navegación, botón principal, foco | blanco encima 7,9:1 ✔ AAA |
| `--line-tint` | `#E3EEEA` | Fondo de selección o de hover | — |
| `--state-ok` | `#15803D` | Listo, disponible (semáforo verde) | 5,0:1 ✔ |
| `--state-warn` | `#B45309` | Preparando, franja casi llena (ámbar) | 5,0:1 ✔ |
| `--state-bad` | `#B91C1C` | Completa, cancelado, stock crítico (rojo) | 6,5:1 ✔ |
| `--state-info` | `#1D4ED8` | Nuevo, informativo | ✔ |

**Reglas:**
- El verde de marca nunca indica un estado; los colores de estado nunca decoran.
- **Estados con forma y no solo con color:** contorno = pendiente (nuevo, preparando), relleno = terminado (listo, entregado), tachado o gris = cancelado.
- Gráficos: la serie principal en `--ink`, la comparativa en `--line` y el resto en grises. Como mucho, 3 series con color.

### 3.2 Tipografía

- **Barlow** (de la familia de las tipografías de señalética DIN) para toda la interfaz.
- **Barlow Condensed** para horas, cifras grandes y títulos de página: caben más cifras y se leen de lejos.
- `font-variant-numeric: tabular-nums` **global**.
- Escala fija (se acaba el `clamp()` por viewport, que hace que el texto cambie de tamaño sin control):

| Paso | Tamaño | Uso |
|---|---|---|
| xs | 13px | Mínimo absoluto: notas y leyendas |
| sm | 15px | Metadatos (dirección, pax) |
| base | 17px | Texto de filas y formularios |
| lg | 20px | Cifras de fila, títulos de bloque |
| xl | 24px | Títulos de sección |
| 2xl | 30px | Título de página, horas de franja |
| 3xl | 40px | KPI principales |

Nunca por debajo de 13px. Las etiquetas de columna van en mayúsculas con espaciado de 0,08em y a 12–13px en `--ink-2` (es la única excepción de mayúsculas).

### 3.3 Forma, espacio y profundidad

- **Sin `backdrop-filter`, sin brillos (`glow`) y sin degradados de fondo.**
- La jerarquía la marcan el **peso y el filete**: 2px en tinta bajo las cabeceras de tabla y 1px `--rule` entre filas. Las tarjetas solo se usan cuando algo es realmente un objeto aparte (un pedido abierto, un arroz del catálogo).
- Radios: 6px (controles, chips) y 10px (paneles, hojas). Se acaban los 24px.
- La sombra solo se usa para lo que flota: hojas inferiores, modales y menús (`0 8px 24px rgba(20,24,27,.12)`).
- Espaciado en una escala de 4px: 4 · 8 · 12 · 16 · 24 · 32 · 48.
- Objetivos táctiles de **48px** en la tablet de cocina (se mantienen 44px como mínimo global).

### 3.4 Iconos y navegación

- Los emojis se sustituyen por **iconos de línea** (`lucide-react`, trazo 1,75) **siempre acompañados de su etiqueta de texto**.
- **Tablet y escritorio:** raíl verde de 88px con icono y etiqueta debajo. El activo es un bloque claro con el icono en verde.
- **Móvil:** barra inferior pegada al borde (sin flotar), con **5 entradas como máximo** y la quinta como «Más» (hoja con el resto de secciones). La entrada inicial depende del rol:
  - Cocinero: Hoy · Calendario · Repartos
  - Repartidor: Repartos · Recogidas
  - Admin, gerente y encargado: Hoy · Calendario · Repartos · Clientes · Más (Arroces, Stock, Mapa, Panel, Cerrar sesión)

### 3.5 Movimiento

Discreto y funcional: 150ms en los cambios de estado, 220ms en la entrada de las hojas inferiores y sin escalado al pulsar en filas (solo un cambio de fondo). Se respeta `prefers-reduced-motion`.

---

## 4. Aplicación por sección

### Pedidos del día (`/diario`), la pantalla de referencia
- El horario del día ocupa el centro: **franja (hora condensada de 30px) · pedidos · raciones /72 · estado**.
- La franja actual va invertida y la vista arranca desplazada hasta ella.
- Panel derecho «Repartos próximos» (45 minutos) en tablet y escritorio.
- El arrastrar y soltar por estado se mantiene, pero el cambio de estado principal pasa a ser **un toque sobre el chip de estado**, que avanza al siguiente.
- En el móvil, cada franja es un bloque con su cabecera fija (*sticky*) mientras se desplazan sus pedidos.

### Calendario (`/calendar`)
- Rejilla mensual en blanco con filetes y el número del día en condensada.
- Cada día muestra su **presupuesto agregado** (pedidos y raciones) y una barra de ocupación con el semáforo (verde, ámbar o rojo, con texto «Completo» al llenarse).
- Al pulsar un día se abre su horario de franjas en una hoja lateral (tablet) o inferior (móvil), con el mismo componente de filas de `/diario`.

### Nuevo pedido (`OrderSheet`)
- Hoja blanca con pasos verticales numerados: Cliente → Arroces → Franja → Entrega → Confirmar.
- El selector de franja (`SlotPicker`) reutiliza la fila del horario: hora + `x/6` + `y/72`, y las franjas completas aparecen desactivadas con el motivo.
- Un único botón verde «Confirmar pedido» fijo abajo, con el total en cifras tabulares.

### Repartos y Recogidas (`/repartos`)
- Se mantienen las dos pestañas y el gesto de deslizar entre ellas, con controles segmentados claros en lugar de pestañas con brillo.
- Lista de *salidas* por franja: hora · cliente · dirección · pax · cobrar/pagado.
- **Móvil del repartidor:** la entrega en curso ocupa la pantalla (dirección grande, botones «Llamar», «Cómo llegar» y «Entregado» de 56px) y la siguiente entrega queda a un deslizamiento.
- Recogidas: fila con los días desde la entrega y la valoración en estrellas de línea.

### Mapa (`/mapa`)
- Teselas de mapa claras (CARTO Positron o similar) en lugar de oscuras.
- **Punto con diámetro proporcional a las raciones** sobre una escala fija (2, 6, 12, 24+ pax), con relleno en tinta para los repartos y contorno para la recogida en local.
- Filtros y comparativa de periodos en una barra blanca con controles segmentados.

### Clientes (`/clientes`)
- Tabla real con cabeceras ordenables, filetes de 1px, nombre en negrita y cifras (pedidos, gasto, último pedido) alineadas a la derecha.
- Búsqueda arriba y siempre visible. En el móvil, cada cliente pasa a ser una fila de dos líneas.
- La pestaña de análisis y `ClientAnalysisModal` pasan a una hoja lateral con los KPI en condensada de 40px; se elimina el texto de 10–11px.

### Arroces (`/arroces`)
- Catálogo en lista o rejilla de fichas blancas: nombre, precio por ración en cifra destacada y estado activo/inactivo con forma.
- `RecipeEditor` y `RiceEditModal`: formulario de una columna, etiquetas encima del campo y campos de 48px de alto.

### Stock (`/stock`)
- Tabla de ingredientes: nombre · stock actual · mínimo · unidad · estado.
- Las filas en estado crítico llevan una barra roja a la izquierda y el texto «Bajo mínimo» (sin depender del color).
- **Modo compra:** la cabecera se vuelve verde de marca con el total en curso y cada fila muestra un campo numérico grande para la cantidad comprada.

### Panel de Negocio (`/admin/dashboard`)
- Fila de KPI arriba: cifra condensada de 40px, variación frente al periodo anterior con flecha y texto y un **minigráfico** del histórico.
- Gráficos sobre fondo blanco, con la serie actual en tinta y el periodo anterior en verde de marca, ejes en `--ink-2` y sin rejilla densa.
- Las pestañas Ingresos / Gastos y Stock / Clientes pasan a ser un control segmentado. El selector de periodo con ‹ › se queda tal cual.
- En el móvil: los KPI en una columna y los gráficos con desplazamiento horizontal propio solo cuando haga falta.

### Login
- Pantalla blanca con la palabra LLOPIS en condensada sobre una banda verde de marca, formulario centrado de una columna y botón verde a todo el ancho.

---

## 5. Plan de implementación propuesto

Por fases, de modo que la app no se rompa en ningún momento:

1. **Tokens** (`index.css`): definir los tokens nuevos y **redirigir los alias heredados** (`--gold-*`, `--glass-*`, `--bg-*`, `--text-*`) a los nuevos valores. Con esto toda la app cambia al modo claro de golpe, aunque con imperfecciones.
2. **Shell**: `Layout.css` + `Sidebar.tsx` (raíl nuevo, barra inferior de 5 entradas con «Más», iconos `lucide-react`) y las fuentes Barlow en `index.html`.
3. **Componente de fila de franja** compartido por `/diario`, el calendario, `SlotPicker` y Repartos.
4. **Páginas**, en orden de uso diario: Pedidos del día → Calendario → Nuevo pedido → Repartos → Clientes → Stock → Arroces → Mapa → Panel de Negocio → Login.
5. **Limpieza**: eliminar todos los `backdrop-filter`, los `rgba()` sueltos y los alias heredados; texto mínimo de 13px; revisión de contraste.
6. Documentar el sistema resultante en `DESIGN.md` y actualizar la sección «UI/CSS System» de `CLAUDE.md`.

---

## 6. Qué no cambia

Las funciones, rutas, roles, textos de negocio, reglas de capacidad (6 pedidos / 72 raciones), safe areas de Capacitor ni la orientación por dispositivo.
