#!/usr/bin/env python3
"""
Migración Airtable → MySQL Arroces Llopis
Versión mejorada con merging de clientes y roboztez de encoding.
"""

import mysql.connector
from airtable import Airtable
from datetime import datetime
import os
from dotenv import load_dotenv
import re

# Cargar configuración desde .env
load_dotenv()

# ==================== CONFIG ====================
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

# ==================== UTILIDADES ====================
def get_val(fields, key, default=None):
    val = fields.get(key, default)
    if isinstance(val, list):
        return val[0] if val else default
    return val

def clean_phone(p):
    if not p: return ''
    # Si es una lista, coger el primero (comun en Airtable)
    if isinstance(p, list): p = p[0]
    return re.sub(r'\D', '', str(p))

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        # Reemplazar caracteres problemáticos en Windows terminal
        print(msg.encode('ascii', 'ignore').decode('ascii'))

# ==================== CONEXIONES ====================
safe_print("🔌 Conectando...")
at_arroces = Airtable(AIRTABLE_CONFIG['base_id'], 'TipoArroz', AIRTABLE_CONFIG['api_key'])
at_clientes = Airtable(AIRTABLE_CONFIG['base_id'], 'Clientes', AIRTABLE_CONFIG['api_key'])
at_pedidos = Airtable(AIRTABLE_CONFIG['base_id'], 'pedidos', AIRTABLE_CONFIG['api_key'])

db = mysql.connector.connect(**MYSQL_CONFIG)
cursor = db.cursor(buffered=True)

# ==================== 1. LIMPIAR (Omitido por permisos) ====================
safe_print("ℹ️  Omitiendo limpieza automatica de tablas (sin permisos). Asegurese de tener la DB limpia.")
# El usuario indico que borraria la base de datos manualmente.

maps = {'arroces': {}, 'clientes': {}}

# ==================== 2. ARROCES (únicos nombre) ====================
safe_print("\n🍚 Migrando ARROCES únicos...")
arroces_count = 0
for rec in at_arroces.get_all():
    fields = rec['fields']
    nombre = get_val(fields, 'Name', '')
    precio = get_val(fields, 'Precio', 0.0)
    caldo = get_val(fields, 'Caldo', '')
    
    if nombre:
        cursor.execute("""
            INSERT IGNORE INTO arroces (nombre, precio, caldo, disponible) 
            VALUES (%s, %s, %s, TRUE)
        """, (nombre, float(precio), caldo))
        db.commit()
        
        cursor.execute("SELECT id FROM arroces WHERE nombre = %s", (nombre,))
        arroz_id = cursor.fetchone()[0]
        maps['arroces'][nombre] = arroz_id
        if cursor.rowcount > 0:
            arroces_count += 1
        safe_print(f"   {nombre} -> ID {arroz_id}")

safe_print(f"✅ {len(maps['arroces'])} arroces mapped")

# ==================== 3. CLIENTES (merging por teléfono) ====================
safe_print("\n👥 Migrando CLIENTES con merging...")
clientes_inserted = 0
clientes_merged = 0
for rec in at_clientes.get_all():
    fields = rec['fields']
    telefono = clean_phone(get_val(fields, 'Telefono', ''))
    nombre = get_val(fields, 'Nombre', '')
    direccion = get_val(fields, 'Direccion', '')
    cp = get_val(fields, 'Codigo Postal')
    obs = get_val(fields, 'Obervaciones', '')
    
    if telefono and telefono != '0':
        # Intentar insertar
        cursor.execute("""
            INSERT IGNORE INTO clientes (nombre, telefono, direccion, codigo_postal, observaciones) 
            VALUES (%s, %s, %s, %s, %s)
        """, (nombre, telefono, direccion, cp, obs))
        db.commit()
        
        # Siempre obtener el ID (sea nuevo o existente) para el mapeo
        cursor.execute("SELECT id FROM clientes WHERE telefono = %s", (telefono,))
        cliente_id = cursor.fetchone()[0]
        maps['clientes'][telefono] = cliente_id
        
        if cursor.rowcount > 0:
            clientes_inserted += 1
            # safe_print(f"   + {nombre} ({telefono}) -> ID {cliente_id}")
        else:
            clientes_merged += 1

safe_print(f"✅ {clientes_inserted} clientes nuevos, {clientes_merged} merged.")

# ==================== 4. PEDIDOS (proceso individual) ====================
safe_print("\n📦 Procesando PEDIDOS...")
pedidos_ok = 0
pedidos_skip = 0

for rec in at_pedidos.get_all():
    fields = rec['fields']
    pedido_id_air = get_val(fields, 'Pedido', rec['id'])
    
    # CLIENTE
    tel_cliente = clean_phone(get_val(fields, 'TelefonoCliente'))
    if not tel_cliente or tel_cliente not in maps['clientes']:
        # safe_print(f"⚠️  Skip {pedido_id_air}: Cliente no encontrado ({tel_cliente})")
        pedidos_skip += 1
        continue
    
    cliente_id = maps['clientes'][tel_cliente]
    
    # FECHA - Lógica robusta
    fecha_pedido = None
    fecha_fld = get_val(fields, 'FechaPedido') or get_val(fields, 'FechaCreacion')
    if fecha_fld:
        try:
            fecha_pedido = datetime.fromisoformat(fecha_fld.replace('Z', '+00:00'))
        except: pass
            
    if not fecha_pedido:
        f_str = get_val(fields, 'Fecha', '')
        h_str = get_val(fields, 'Hora', '')
        if f_str and h_str:
            try:
                fecha_pedido = datetime.strptime(f"{f_str} {h_str}", "%d/%m/%Y %H:%M")
            except: pass
                
    if not fecha_pedido:
        fecha_pedido = datetime.now()
    
    # DATOS
    pax = int(get_val(fields, 'PAX', 1))
    obs = get_val(fields, 'Observaciones', '')
    entregado = bool(get_val(fields, 'Entregado', False))
    recogido = bool(get_val(fields, 'Recogido', False))
    local = bool(get_val(fields, 'Local', False))
    review = get_val(fields, 'Review')
    
    # INSERT PEDIDO
    cursor.execute("""
        INSERT INTO pedidos (cliente_id, pax, fecha_pedido, observaciones, 
                           entregado, recogido, local_recogida, status, review)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 'entregado', %s)
    """, (cliente_id, pax, fecha_pedido, obs, entregado, recogido, local, review))
    db.commit()
    pedido_mysql_id = cursor.lastrowid
    
    # LÍNEAS ARROZ
    nombres_arroz = fields.get('NombreArroz', [])
    precios_arroz = fields.get('Precio (from TipoArroz)', [])
    
    for i, n_arroz in enumerate(nombres_arroz):
        if i < len(precios_arroz) and n_arroz in maps['arroces']:
            p_unit = float(precios_arroz[i])
            a_id = maps['arroces'][n_arroz]
            cursor.execute("""
                INSERT INTO pedido_lineas (pedido_id, arroz_id, precio_unitario) 
                VALUES (%s, %s, %s)
            """, (pedido_mysql_id, a_id, p_unit))
    
    db.commit()
    pedidos_ok += 1
    if pedidos_ok % 50 == 0:
        safe_print(f"   ... {pedidos_ok} pedidos migrados")

safe_print(f"\n🎉 MIGRACIÓN FINALIZADA!")
safe_print(f"   Arroces: {len(maps['arroces'])}")
safe_print(f"   Clientes: {len(maps['clientes'])}") 
safe_print(f"   Pedidos OK: {pedidos_ok} | Skip: {pedidos_skip}")

# Actualizar num_pedidos
cursor.execute("""
    UPDATE clientes c 
    JOIN (SELECT cliente_id, COUNT(*) as cnt FROM pedidos GROUP BY cliente_id) p 
    ON c.id = p.cliente_id 
    SET c.num_pedidos = p.cnt
""")
db.commit()

cursor.close()
db.close()
