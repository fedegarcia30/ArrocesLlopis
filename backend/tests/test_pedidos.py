import pytest
import datetime
from app.models import Pedido, Cliente, Arroz
from app import db

def test_get_pedidos_list(client, app, runster_headers):
    # Seed a couple of orders
    with app.app_context():
        c1 = Cliente(nombre="Client1", telefono="111")
        c2 = Cliente(nombre="Client2", telefono="222")
        db.session.add_all([c1, c2])
        db.session.commit()
        
        test_date = datetime.date(2026, 6, 20)
        p1 = Pedido(cliente_id=c1.id, pax=2, fecha=test_date, intervalo="13:00", arroz_id=1, status='nuevo')
        p2 = Pedido(cliente_id=c2.id, pax=4, fecha=test_date, intervalo="14:00", arroz_id=1, status='preparando')
        db.session.add_all([p1, p2])
        db.session.commit()
        
    response = client.get('/api/v1/pedidos', headers=runster_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) >= 2 # Could be more if other tests leave state, but we drop_all per app creation config context, actually drop_all is in fixture so it should be exactly 2
    
    # Test filtering by status
    response = client.get('/api/v1/pedidos?status=nuevo', headers=runster_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert all(p["status"] == "nuevo" for p in data)
    assert len(data) == 1
    
    # Test filtering by fecha
    response = client.get('/api/v1/pedidos?fecha=2026-06-20', headers=runster_headers)
    assert response.status_code == 200
    assert len(response.get_json()) == 2
    
def test_update_pedido_status(client, app, runster_headers):
    # Seed an order
    with app.app_context():
        c = Cliente(nombre="Client", telefono="123")
        db.session.add(c)
        db.session.commit()
        
        p = Pedido(cliente_id=c.id, pax=2, fecha=datetime.date(2026, 6, 20), intervalo="13:00", arroz_id=1, status='nuevo')
        db.session.add(p)
        db.session.commit()
        
        pedido_id = p.id
        
    response = client.patch(
        f'/api/v1/pedidos/{pedido_id}/status',
        json={"status": "listo"},
        headers=runster_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "listo"
    assert data["id"] == pedido_id
    
    # Verify DB update directly via GET
    get_response = client.get('/api/v1/pedidos', headers=runster_headers)
    found = next((x for x in get_response.get_json() if x["id"] == pedido_id), None)
    assert found is not None
    assert found["status"] == "listo"
    
def test_update_pedido_status_invalid(client, app, runster_headers):
     with app.app_context():
        c = Cliente(nombre="Client", telefono="123")
        db.session.add(c)
        db.session.commit()
        p = Pedido(cliente_id=c.id, pax=2, fecha=datetime.date(2026, 6, 20), intervalo="13:00", arroz_id=1, status='nuevo')
        db.session.add(p)
        db.session.commit()
        pedido_id = p.id
        
     response = client.patch(
        f'/api/v1/pedidos/{pedido_id}/status',
        json={"status": "INVALID_STATUS"},
        headers=runster_headers
     )
     assert response.status_code == 400
