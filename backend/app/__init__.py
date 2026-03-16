from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from config.settings import Config

db = SQLAlchemy()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize SSH Tunnel if enabled
    from app.utils.tunnel import start_tunnel, stop_tunnel, get_tunnel_db_url
    start_tunnel()
    
    # Adjust Database URI if tunnel is active
    app.config['SQLALCHEMY_DATABASE_URI'] = get_tunnel_db_url(app.config['SQLALCHEMY_DATABASE_URI'])

    db.init_app(app)
    CORS(app, resources={r"/api/*": {
        "origins": [
            "https://llopis-fedegarcia30.pythonanywhere.com",
            "http://localhost",        # Capacitor Android
            "capacitor://localhost",    # Capacitor iOS
            "http://localhost:5173",    # Local Dev
            "http://localhost:5001"     # Local Dev
        ],
        "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
    }})

    from app.auth import init_firebase
    init_firebase()

    from app.utils.logger import logger
    import time
    from flask import request, g

    @app.before_request
    def start_timer():
        g.start_time = time.time()

    @app.after_request
    def log_request(response):
        if request.path == "/favicon.ico":
            return response
            
        now = time.time()
        duration = round(now - getattr(g, 'start_time', now), 3)
        ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        
        # We can extract user IDs later if they are set in g during auth
        user_info = getattr(g, 'firebase_uid', 'Anonymous')
        
        logger.info(
            f"[{request.method}] {request.path} - "
            f"Status: {response.status_code} - "
            f"Duration: {duration}s - "
            f"IP: {ip} - "
            f"User: {user_info}"
        )
        return response

    @app.teardown_request
    def log_exception(exc):
        if exc:
            import traceback
            from app.utils.logger import logger
            logger.error(
                f"Unhandled Exception on {request.method} {request.path}: {str(exc)}\n"
                f"{traceback.format_exc()}"
            )

    from .routes import api_v1_bp
    app.register_blueprint(api_v1_bp)

    # Configuración para servir el Frontend (React)
    import os
    from flask import send_from_directory

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        # Directorio donde estará el 'dist' de React en PythonAnywhere
        # Ajustamos el path para que sea relativo a la raíz del proyecto
        dist_path = os.path.join(app.root_path, '..', 'dist')
        
        if path != "" and os.path.exists(os.path.join(dist_path, path)):
            return send_from_directory(dist_path, path)
        else:
            return send_from_directory(dist_path, 'index.html')

    @app.teardown_appcontext
    def shutdown_session(exception=None):
        # We don't stop the tunnel here because it would close 
        # on every request lifecycle completion in some configurations.
        # But we could stop it if this was the main process exit.
        pass

    import atexit
    atexit.register(stop_tunnel)

    return app
