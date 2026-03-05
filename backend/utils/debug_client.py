import mysql.connector
from airtable import Airtable
import os
from dotenv import load_dotenv
import re

load_dotenv()

# CONFIGURACIÓN
AIRTABLE_CONFIG = {
    'base_id': os.getenv('AIRTABLE_BASE_ID'),
    'api_key': os.getenv('AIRTABLE_API_KEY')
}

MYSQL_CONFIG = {
    'host': os.getenv('MYSQL_HOST', 'localhost'),
    'user': os.getenv('MYSQL_USER'),
    'password': os.getenv('MYSQL_PASSWORD'),
    'database': os.getenv('MYSQL_DATABASE')
}

def clean_phone(p):
    return re.sub(r'\D', '', str(p))

def debug_client(target_phone):
    try:
        at_pedidos = Airtable(AIRTABLE_CONFIG['base_id'], 'pedidos', AIRTABLE_CONFIG['api_key'])
        mydb = mysql.connector.connect(**MYSQL_CONFIG)
        cursor = mydb.cursor()

        print(f"--- Debugging Client Phone: {target_phone} ---")
        
        # 1. Airtable
        print("\n📥 Airtable Orders:")
        all_p = at_pedidos.get_all()
        target_clean = clean_phone(target_phone)
        at_orders = []
        for p in all_p:
            t_list = p['fields'].get('TelefonoCliente', [])
            if any(clean_phone(str(x)) == target_clean for x in t_list):
                at_orders.append(p)
                print(f"   Record ID: {p['id']}")
                print(f"   Fields: {p['fields']}")
        
        # 2. MySQL
        print("\n🗄️ MySQL Records:")
        cursor.execute("SELECT id, nombre FROM clientes WHERE telefono = %s", (target_clean,))
        client_res = cursor.fetchone()
        if client_res:
            c_id = client_res[0]
            print(f"   Found Client in DB: ID={c_id}, Name={client_res[1]}")
            cursor.execute("SELECT id, fecha_pedido, pax, observaciones FROM pedidos WHERE cliente_id = %s", (c_id,))
            rows = cursor.fetchall()
            for row in rows:
                print(f"   Order: ID={row[0]}, Date={row[1]}, Pax={row[2]}, Obs={row[3]}")
        else:
            print("   Client NOT FOUND in MySQL DB!")

        cursor.close()
        mydb.close()

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    debug_client("639543002")
