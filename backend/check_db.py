from app import create_app, db
from sqlalchemy import text
import sys

app = create_app()

def check_and_fix():
    with app.app_context():
        try:
            # 1. Existing activo check
            result = db.session.execute(text("SHOW COLUMNS FROM clientes LIKE 'activo'")).fetchone()
            if not result:
                print("Column 'activo' missing. Adding it...")
                db.session.execute(text("ALTER TABLE clientes ADD COLUMN activo BOOLEAN DEFAULT TRUE"))
                db.session.execute(text("UPDATE clientes SET activo = 1"))
                db.session.commit()
            else:
                db.session.execute(text("UPDATE clientes SET activo = 1 WHERE activo IS NULL"))
                db.session.commit()
            
            # 2. Create tables
            print("Checking/Creating tables...")
            from app.models import Ingrediente, ArrozIngrediente
            db.create_all()
            print("Tables checked/created.")

            # 3. Seed ingredients if empty
            if Ingrediente.query.count() == 0:
                print("Seeding initial ingredients...")
                ingredients_list = [
                    ("Arroz Bombita", "g"), ("Pollo Troceado", "g"), ("Conejo Troceado", "g"),
                    ("Garrofó", "g"), ("Judía Verde (Bajoqueta)", "g"), ("Tomate Triturado", "g"),
                    ("Aceite de Oliva", "ml"), ("Azafrán", "g"), ("Pimentón Dulce", "g"),
                    ("Caracoles (Baquetes)", "ud"), ("Romero Fresco", "ud"), ("Sal", "g"),
                    ("Caldo de Carne", "ml"), ("Ñora", "ud"), ("Ajo", "g")
                ]
                for nombre, unidad in ingredients_list:
                    # Map to unidad_medida
                    db.session.add(Ingrediente(nombre=nombre, unidad_medida=unidad))
                db.session.commit()
                print("Ingredients seeded.")

            count = db.session.execute(text("SELECT COUNT(*) FROM clientes WHERE activo = 1")).scalar()
            print(f"Active clients count: {count}")
            print("Database check complete.")
            
        except Exception as e:
            print(f"Error: {e}")
            db.session.rollback()

if __name__ == "__main__":
    check_and_fix()
