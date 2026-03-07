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
- All TS types in `frontend/src/types/index.ts`
- API layer: `frontend/src/api/client.ts` — generic `get/post/put/patch/del` with auto Firebase token injection
- Auth: `useAuth` hook/context in `frontend/src/hooks/useAuth.ts` wraps Firebase Auth and fetches user role from backend
- Mobile: Capacitor config in `frontend/capacitor.config.ts` (appId: com.arrocesllopis.app)
- TypeScript strict mode + `erasableSyntaxOnly` — cannot use `public` parameter properties in constructors

### Roles & Routes
- Roles: `admin`, `gerente`, `encargado`, `cocinero`, `repartidor`
- Route guards via `RoleRoute` component in `App.tsx`:
  - `/calendar` — admin, encargado, gerente, cocinero
  - `/diario` — admin, encargado, gerente, cocinero
  - `/clientes`, `/arroces`, `/stock` — admin, encargado, gerente
  - `/admin/dashboard` — admin only
  - `/repartos` — all roles
- After login, each role redirects to its default page (admin→`/admin/dashboard`, cocinero→`/diario`, repartidor→`/repartos`, others→`/calendar`)

### Database (MySQL)
- Schema: `database/schema.sql` — includes Phase 1 (orders) + Phase 2 (inventory) tables
- Soft deletes via `deleted_at` timestamp on main entities
- Triggers auto-update `clientes.num_pedidos` on order insert/soft-delete
- Views: `vista_pedidos_detallados`, `vista_stock_critico`
- `pedido_lineas` links pedidos to arroces (many-to-many with price snapshot)

### API Design
- Base URL: `http://localhost:5001/api/v1` (blueprint prefix `/api/v1`)
- Dev env var: `VITE_API_BASE_URL` (defaults to `http://localhost:5001/api/v1`)
- Production: frontend proxies through `/management-api` → `/api/v1`
- Route modules: `rices`, `clients`, `availability`, `orders`, `pedidos`, `stats`, `ingredients`, `auth`
- `compartido.md` is the authoritative API contract — update it when endpoints change
- All secured endpoints use `Authorization: Bearer <Firebase idToken>`
- Backend verifies token via `firebase_admin.auth.verify_id_token()`

### Key Business Rules
- Time slots: max 6 orders AND max 72 rations per slot
- Minimum 2 PAX per order
- Availability color: Green (0-3 orders, <36 pax), Yellow (4-5 orders, 37-60 pax), Red (6 orders or >60 pax)
- Order statuses: nuevo → preparando → listo → entregado | cancelado

## Shared Interface
`compartido.md` is the bridge document between backend and frontend teams. Update it when adding/changing endpoints so the frontend team stays in sync. The frontend team is Claude Code; the backend team is Gemini.

## Language
Code comments, git messages, and documentation: Spanish preferred (matches business domain). Variable/function names in code can be English or Spanish matching existing conventions.
