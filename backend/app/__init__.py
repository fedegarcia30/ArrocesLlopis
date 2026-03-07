from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from config.settings import Config

db = SQLAlchemy()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    CORS(app, resources={r"/api/*": {
        "origins": "*",
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

    return app
