from app import create_app, db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        results = db.session.execute(text("SHOW COLUMNS FROM arroz_ingredientes")).fetchall()
        print("Columnas en arroz_ingredientes:")
        for r in results:
            print(f"- {r[0]} ({r[1]})")
    except Exception as e:
        print(f"Error checking columns: {e}")
