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
        
        test_date = datetime.datetime(2026, 6, 20, 13, 0)
        p1 = Pedido(cliente_id=c1.id, pax=2, fecha_pedido=test_date, status='nuevo')
        p2 = Pedido(cliente_id=c2.id, pax=4, fecha_pedido=test_date, status='preparando')
        db.session.add_all([p1, p2])
        db.session.commit()
        
    response = client.get('/api/v1/pedidos', headers=runster_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) >= 2 
    
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
    
def test_update_pedido_status_and_stats(client, app, runster_headers):
    # Seed an order
    with app.app_context():
        # Start with a client that already has 1 order of 2 pax
        c = Cliente(nombre="Client", telefono="123", num_pedidos=1, raciones=2)
        db.session.add(c)
        db.session.commit()
        
        p = Pedido(cliente_id=c.id, pax=2, fecha_pedido=datetime.datetime(2026, 6, 20, 13, 0), status='nuevo')
        db.session.add(p)
        db.session.commit()
        pedido_id = p.id
        client_id = c.id
        
    # Cancel order
    response = client.patch(
        f'/api/v1/pedidos/{pedido_id}/status',
        json={"status": "cancelado"},
        headers=runster_headers
    )
    assert response.status_code == 200
    
    with app.app_context():
        updated_client = Cliente.query.get(client_id)
        assert updated_client.num_pedidos == 0
        assert updated_client.raciones == 0

    # Restore order
    response = client.patch(
        f'/api/v1/pedidos/{pedido_id}/status',
        json={"status": "nuevo"},
        headers=runster_headers
    )
    assert response.status_code == 200
    
    with app.app_context():
        restored_client = Cliente.query.get(client_id)
        assert restored_client.num_pedidos == 1
        assert restored_client.raciones == 2

def test_update_pedido_pax_and_stats(client, app, runster_headers):
    with app.app_context():
        c = Cliente(nombre="Client Pax", telefono="999", num_pedidos=1, raciones=4)
        db.session.add(c)
        db.session.commit()
        
        p = Pedido(cliente_id=c.id, pax=4, fecha_pedido=datetime.datetime(2026, 6, 20, 13, 0), status='nuevo')
        db.session.add(p)
        db.session.commit()
        pedido_id = p.id
        client_id = c.id

    # Update PAX 4 -> 6
    response = client.patch(
        f'/api/v1/pedidos/{pedido_id}',
        json={"pax": 6},
        headers=runster_headers
    )
    assert response.status_code == 200
    
    with app.app_context():
        updated_client = Cliente.query.get(client_id)
        assert updated_client.raciones == 6

    # Update PAX 6 -> 3
    response = client.patch(
        f'/api/v1/pedidos/{pedido_id}',
        json={"pax": 3},
        headers=runster_headers
    )
    assert response.status_code == 200
    
    with app.app_context():
        updated_client = Cliente.query.get(client_id)
        assert updated_client.raciones == 3

def test_update_pedido_status_invalid(client, app, runster_headers):
     with app.app_context():
        c = Cliente(nombre="Client", telefono="123")
        db.session.add(c)
        db.session.commit()
        p = Pedido(cliente_id=c.id, pax=2, fecha_pedido=datetime.datetime(2026, 6, 20, 13, 0), status='nuevo')
        db.session.add(p)
        db.session.commit()
        pedido_id = p.id
        
     response = client.patch(
        f'/api/v1/pedidos/{pedido_id}/status',
        json={"status": "INVALID_STATUS"},
        headers=runster_headers
     )
     assert response.status_code == 400
