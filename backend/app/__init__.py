from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from .config.settings import Config

db = SQLAlchemy()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    CORS(app)

    # Import and register blueprints here
    # from .routes import main_bp
    # app.register_blueprint(main_bp)

    return app
