import pytest
from app.models import Pedido, Cliente, PedidoLinea

def test_create_order_new_client(client, runster_headers):
    payload = {
        "date": "2026-06-15",
        "time": "14:30",
        "client": {
            "nombre": "Ana Gomez",
            "telefono": "666777888"
        },
        "order": {
            "arroz_id": 1,
            "pax": 4,
            "recogida": True
        }
    }
    
    response = client.post(
        '/api/v1/orders/create',
        json=payload,
        headers=runster_headers
    )
    
    assert response.status_code == 201
    data = response.get_json()
    assert data["success"] == True
    assert "order_id" in data
    
def test_create_order_slot_full_rejected(client, app, runster_headers):
    # First max out the slot (15:00) with 6 orders
    import datetime
    with app.app_context():
        c = Cliente(nombre="Tester")
        from app import db
        db.session.add(c)
        db.session.commit()
        
        test_date = datetime.date(2026, 6, 15)
        for _ in range(6):
            p = Pedido(
                cliente_id=c.id,
                pax=2,
                fecha_pedido=datetime.datetime.combine(test_date, datetime.time(15, 0))
            )
            db.session.add(p)
            db.session.flush()
            db.session.add(PedidoLinea(
                pedido_id=p.id,
                arroz_id=1,
                precio_unitario=15,
                raciones=2
            ))
        db.session.commit()
        
    # Attempt 7th order
    payload = {
        "date": "2026-06-15",
        "time": "15:00",
        "client": {
            "nombre": "Reject Me"
        },
        "order": {
            "arroz_id": 1,
            "pax": 4
        }
    }
    
    response = client.post(
        '/api/v1/orders/create',
        json=payload,
        headers=runster_headers
    )
    
    assert response.status_code == 400
    data = response.get_json()
    assert data["success"] == False
    assert data["error_code"] == "SLOT_FULL"
