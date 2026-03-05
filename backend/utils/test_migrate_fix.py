from datetime import datetime

def get_val(fields, key, default=None):
    val = fields.get(key, default)
    if isinstance(val, list):
        return val[0] if val else default
    return val

def extract_fecha(fields):
    fecha_pedido = None
    
    # Intenta usar el campo de fórmula o fecha de creación (formato ISO Airtable)
    fecha_fld = get_val(fields, 'FechaPedido') or get_val(fields, 'FechaCreacion')
    if fecha_fld:
        try:
            # Manejar formato ISO "2024-08-06T15:43:38.000Z"
            fecha_pedido = datetime.fromisoformat(fecha_fld.replace('Z', '+00:00'))
        except:
            pass
            
    # Si falla, intenta concatenación manual de Fecha/Hora
    if not fecha_pedido:
        fecha_str = get_val(fields, 'Fecha', '')
        hora_str = get_val(fields, 'Hora', '')
        if fecha_str and hora_str:
            try:
                # Formato DD/MM/YYYY HH:mm
                fecha_pedido = datetime.strptime(f"{fecha_str} {hora_str}", "%d/%m/%Y %H:%M")
            except:
                pass
                
    # Fallback final a ahora() para evitar NULL en DB
    if not fecha_pedido:
        fecha_pedido = datetime.now()
    
    return fecha_pedido

def test_date_logic():
    # Case 1: FechaPedido available (ISO)
    fields1 = {'FechaPedido': '2023-01-01T13:30:00.000Z'}
    dt1 = extract_fecha(fields1)
    assert dt1.year == 2023 and dt1.month == 1 and dt1.day == 1 and dt1.hour == 13
    
    # Case 2: FechaCreacion available (ISO)
    fields2 = {'FechaCreacion': '2024-08-06T15:43:38.000Z'}
    dt2 = extract_fecha(fields2)
    assert dt2.year == 2024 and dt2.month == 8 and dt2.day == 6
    
    # Case 3: Manual Fecha/Hora
    fields3 = {'Fecha': '15/05/2024', 'Hora': '14:20'}
    dt3 = extract_fecha(fields3)
    assert dt3.year == 2024 and dt3.month == 5 and dt3.day == 15 and dt3.hour == 14
    
    # Case 4: No date info (Fallback to now)
    fields4 = {}
    dt4 = extract_fecha(fields4)
    assert isinstance(dt4, datetime)
    
    # Case 5: Empty fields (Fallback to now)
    fields5 = {'Fecha': '', 'Hora': ''}
    dt5 = extract_fecha(fields5)
    assert isinstance(dt5, datetime)

    print("✅ Date logic tests passed!")

if __name__ == "__main__":
    test_date_logic()
