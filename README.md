# Arroces Llopis - Project Management System

This project is a comprehensive management system for "Arroces Llopis," featuring a React-based web and mobile frontend (Capacitor), a Flask backend, and a MySQL database.

## Project Structure
- `frontend/`: React application (Vite-based) with Capacitor for iOS and Android.
- `backend/`: Flask API with SQLAlchemy and Airtable integration for data migration.
- `database/`: MySQL schema and initialization scripts.
- `Docs/`: Project documentation and LLM-ready context files.

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- MySQL Server

### Backend Setup
1. Navigate to `/backend`.
2. Create a virtual environment: `python -m venv venv`.
3. Activate the virtual environment.
4. Install dependencies: `pip install -r requirements.txt`.
5. Configure `.env` with your database credentials.

### Frontend Setup
1. Navigate to `/frontend`.
2. Install dependencies: `npm install`.
3. Start development server: `npm run dev`.

### Mobile (Capacitor)
1. Build the frontend: `npm run build`.
2. Sync with native platforms: `npx cap sync`.
3. Open in IDE: `npx cap open ios` or `npx cap open android`.

## Production Access
The system is deployed and accessible at:
- **Management Portal**: [https://solvency.ddns.net/management/](https://solvency.ddns.net/management/)
- **API Proxy**: `/management-api/`

## Detailed Documentation
For comprehensive technical details, architecture diagrams, and deployment guides, see:
- [MANAGEMENT_SYSTEM.md](MANAGEMENT_SYSTEM.md): Full technical overview and NGINX setup.
- [Docs/](Docs/): Original project requirements and design documents.

## Main Features
- **Smart Calendar**: Real-time slot availability and PAX tracking.
- **Order Wizard**: Multi-step order creation with client lookup.
- **Admin Dashboard**: Business Intelligence with YoY comparisons.
- **Product Catalog**: Full CRUD for rice dishes.
