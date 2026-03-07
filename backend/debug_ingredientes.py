from app import create_app, db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        results = db.session.execute(text("SHOW COLUMNS FROM ingredientes")).fetchall()
        for r in results:
            print(f"Column: {r[0]} | Type: {r[1]}")
    except Exception as e:
        print(f"Error checking column: {e}")
