import pytest
import datetime
from app.models import Pedido, Cliente, Arroz, PedidoFeedback
from app import db

def test_pedido_feedback(client, app, runster_headers):
    # Seed an order
    with app.app_context():
        # Ensure we have an Arroz with id=1
        if not Arroz.query.get(1):
             db.session.add(Arroz(id=1, nombre="Test Arroz Feedback", precio=12.0))
             
        c = Cliente(nombre="FeedbackClient", telefono="111222")
        db.session.add(c)
        db.session.commit()
        
        p = Pedido(
            cliente_id=c.id, 
            pax=2, 
            fecha_pedido=datetime.datetime(2026, 7, 10, 14, 0), 
            status='entregado'
        )
        db.session.add(p)
        db.session.commit()
        
        pedido_id = p.id

    # 1. Post feedback
    response = client.post(
        f'/api/v1/pedidos/{pedido_id}/feedback',
        json={"rating": 9, "comentario": "Excelente!"},
        headers=runster_headers
    )
    assert response.status_code == 200
    assert response.get_json()["success"] is True

    # 2. Get feedback
    response = client.get(
        f'/api/v1/pedidos/{pedido_id}/feedback',
        headers=runster_headers
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["rating"] == 9
    assert data["comentario"] == "Excelente!"
    assert data["pedido_id"] == pedido_id

    # 3. Update feedback (upsert)
    response = client.post(
        f'/api/v1/pedidos/{pedido_id}/feedback',
        json={"rating": 10},
        headers=runster_headers
    )
    assert response.status_code == 200
    
    # 4. Verify update
    response = client.get(
        f'/api/v1/pedidos/{pedido_id}/feedback',
        headers=runster_headers
    )
    data = response.get_json()
    assert data["rating"] == 10
    assert data["comentario"] == "Excelente!" # Should persist old comment if not provided?
    # Actually my implementation does:
    # if rating is not None: feedback.rating = rating
    # if comentario is not None: feedback.comentario = comentario
    # So it persists. Correct.

    # 5. Test invalid rating
    response = client.post(
        f'/api/v1/pedidos/{pedido_id}/feedback',
        json={"rating": 11},
        headers=runster_headers
    )
    assert response.status_code == 400
    
    # 6. Test not found
    response = client.get(
        f'/api/v1/pedidos/999999/feedback',
        headers=runster_headers
    )
    assert response.status_code == 404
