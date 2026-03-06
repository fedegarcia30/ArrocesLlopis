from app import create_app, db
from sqlalchemy import text
import sys

app = create_app()

def check_and_fix():
    with app.app_context():
        try:
            # Check if column exists
            result = db.session.execute(text("SHOW COLUMNS FROM clientes LIKE 'activo'")).fetchone()
            
            if not result:
                print("Column 'activo' missing. Adding it...")
                db.session.execute(text("ALTER TABLE clientes ADD COLUMN activo BOOLEAN DEFAULT TRUE"))
                db.session.execute(text("UPDATE clientes SET activo = 1"))
                db.session.commit()
                print("Column added and updated.")
            else:
                print("Column 'activo' exists. Checking for NULLs...")
                # Ensure all existing clients have activo = 1
                db.session.execute(text("UPDATE clientes SET activo = 1 WHERE activo IS NULL"))
                db.session.commit()
                print("NULLs fixed (if any).")
            
            # double check count
            count = db.session.execute(text("SELECT COUNT(*) FROM clientes WHERE activo = 1")).scalar()
            print(f"Active clients count: {count}")
            
        except Exception as e:
            print(f"Error: {e}")
            db.session.rollback()

if __name__ == "__main__":
    check_and_fix()
