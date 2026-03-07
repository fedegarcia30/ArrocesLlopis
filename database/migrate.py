import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def apply_sql(filename):
    try:
        # Use 127.0.0.1 instead of localhost for TCP
        host = os.getenv('MYSQL_HOST', '127.0.0.1')
        if host == 'localhost':
            host = '127.0.0.1'
            
        conn = mysql.connector.connect(
            host=host,
            user=os.getenv('MYSQL_USER'),
            password=os.getenv('MYSQL_PASSWORD'),
            database=os.getenv('MYSQL_DATABASE')
        )
        cursor = conn.cursor()
        
        with open(filename, 'r', encoding='utf-8') as f:
            sql = f.read()
            
        for statement in sql.split(';'):
            if statement.strip():
                try:
                    cursor.execute(statement)
                except mysql.connector.Error as err:
                    if err.errno == 1060: # Duplicate column name
                        print(f"Column already exists: {statement.strip()[:40]}...")
                    elif err.errno == 1050: # Table already exists
                        print(f"Table already exists: {statement.strip()[:40]}...")
                    else:
                        print(f"Error executing statement: {err}")
                
        conn.commit()
        cursor.close()
        conn.close()
        print(f"Applied {filename} successfully.")
    except Exception as e:
        print(f"Failed to apply SQL: {e}")

if __name__ == "__main__":
    apply_sql('C:/ArrocesLlopis/database/update_price_history.sql')
