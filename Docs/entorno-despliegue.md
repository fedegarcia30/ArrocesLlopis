# Entorno y Despliegue - Arroces Llopis

## Desarrollo Local

### Requisitos
- Node.js (para frontend)
- Python 3.x + pip (para backend)
- MySQL corriendo en localhost
- Cuenta Firebase con proyecto configurado

### Backend
```bash
cd backend
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac
pip install -r requirements.txt
python app/main.py             # Levanta en http://localhost:5001
```

### Frontend
```bash
cd frontend
npm install
npm run dev                    # Levanta en http://localhost:5173
```

### Base de Datos
```bash
mysql -u root -p < database/schema.sql   # Inicializa / resetea el schema
```

## Variables de Entorno

### Backend (`.env` en `backend/`)
```env
DATABASE_URL=mysql+mysqlconnector://root:password@localhost/arroces_llopis
SECRET_KEY=tu-clave-secreta
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json   # ruta al JSON de service account
# O alternativamente:
VITE_FIREBASE_PROJECT_ID=tu-project-id                  # si no hay JSON, usa Application Default Credentials
```

### Frontend (`.env` en `frontend/`)
```env
VITE_API_BASE_URL=http://localhost:5001/api/v1           # Opcional en dev (tiene fallback)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

## Producción

### URLs
- **Frontend**: `https://solvency.ddns.net/management/`
- **API**: `https://solvency.ddns.net/management-api/` → nginx proxy → `http://localhost:5001/api/v1`

### Cómo funciona el proxy de producción
En producción `import.meta.env.PROD === true`, el client API usa `/management-api` como base URL.
Nginx hace el proxy hacia el backend Flask.

### Build Frontend
```bash
cd frontend
npm run build        # Genera dist/ con TypeScript compilado + Vite bundle
npm run preview      # Previsualizar el build de producción localmente
```

## Firebase

### Setup Backend (Service Account)
1. Firebase Console → Project Settings → Service Accounts → Generate new private key
2. Guardar el JSON como `backend/firebase-credentials.json`
3. Configurar `FIREBASE_CREDENTIALS_PATH` en `.env`

### Setup Frontend
Las variables `VITE_FIREBASE_*` en `frontend/src/config/firebase.ts` se leen del entorno.

### Registro de Usuarios
Los usuarios deben existir tanto en Firebase Auth como en la tabla `usuarios` de MySQL con el mismo email.
El backend rechaza tokens de Firebase de usuarios que no estén en la BD (`403 Forbidden`).

## Logs Backend
Los logs se guardan en `backend/logs/`. Cada request se registra con:
- Método HTTP, path, status code, duración (ms), IP, Firebase UID del usuario
- Las excepciones no manejadas se capturan y loguean automáticamente
