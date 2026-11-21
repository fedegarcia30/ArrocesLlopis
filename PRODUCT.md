# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(React + Vite, empaquetada también como app Android/iOS con Capacitor. El lenguaje de diseño es web, no nativo.)

## Users

Equipo interno de Arroces Llopis, catering de arroces:

- **Cocinero / encargado**: tablet en horizontal en la cocina o el mostrador, mucha luz, manos ocupadas, consultando de un vistazo los pedidos del día y el calendario de franjas.
- **Repartidor**: móvil en la calle o en la furgoneta, a veces a pleno sol; consulta repartos por franja y recogidas de recipientes pendientes.
- **Admin / gerente**: móvil para el día a día; ordenador o tablet para el análisis en profundidad en el Panel de Negocio.

## Product Purpose

Centraliza todo el ciclo operativo: alta de pedidos en franjas de 15 minutos (13:00–15:30) con control de capacidad, preparación en cocina, reparto a domicilio, recogida de recipientes, catálogo de arroces y recetas, stock de ingredientes, clientes y estadísticas de negocio. El éxito es que cada rol vea lo que necesita al instante y sin errores en las horas punta del servicio.

## Operating Context

- Servicio concentrado en el mediodía; la presión es máxima entre 12:30 y 15:30.
- Franjas: máx. 6 pedidos y 72 raciones; semáforo de disponibilidad verde/amarillo/rojo.
- Estados de pedido: nuevo → preparando → listo → entregado | cancelado.
- Recogida en local o reparto a domicilio; recogida posterior de recipientes.
- Repartos: por defecto recogidas de lunes a jueves, repartos de viernes a domingo.

## Capabilities and Constraints

- Roles: admin, gerente, encargado, cocinero, repartidor, con rutas restringidas por rol.
- Secciones: Calendario, Pedidos del día (/diario), Clientes, Arroces, Stock, Panel de Negocio, Repartos/Recogidas, Mapa.
- Tiene que funcionar en un móvil en vertical, en una tablet en horizontal y en el escritorio.
- Safe areas de Capacitor (`--safe-*`), objetivo táctil mínimo de 44px.

## Brand Commitments

No hay ningún elemento de marca fijo (ni logo, ni colores, ni tipografía). El dark mode + glassmorphism + dorado actual no es un compromiso de marca y se puede sustituir.

## Evidence on Hand

Datos operativos reales en la base de datos de producción. No hay logo, fotografía ni materiales impresos en el repositorio.

## Product Principles

1. Que se lea de un vistazo en plena hora punta: estado, hora y raciones antes que cualquier otra cosa.
2. Que se pueda leer con luz real: cocina iluminada, sol en la calle.
3. Un mismo lenguaje en todos los roles y dispositivos; cada rol solo ve lo suyo.
4. Los colores de estado y capacidad tienen significado y no se usan como decoración.

## Accessibility & Inclusion

Uso con luz intensa y a distancia de brazo (tablet de cocina): se necesita un contraste alto (objetivo WCAG AA como mínimo y AAA en las cifras clave), objetivos táctiles generosos y no depender solo del color para indicar el estado.
