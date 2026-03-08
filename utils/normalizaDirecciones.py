import pandas as pd
import requests
import re
import time
import os
import numpy as np

def normalizar_direccion(direccion):
    if pd.isna(direccion) or str(direccion).strip() == '':
        return ''
        
    d = str(direccion).lower()
    
    # 1. Abreviaturas de negocio detectadas en tus repartos
    d = re.sub(r'\bc\.b\.|cb\b|cb\.|ac\.b\.', 'costa brava ', d)
    d = re.sub(r'\ba\.m\.|am\b|am\.|a\. marquerie', 'alfredo marquerie ', d)
    d = re.sub(r'\bmon\.\s', 'monasterio ', d)
    d = re.sub(r'\bsant\.\s', 'santiago ', d)
    d = re.sub(r'\bm\. teresa calcuta', 'madre teresa de calcuta', d) 
    d = re.sub(r'\bpª\s', 'paseo de la ', d)
    
    # Normalización de prefijos comunes para ayudar a la API
    d = re.sub(r'\bc\.\s?de\s', 'calle de ', d)
    d = re.sub(r'\bc\.\s', 'calle ', d)
    d = re.sub(r'\bavda\.\s?de\s', 'avenida de ', d)
    d = re.sub(r'\bavda\.\s', 'avenida ', d)

    # Caso específico Monasterio Silos -> Monasterio de Silos
    if "monasterio silos" in d:
        d = d.replace("monasterio silos", "monasterio de silos")
    
    # 2. Corrección de erratas severas
    d = re.sub(r'vostisquero|ventispero|ventiso', 'ventisquero', d)
    d = re.sub(r'mariador', 'mirador', d)
    d = re.sub(r'suso y yuso', 'monasterio de suso y yuso', d)
    d = re.sub(r'cermi caballero', 'fermin caballero', d)
    d = re.sub(r'ramongo', 'ramon gomez de la serna', d)
    d = re.sub(r'm[ªa]\s?de? maeztu|maztu', 'maria de maeztu', d)
    d = re.sub(r'menchor|meldoy|melchor pérez|medci\.', 'melchor fernandez', d)
    d = re.sub(r'isla cés', 'islas cies', d)
    d = re.sub(r'uddemarbo|valdematrin', 'valdemarin', d)
    
    # 3. Extraer solo Calle y Número (eliminar bloque, piso, portería)
    # Buscamos el patrón: [Texto de la calle] [Número]
    match = re.search(r'^([a-záéíóúñ\s\.]+)\s*(\d+)', d)
    if match:
        calle = match.group(1).strip()
        calle = re.sub(r'[,.\-]+$', '', calle).strip()
        numero = match.group(2).strip()
        d_limpia = f"{calle} {numero}"
    else:
        # Si no hay número, cortamos en la primera coma (piso/puerta)
        d_limpia = d.split(',')[0].strip()
        
    return d_limpia.title()

def obtener_coordenadas_cartociudad(direccion_limpia):
    if not direccion_limpia:
        return None, None, None, "Consulta vacía"
        
    url = "https://www.cartociudad.es/geocoder/api/geocoder/find"
    
    # Parámetros para la API
    # Importante: NO añadir "Madrid, España" al final del 'q' ya que causa fallos 204
    # La API ya entiende que buscamos en España con 'portal'
    parametros = {
        "q": direccion_limpia, 
        "type": "portal",
        "outSR": "4326"
    }
    
    try:
        respuesta = requests.get(url, params=parametros, timeout=10)
        
        if respuesta.status_code == 200:
            datos = respuesta.json()
            if "geom" in datos and datos["geom"]:
                geom_text = datos["geom"]
                
                # Caso A: Punto exacto (Portal)
                match_point = re.search(r'POINT\s*\(([-\d.]+)\s+([-\d.]+)\)', geom_text)
                if match_point:
                    lon = float(match_point.group(1))
                    lat = float(match_point.group(2))
                    cp = datos.get("postalCode", None) 
                    return lat, lon, cp, None
                
                # Caso B: Calle completa (MULTILINESTRING o LINESTRING)
                # Extraemos todos los números (coordenadas) y hacemos la media para tener un "centro"
                coords = re.findall(r'([-\d.]+)\s+([-\d.]+)', geom_text)
                if coords:
                    lons = [float(c[0]) for c in coords]
                    lats = [float(c[1]) for c in coords]
                    avg_lon = sum(lons) / len(lons)
                    avg_lat = sum(lats) / len(lats)
                    cp = datos.get("postalCode", None)
                    return avg_lat, avg_lon, cp, "Aproximado (Centro de calle)"
                    
            return None, None, None, "No se encontró geometría identificable"
        elif respuesta.status_code == 204:
            return None, None, None, "La API no encontró este portal/calle (204)"
        else:
            return None, None, None, f"Error de la API: Código {respuesta.status_code}"
    except Exception as e:
        return None, None, None, f"Excepción en la llamada: {str(e)}"

# ----------------- EJECUCIÓN PRINCIPAL -----------------

# 1. Cargar el CSV usando ruta relativa al script
script_dir = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(script_dir, "clientes.csv")

if not os.path.exists(csv_path):
    print(f"Error: No se encuentra el archivo {csv_path}")
    exit(1)

# Forzamos codigo_postal a str para evitar errores de tipo
df = pd.read_csv(csv_path, sep="|", dtype={'codigo_postal': str})

# 2. Crear columna de dirección limpia
df["direccion_limpia"] = df["direccion"].apply(normalizar_direccion)

# 3. Crear columnas vacías para los resultados con el tipo correcto
df["latitud"] = pd.Series(dtype='float64')
df["longitud"] = pd.Series(dtype='float64')

print(f"Iniciando geocodificación de {len(df)} clientes en CartoCiudad...")

# 4. Iterar sobre el DataFrame (usando un bucle para respetar un pequeño delay)
cache_geocoding = {}
lista_errores = []

try:
    for index, row in df.iterrows():
        dir_query = row["direccion_limpia"]
        
        if not dir_query:
            print(f"[{index+1}/{len(df)}] Sin dirección -> Ignorado")
            continue

        error_msg = None
        # Verificar si ya tenemos esta dirección en la caché
        if dir_query in cache_geocoding:
            lat, lon, cp, error_msg = cache_geocoding[dir_query]
            origen = "CACHE"
        else:
            lat, lon, cp, error_msg = obtener_coordenadas_cartociudad(dir_query)
            cache_geocoding[dir_query] = (lat, lon, cp, error_msg)
            origen = "API"
            # Pequeño retraso para no saturar el servidor del IGN solo si llamamos a la API
            time.sleep(0.3)
        
        df.at[index, "latitud"] = lat
        df.at[index, "longitud"] = lon
        
        # Si teníamos el CP vacío, lo rellenamos con el que nos da la API/Caché
        if pd.isna(row["codigo_postal"]) or str(row["codigo_postal"]).strip() == "":
            df.at[index, "codigo_postal"] = cp
            
        # Mensaje de progreso mejorado
        estado = "OK" if lat else "FALLO"
        print(f"[{index+1}/{len(df)}] {row['direccion']} -> {dir_query} [{estado}] ({origen})")

        # Registrar error si fallo
        if not lat:
            lista_errores.append({
                "id_cliente": row["id"],
                "direccion_original": row["direccion"],
                "direccion_limpia": dir_query,
                "error_recibido": error_msg
            })
except KeyboardInterrupt:
    print("\n\nPROCESO INTERRUMPIDO POR EL USUARIO. Guardando progreso actual...")

finally:
    # 5. Guardar el archivo enriquecido en la misma carpeta que el CSV
    output_path = os.path.join(script_dir, "clientes_geolocalizados.csv")
    df.to_csv(output_path, sep="|", index=False, encoding="utf-8")
    print(f"\nProceso finalizado. Archivo guardado como '{output_path}'")

    # 6. Guardar archivo de errores
    if lista_errores:
        error_path = os.path.join(script_dir, "errores_geolocalizacion.csv")
        df_errores = pd.DataFrame(lista_errores)
        df_errores.to_csv(error_path, sep="|", index=False, encoding="utf-8")
        print(f"Se han registrado {len(lista_errores)} fallos en '{error_path}'")
