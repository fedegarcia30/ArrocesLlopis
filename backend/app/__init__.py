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

    from .routes import api_v1_bp
    app.register_blueprint(api_v1_bp)

    return app
