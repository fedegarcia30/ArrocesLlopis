import sys
import os
from dotenv import load_dotenv

# Reemplaza 'fedegarcia30' con tu nombre de usuario si es distinto
path = '/home/fedegarcia30/arrocesllopis'
if path not in sys.path:
    sys.path.append(path)

os.chdir(path)

# Cargamos el archivo .env de producción
load_dotenv(os.path.join(path, '.env'))

from app import create_app

# PythonAnywhere busca el objeto 'application'
application = create_app()
