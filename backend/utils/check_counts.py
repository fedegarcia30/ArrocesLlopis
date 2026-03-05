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

# Clientes a verificar (basado en el reporte de duplicados)
# Formato: (Nombre, Telefono_Airtable, ID_MySQL)
clientes_verificar = [
    ("María Blázquez", "639543002", 16),
    ("Ignacio Ramos", "661677459", 26),
    ("Alicia Porro", "679264193", 299),
    ("Alberto Arelago", "615901090", 170),
    ("Error 10 Euros", "10 Euros", 677),
    ("Lucía Bodes", "666395985", 501),
    ("Eduardo Rodil", "636939955", 364),
    ("Maria", "696937306", 96)
]

def clean_phone(p):
    if not p: return ''
    if isinstance(p, list): p = p[0]
    return re.sub(r'\D', '', str(p))

def check_counts():
    try:
        at_pedidos = Airtable(AIRTABLE_CONFIG['base_id'], 'pedidos', AIRTABLE_CONFIG['api_key'])
        mydb = mysql.connector.connect(**MYSQL_CONFIG)
        cursor = mydb.cursor(buffered=True)

        print("📥 Obteniendo pedidos de Airtable...")
        all_at_pedidos = at_pedidos.get_all()
        
        # Agrupar pedidos AT por teléfono limpio
        at_counts = {}
        for p in all_at_pedidos:
            tel = clean_phone(p['fields'].get('TelefonoCliente'))
            if tel:
                at_counts[tel] = at_counts.get(tel, 0) + 1

        clients_to_check = [
            ("María Blázquez", "639 54 30 02"),
            ("Ignacio Ramos", "661 67 74 59"),
            ("Alicia Porro", "679 264 193"),
            ("Alberto Arelago", "615 90 10 90"),
            ("Lucía Bodes", "666 39 59 85"),
            ("Eduardo Rodil", "636 93 99 55"),
            ("Maria", "696 93 73 06")
        ]

        print(f"{'Cliente':<25} | {'Teléfono':<15} | {'Airtable':<10} | {'MySQL':<10} | {'Estado'}")
        print("-" * 80)
        
        for name, phone in clients_to_check:
            clean = clean_phone(phone)
            at_count = at_counts.get(clean, 0)
            
            # MySQL
            cursor.execute("SELECT id FROM clientes WHERE telefono = %s", (clean,))
            row = cursor.fetchone()
            if row:
                c_id = row[0]
                cursor.execute("SELECT COUNT(*) FROM pedidos WHERE cliente_id = %s", (c_id,))
                db_count = cursor.fetchone()[0]
                
                status = "✅ OK" if at_count == db_count else f"❌ ERROR (ID:{c_id})"
                print(f"{name:<25} | {clean:<15} | {at_count:<10} | {db_count:<10} | {status}")
            else:
                print(f"{name:<25} | {clean:<15} | {at_count:<10} | {'?':<10} | ❌ NO EXISTE EN DB")

        cursor.close()
        mydb.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_counts()
