# Technical Documentation: Arroces Llopis Management System

This document provides a comprehensive overview of the architecture, implementation, and deployment of the "Arroces Llopis" Management System.

## Architecture Overview

### 1. Backend (Flask)
- **Port**: `5001` (Development & Production)
- **Tech Stack**: Python, Flask, SQLAlchemy (MySQL), Firebase Auth (Admin SDK).
- **Core Modules**:
    - `app/routes/pedidos.py`: Main dashboard logic, slot management, and delivery/pax calculations.
    - `app/routes/rices.py`: Full CRUD for rice products.
    - `app/routes/stats.py`: Business intelligence module for admin analytics (Revenue, Top products, etc.).
    - `app/auth.py`: Firebase middleware for secure API access.

### 2. Frontend (React + Vite)
- **Base Path**: `/management/` (Production)
- **Tech Stack**: React, TypeScript, CSS (Glassmorphism), Vite.
- **Key Components**:
    - `OrderWizard.tsx`: Multi-step flow for order creation with real-time availability check.
    - `AdminDashboard.tsx`: Interactive charts and metrics with period filtering (M, T, S, YTD).
    - `RicesPage.tsx`: Product management interface with search and availability toggles.
    - `api/client.ts`: Centralized API client with automatic environment detection (Dev vs Prod).

---

## Production Deployment & NGINX

The system is designed to coexist with other applications on the same server.

- **Frontend Build**: Served as static files under `/management/`.
- **API Connectivity**: Proxied via `/management-api/` to `http://127.0.0.1:5001/api/v1/`.

### NGINX Configuration (C:\NGINX\conf\nginx.conf)

```nginx
# Upstream for the management backend
upstream management_backend {
    server 127.0.0.1:5001;
}

server {
    listen 443 ssl;
    server_name solvency.ddns.net;

    # Serve Management SPA
    location /management/ {
        alias C:/ArrocesLlopis/frontend/dist/;
        index index.html;
        try_files $uri $uri/ /management/index.html;
    }

    # Proxy API requests
    location /management-api/ {
        proxy_pass http://management_backend/api/v1/;
        # ... header configurations ...
    }
}
```

---

## Business Intelligence (Dashboard) Logic

The dashboard uses a **Year-over-Year (YoY)** comparison strategy:
1. **Dynamic Periods**: Supports Month, Quarter, Semester, and YTD.
2. **Growth Indicators**: Compares current metrics against the exact same period in the previous year.
3. **Data Source**: Aggregated SQL queries in `backend/app/routes/stats.py` calculating revenue from `pedidos` and `pax` (rations).

---

## Product Management (Arroces)

- **Soft Delete**: Deleting a rice in the UI sets `disponible = 0` and `deleted_at = now()` in the database to preserve historical order integrity.
- **Price Management**: Real-time price updates for active menu items.

---

## Technical Maintenance

### Building the Frontend
```bash
cd frontend
pnpm build
```

### Restarting the Backend
```bash
# In production, ensure the virtual environment is active
cd backend
python -m app.main
```

### NGINX Reload
```bash
C:\NGINX\nginx.exe -p C:/NGINX/ -s reload
```
