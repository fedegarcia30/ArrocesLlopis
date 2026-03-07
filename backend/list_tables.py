from app import create_app, db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        results = db.session.execute(text("SHOW TABLES")).fetchall()
        print("Tablas encontradas:")
        for r in results:
            print(f"- {r[0]}")
    except Exception as e:
        print(f"Error checking tables: {e}")
