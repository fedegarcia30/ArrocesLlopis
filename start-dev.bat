@echo off
setlocal

REM Situarse en el directorio del script (raíz del proyecto)
cd /d "%~dp0"

echo ============================================
echo  Arroces Llopis - Servidores de desarrollo
echo ============================================
echo.

REM Validar que el entorno esta preparado
if not exist "backend\venv\Scripts\python.exe" (
    echo [ERROR] No se encuentra backend\venv.
    echo         Crealo con:  cd backend ^&^& python -m venv venv ^&^& venv\Scripts\python -m pip install -r requirements.txt
    pause
    exit /b 1
)

if not exist "frontend\node_modules" (
    echo [ERROR] No se encuentra frontend\node_modules.
    echo         Instala las dependencias con:  cd frontend ^&^& npm install
    pause
    exit /b 1
)

echo Iniciando backend  - http://127.0.0.1:5001
start "ArrocesLlopis - Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\python.exe -m app.main"

echo Iniciando frontend - http://localhost:5173
start "ArrocesLlopis - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Ambos servidores arrancando en ventanas separadas.
echo Cierra cada ventana (o pulsa CTRL+C en ella) para detenerlos.

endlocal
