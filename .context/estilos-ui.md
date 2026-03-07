# Contexto: Estilos y UI

## Sistema de Diseño
Dark mode con glassmorphism y acento dorado. Sin framework CSS — todo CSS custom.
Archivo base: `frontend/src/index.css` (variables globales).
Cada componente tiene su propio `.css` junto al `.tsx`.

## Variables CSS Completas

```css
/* Backgrounds */
--bg-primary: #0d0d0d
--bg-secondary: #1a1a1a
--bg-card: rgba(30, 30, 30, 0.8)
--bg-glass: rgba(255, 255, 255, 0.05)

/* Dorado (acento principal) */
--gold: #d4af37
--gold-light: #e8c852
--gold-dim: #c9a84c
--gold-bg: rgba(212, 175, 55, 0.15)

/* Texto */
--text-primary: #f0f0f0
--text-secondary: #a0a0a0
--text-muted: #666

/* Status */
--status-green: #2ecc71
--status-green-bg: rgba(46, 204, 113, 0.15)
--status-yellow: #f1c40f
--status-yellow-bg: rgba(241, 196, 15, 0.15)
--status-red: #e74c3c
--status-red-bg: rgba(231, 76, 60, 0.15)
--status-blue (para información neutral)
--status-blue-bg

/* Bordes */
--border-subtle: rgba(255, 255, 255, 0.08)
--border-gold: rgba(212, 175, 55, 0.3)

/* Glassmorphism */
--glass-blur: 12px
--glass-border: 1px solid var(--border-subtle)

/* Border radius */
--radius: 12px
--radius-sm: 8px
--radius-lg: 16px

/* Touch targets */
--touch-min: 48px   /* mínimo para botones táctiles (móvil) */
```

## Clase Glassmorphism
```css
.glass-card {
  background: var(--bg-card);
  backdrop-filter: blur(var(--glass-blur));
  border: var(--glass-border);
  border-radius: var(--radius);
}
```
Usar `.glass-card` en modales, tarjetas, paneles flotantes.

## Convenciones CSS

1. **Sin módulos CSS** — clases globales (ej: `.order-card`, `.sidebar-link`)
2. **Un `.css` por componente** — junto al `.tsx`
3. **Mobile-first** con `@media (max-width: 768px)` para ajustes móvil
4. **Touch targets mínimo 48px** — todos los botones usan `min-height: var(--touch-min)`
5. **No usar colores hardcoded** — siempre variables CSS
6. **Glassmorphism en modales** — `backdrop-filter: blur()`

## Patrones de Botones

```css
/* Botón primario (dorado) */
background: var(--gold);
color: #000;
border-radius: var(--radius-sm);

/* Botón ghost */
background: transparent;
border: 1px solid var(--border-subtle);
color: var(--text-primary);

/* Botón peligro */
background: var(--status-red-bg);
color: var(--status-red);
border: 1px solid rgba(231,76,60,0.3);
```

## Status Badges
Clases para estado de pedidos (`.order-status-badge`):
```css
.nuevo      → fondo azul oscuro / texto azul
.preparando → fondo amarillo / texto amarillo
.listo      → fondo verde / texto verde
.entregado  → fondo gris / texto gris
.cancelado  → fondo rojo / texto rojo
```

## Layout Principal
```css
/* Sidebar fijo izquierda (solo iconos, ~60px) */
.sidebar { width: 60px; position: fixed; left: 0; height: 100vh; }

/* Contenido desplazado */
.layout-content { margin-left: 60px; }

/* Dashboard split */
.dashboard-split { display: flex; gap: 16px; }
.dashboard-left { flex: 0 0 380px; }  /* AvailabilityGrid */
.dashboard-right { flex: 1; }
/* En móvil: flex-direction: column */
```

## Disponibilidad Slot Colors
```css
.slot-card.green → border-left: 3px solid var(--status-green)
.slot-card.yellow → border-left: 3px solid var(--status-yellow)
.slot-card.red → background: var(--status-red-bg); opacity reducida
.slot-card.selected → border: 1px solid var(--gold)
```

## Fuentes
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
font-size: 16px;
-webkit-font-smoothing: antialiased;
```

## Cómo Añadir Estilos a un Componente Nuevo
1. Crear `MiComponente.css` junto a `MiComponente.tsx`
2. Import: `import './MiComponente.css'`
3. Usar variables CSS del sistema (`var(--gold)`, etc.)
4. Para tarjetas/modales: añadir clase `.glass-card`
5. Asegurar que los botones tienen `min-height: var(--touch-min)` (48px)
