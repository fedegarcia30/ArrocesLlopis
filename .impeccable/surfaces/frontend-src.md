---
version: 1
slug: "frontend-src"
primary_target: "frontend/src"
related_targets: []
---

## Scope

Toda la app interna (frontend/src): shell, navegación y todas las páginas. Modo: Operate. Entregable de esta ronda: solo propuesta (Docs/propuesta-estilo-visual.md); sin implementar.

## Audience and task

Cocina/mostrador en tablet horizontal con mucha luz; repartidor en móvil al sol; admin en móvil a diario y en escritorio/tablet para el análisis. Leer de un vistazo hora, raciones y estado durante el servicio (13:00–15:30).

## Direction contract

THESIS: El servicio del día se compone como un horario impreso de Cercanías: franjas como salidas y pedidos como filas con estado. Rechaza el panel de tarjetas oscuras con brillo y la tabla SaaS genérica.

OWN-WORLD: Papel blanco frío #F4F6F5, superficies blancas, tinta #14181B, tinta secundaria #5B6670, filetes de 1px #D5DBD8 y de 2px en tinta bajo las cabeceras. El raíl de navegación es una banda de color de línea, verde #0F5C4A. Barlow para la UI y Barlow Condensed para horas y cifras, siempre tabulares. Estados con texto y forma (contorno = pendiente, relleno = terminado). Sin desenfoque ni brillos.

STORY: Quien abre la app ve qué franja está en marcha, qué viene después y cuánta capacidad queda; crea un pedido o cambia un estado con un toque.

FIRST VIEWPORT: Raíl verde de 88px con icono y etiqueta; cabecera blanca con "Servicio de hoy", la fecha, los KPI en cifras condensadas y el botón verde "+ Nuevo pedido" a la derecha. Ocupa el centro el horario con columnas franja/pedidos/raciones/estado; la franja actual va invertida en negro. A la derecha, "Repartos próximos". En el móvil: barra inferior de 5 entradas y el horario en una sola columna.

FORM: Horario de servicio, candidato 3 de 7 en mi lista ordenada; seed:49eaf5586b6b221b. Mejoras incorporadas: cifras tabulares (datamatics), presupuesto fijo por franja (carátula de casete), raciones como diámetro de punto en el mapa (atlas), tres valores de tinta y filetes de 1px (raíl central), entrega en curso a pantalla completa en el móvil (feed vertical).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Open decisions

- Implementación pendiente de aprobación del usuario.
- Librería de iconos (propuesta: lucide-react).
