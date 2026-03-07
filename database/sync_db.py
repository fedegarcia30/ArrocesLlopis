from app import create_app, db
from sqlalchemy import text
from app.models import HistoricoPrecio, Compra, CompraLinea, Proveedor, Ingrediente

app = create_app()
with app.app_context():
    # 1. Create all missing tables based on models
    db.create_all()
    
    # 2. Check for precio_actual in ingredientes manually since create_all doesn't add it
    try:
        db.session.execute(text("ALTER TABLE ingredientes ADD COLUMN precio_actual DECIMAL(10,2) DEFAULT 0"))
        db.session.commit()
        print("Column precio_actual added to ingredientes.")
    except Exception as e:
        if "Duplicate column name" in str(e):
            print("Column precio_actual already exists.")
        else:
            print(f"Error adding column: {e}")

    print("Database sync completed.")
    
if __name__ == "__main__":
    pass
