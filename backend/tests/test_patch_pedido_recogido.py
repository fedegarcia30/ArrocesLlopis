import pytest
import datetime
from app.models import Pedido, Cliente, Arroz
from app import db

def test_patch_pedido_recogido(client, app, runster_headers):
    # Seed an order
    with app.app_context():
        # Ensure we have an Arroz with id=1
        if not Arroz.query.get(1):
            db.session.add(Arroz(id=1, nombre="Test Arroz", precio=10.0))
            
        c = Cliente(nombre="PatchTestClient", telefono="999")
        db.session.add(c)
        db.session.commit()
        
        p = Pedido(
            cliente_id=c.id, 
            pax=2, 
            fecha_pedido=datetime.datetime(2026, 6, 20, 13, 0), 
            status='listo',
            recogido=False
        )
        db.session.add(p)
        db.session.commit()
        
        pedido_id = p.id
        
    # Update recogido to true
    response = client.patch(
        f'/api/v1/pedidos/{pedido_id}',
        json={"recogido": True},
        headers=runster_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data["recogido"] is True
    assert data["id"] == pedido_id
    
    # Verify in DB
    with app.app_context():
        p_db = Pedido.query.get(pedido_id)
        assert p_db.recogido is True

    # Update recogido back to false
    response = client.patch(
        f'/api/v1/pedidos/{pedido_id}',
        json={"recogido": False},
        headers=runster_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data["recogido"] is False
    
    # Verify in DB
    with app.app_context():
        p_db = Pedido.query.get(pedido_id)
        assert p_db.recogido is False
