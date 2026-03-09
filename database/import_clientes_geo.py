"""
Actualiza los campos de geolocalización de la tabla clientes
con los datos del CSV clientes_geolocalizados.csv.

Uso:
    cd C:/ArrocesLlopis
    backend\\venv\\Scripts\\activate
    python database/import_clientes_geo.py
"""

import csv
import os
import sys
import mysql.connector
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

CSV_PATH = os.path.join(os.path.dirname(__file__), '..', 'utils', 'clientes_geolocalizados.csv')


def get_connection():
    host = os.getenv('MYSQL_HOST', '127.0.0.1')
    if host == 'localhost':
        host = '127.0.0.1'
    return mysql.connector.connect(
        host=host,
        user=os.getenv('MYSQL_USER'),
        password=os.getenv('MYSQL_PASSWORD'),
        database=os.getenv('MYSQL_DATABASE'),
    )


def parse_float(value):
    try:
        return float(value) if value.strip() else None
    except (ValueError, AttributeError):
        return None


def parse_int(value):
    f = parse_float(value)
    return int(f) if f is not None else None


def parse_bool(value):
    f = parse_float(value)
    return bool(int(f)) if f is not None else True


def main():
    print("Conectando a la base de datos...")
    try:
        conn = get_connection()
    except mysql.connector.Error as e:
        print(f"Error de conexión: {e}")
        sys.exit(1)

    cursor = conn.cursor()
    updated = 0
    skipped = 0

    with open(CSV_PATH, newline='', encoding='utf-8') as f:
        rows = list(csv.DictReader(f, delimiter='|'))

    print(f"Procesando {len(rows)} registros...")

    for row in rows:
        cliente_id = parse_int(row.get('id', ''))
        if cliente_id is None:
            skipped += 1
            continue

        cursor.execute(
            """
            UPDATE clientes
            SET direccion_limpia = %s,
                codigo_postal    = %s,
                latitud          = %s,
                longitud         = %s
            WHERE id = %s
            """,
            (
                row.get('direccion_limpia', '').strip() or None,
                row.get('codigo_postal', '').strip() or None,
                parse_float(row.get('latitud', '')),
                parse_float(row.get('longitud', '')),
                cliente_id,
            ),
        )

        if cursor.rowcount > 0:
            updated += 1
        else:
            skipped += 1

    conn.commit()
    cursor.close()
    conn.close()

    print(f"Listo. Actualizados: {updated} | No encontrados: {skipped}")


if __name__ == '__main__':
    main()
