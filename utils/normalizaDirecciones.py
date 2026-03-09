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
    d = re.sub(r'\bm[ªa]\.?\s', 'maria ', d)
    d = re.sub(r'\bnstar\.\s?', 'nuestra ', d)
    d = re.sub(r'\bsra\.\s?', 'señora ', d)
    d = re.sub(r'\bfdez\.\s?', 'fernandez ', d)
    
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
    d = re.sub(r'g\.\s?fuertes', 'gloria fuertes', d)
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

# Coordenadas de referencia: C. de Nuria, 10, 28034 Madrid (Ubicación de la tienda)
REF_LAT = 40.4904402687077
REF_LON = -3.70134377280688

def calcular_distancia_sq(lat1, lon1, lat2, lon2):
    """Calcula el cuadrado de la distancia euclídea (suficiente para comparar)"""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return float('inf')
    return (lat1 - lat2)**2 + (lon1 - lon2)**2

def obtener_coordenadas_cartociudad(direccion_limpia):
    if not direccion_limpia:
        return None, None, None, None, "Consulta vacía"
        
    url_find = "https://www.cartociudad.es/geocoder/api/geocoder/find"
    url_cand = "https://www.cartociudad.es/geocoder/api/geocoder/candidates"
    params = {"q": f"{direccion_limpia}, Madrid", "outSR": "4326"}
    
    candidatos_validos = []

    # 1. Intentamos con el endpoint de 'find'
    try:
        r = requests.get(url_find, params={**params, "type": "portal"}, timeout=10)
        if r.status_code == 200:
            datos = r.json()
            cp_api = str(datos.get("postalCode", ""))
            if cp_api.startswith("28"):
                cp_match = re.search(r'\b28\d{3}\b', cp_api)
                cp_limpio = cp_match.group(0) if cp_match else None
                geom_text = datos.get("geom")
                address_api = datos.get("address", "")
                
                if geom_text:
                    match_point = re.search(r'POINT\s*\(([-\d.]+)\s+([-\d.]+)\)', geom_text)
                    if match_point:
                        lat, lon = float(match_point.group(2)), float(match_point.group(1))
                        dist = calcular_distancia_sq(lat, lon, REF_LAT, REF_LON)
                        candidatos_validos.append((lat, lon, cp_limpio, address_api, dist))
                    else:
                        coords = re.findall(r'([-\d.]+)\s+([-\d.]+)', geom_text)
                        if coords:
                            lons = [float(c[0]) for c in coords]
                            lats = [float(c[1]) for c in coords]
                            lat, lon = sum(lats)/len(lats), sum(lons)/len(lons)
                            dist = calcular_distancia_sq(lat, lon, REF_LAT, REF_LON)
                            candidatos_validos.append((lat, lon, cp_limpio, address_api, dist))
    except:
        pass

    # 2. Buscamos en CANDIDATOS (Fallback e iteración)
    try:
        r_cand = requests.get(url_cand, params=params, timeout=10)
        if r_cand.status_code == 200:
            for cand in r_cand.json():
                cp_cand = str(cand.get("postalCode", ""))
                if cp_cand.startswith("28"):
                    cp_match = re.search(r'\b28\d{3}\b', cp_cand)
                    cp_limpio = cp_match.group(0) if cp_match else None
                    lat, lon = cand.get("lat"), cand.get("lng")
                    addr_api = cand.get("address", "")
                    
                    if lat and lat != 0:
                        dist = calcular_distancia_sq(lat, lon, REF_LAT, REF_LON)
                        # Evitar duplicados si 'find' ya lo pilló (comparando por dirección o coordenadas muy cercanas)
                        if not any(abs(c[0]-lat) < 0.00001 and abs(c[1]-lon) < 0.00001 for c in candidatos_validos):
                            candidatos_validos.append((lat, lon, cp_limpio, addr_api, dist))
    except:
        pass

    # SELECCIÓN: El más cercano a la referencia
    if candidatos_validos:
        # Ordenar por distancia (el 5º elemento de la tupla)
        candidatos_validos.sort(key=lambda x: x[4])
        best = candidatos_validos[0]
        return best[0], best[1], best[2], best[3], None

    return None, None, None, None, "No encontrado en Madrid"

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

# CONFIGURACIÓN DE EJECUCIÓN
LIMIT_TEST = None  # Cambiar a None para ejecución completa
SAVE_INTERVAL = 100

try:
    for index, row in df.iterrows():
        # Limitar para prueba si es necesario
        if LIMIT_TEST is not None and index >= LIMIT_TEST:
            print(f"\nAlcanzado límite de prueba ({LIMIT_TEST} registros). Parando...")
            break
            
        dir_query = row["direccion_limpia"]
        
        if not dir_query:
            print(f"[{index+1}/{len(df)}] Sin dirección -> Ignorado")
            continue

        error_msg = None
        # Verificar si ya tenemos esta dirección en la caché
        if dir_query in cache_geocoding:
            lat, lon, cp, addr, error_msg = cache_geocoding[dir_query]
            origen = "CACHE"
        else:
            lat, lon, cp, addr, error_msg = obtener_coordenadas_cartociudad(dir_query)
            cache_geocoding[dir_query] = (lat, lon, cp, addr, error_msg)
            origen = "API"
            # Pequeño retraso para no saturar el servidor del IGN solo si llamamos a la API
            time.sleep(0.3)
        
        if lat:
            df.at[index, "latitud"] = lat
            df.at[index, "longitud"] = lon
            # Actualizar la dirección limpia con el nombre completo de la API
            if addr:
                df.at[index, "direccion_limpia"] = addr
            # Actualizar el Código Postal si la API nos da uno válido
            if cp:
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

        # Guardado incremental cada SAVE_INTERVAL registros
        if (index + 1) % SAVE_INTERVAL == 0:
            output_path = os.path.join(script_dir, "clientes_geolocalizados.csv")
            df.to_csv(output_path, sep="|", index=False, encoding="utf-8")
            print(f"--- Progreso guardado incrementalmente ({index + 1} registros) ---")
except KeyboardInterrupt:
    print("\n\nPROCESO INTERRUMPIDO POR EL USUARIO. Guardando progreso actual...")

finally:
    # 5. Guardar el archivo enriquecido en la misma carpeta que el CSV
    # FILTRAR: Solo incluimos registros con latitud (geolocalizados con éxito en Madrid)
    df_geolocalizados = df[df["latitud"].notna()].copy()
    
    output_path = os.path.join(script_dir, "clientes_geolocalizados.csv")
    df_geolocalizados.to_csv(output_path, sep="|", index=False, encoding="utf-8")
    print(f"\nProceso finalizado. Archivo guardado como '{output_path}'")
    print(f"Total geolocalizados en Madrid: {len(df_geolocalizados)}")

    # 6. Guardar archivo de errores
    if lista_errores:
        error_path = os.path.join(script_dir, "errores_geolocalizacion.csv")
        df_errores = pd.DataFrame(lista_errores)
        df_errores.to_csv(error_path, sep="|", index=False, encoding="utf-8")
        print(f"Se han registrado {len(lista_errores)} fallos en '{error_path}'")
