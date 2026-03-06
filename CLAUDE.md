# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Arroces Llopis is an order management system for a rice catering business. React/TypeScript frontend with Capacitor for mobile, Flask/Python backend, MySQL database. The system manages customers, rice products, orders with time-slot availability, and inventory (Phase 2).

## Commands

### Frontend (from `frontend/`)
```bash
npm run dev        # Dev server with HMR
npm run build      # TypeScript compile + Vite build
npm run lint       # ESLint
npm run preview    # Preview production build
```

### Backend (from `backend/`)
```bash
# Activate venv first: source venv/bin/activate (or venv\Scripts\activate on Windows)
python app/main.py          # Run Flask on http://localhost:5001 (debug mode)
pip install -r requirements.txt  # Install deps
```

### Database
```bash
mysql -u root -p < database/schema.sql   # Init/reset schema
```

## Architecture

### Backend (Flask)
- **App factory**: `backend/app/__init__.py` — creates Flask app, initializes SQLAlchemy + CORS
- **Models**: `backend/app/models.py` — SQLAlchemy ORM models (Cliente, Arroz, Usuario, Pedido)
- **Config**: `backend/config/settings.py` — loads from `.env` (DATABASE_URL, SECRET_KEY, AIRTABLE keys)
- **Entry point**: `backend/app/main.py`
- Routes use Flask blueprints registered in the app factory

### Frontend (React + Vite + Capacitor)
- Entry: `frontend/src/main.tsx` → `App.tsx`
- Build tool: Vite with React plugin
- Mobile: Capacitor config in `frontend/capacitor.config.ts` (appId: com.arrocesllopis.app)
- TypeScript strict mode enabled

### Database (MySQL)
- Schema: `database/schema.sql` — includes Phase 1 (orders) + Phase 2 (inventory) tables
- Soft deletes via `deleted_at` timestamp on main entities
- Triggers auto-update `clientes.num_pedidos` on order insert/soft-delete
- Views: `vista_pedidos_detallados`, `vista_stock_critico`
- `pedido_lineas` links pedidos to arroces (many-to-many with price snapshot)

### API Design
- Base URL: `http://localhost:5001/api`
- Two API contract sources:
  - `compartido.md` — CRUD endpoints matching DB models (clientes, arroces, pedidos, auth)
  - Gemini docs (`api_contracts.md`) — Order module endpoints (availability/check, clients/lookup, orders/create, rices)
- All secured endpoints use `Authorization: Bearer <token>`
- Architecture doc specifies all mutations use POST (no PII in URLs)

### Key Business Rules
- Time slots: max 6 orders AND max 72 rations per slot
- Minimum 2 PAX per order
- Availability color: Green (0-3 orders, <36 pax), Yellow (4-5 orders, 37-60 pax), Red (6 orders or >60 pax)
- Order statuses: nuevo → preparando → listo → entregado | cancelado

## Shared Interface
`compartido.md` is the bridge document between backend and frontend teams. Update it when adding/changing endpoints so the frontend team stays in sync.

## Language
Code comments, git messages, and documentation: Spanish preferred (matches business domain). Variable/function names in code can be English or Spanish matching existing conventions.
