import pytest
from app import create_app, db
from app.models import Cliente, Arroz, Usuario, Pedido
import os

def create_test_app():
    from flask import Flask
    from flask_cors import CORS
    from app import db
    from app.auth import init_firebase
    from app.routes import api_v1_bp
    
    app = Flask(__name__)
    os.environ['FLASK_ENV'] = 'development'
    
    app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "WTF_CSRF_ENABLED": False
    })
    
    db.init_app(app)
    CORS(app)
    init_firebase()
    app.register_blueprint(api_v1_bp)
    
    return app

@pytest.fixture
def app():
    app = create_test_app()
    
    with app.app_context():
        db.drop_all() # Ensure clean slate
        db.create_all()
        
        # Seed basic data
        arroz = Arroz(id=1, nombre="Senyoret Test", precio=15.00, disponible=True)
        db.session.add(arroz)
        db.session.commit()
        
        yield app
        
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def runster_headers():
    # Token to bypass real firebase auth in dev mode
    return {"Authorization": "Bearer DEV_BYPASS_TOKEN"}
