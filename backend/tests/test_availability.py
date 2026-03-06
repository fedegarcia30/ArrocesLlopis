import pytest
from app.models import Pedido
from app import db
import datetime

def test_availability_empty_slot(client, runster_headers):
    # Test checking a slot that has no orders yet
    response = client.post(
        '/api/v1/availability/check',
        json={"date": "2026-05-10"},
        headers=runster_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data["date"] == "2026-05-10"
    assert len(data["slots"]) > 0
    
    first_slot = data["slots"][0]
    assert first_slot["available"] == True
    assert first_slot["orders_count"] == 0
    assert first_slot["pax_total"] == 0
    assert first_slot["status"] == "green"

def test_availability_max_orders_reached(client, app, runster_headers):
    # Seed 6 orders in the 13:00 slot
    with app.app_context():
        # Need a client
        from app.models import Cliente
        c = Cliente(nombre="Test client")
        db.session.add(c)
        db.session.commit()
        
        test_date = datetime.date(2026, 5, 10)
        for _ in range(6):
            p = Pedido(cliente_id=c.id, pax=2, fecha=test_date, intervalo="13:00", arroz_id=1)
            db.session.add(p)
        db.session.commit()

    response = client.post(
        '/api/v1/availability/check',
        json={"date": "2026-05-10"},
        headers=runster_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    
    # Check 13:00 slot (should be red and unavailable)
    slot_1300 = next(s for s in data["slots"] if s["time"] == "13:00")
    assert slot_1300["available"] == False
    assert slot_1300["status"] == "red"
    assert slot_1300["orders_count"] == 6
    assert slot_1300["remaining_orders"] == 0
    
    # Check 13:30 slot (should be green and empty)
    slot_1330 = next(s for s in data["slots"] if s["time"] == "13:30")
    assert slot_1330["available"] == True
    assert slot_1330["status"] == "green"
    
def test_availability_max_pax_reached(client, app, runster_headers):
    # Seed 1 order with 72 pax in the 14:00 slot
    with app.app_context():
        from app.models import Cliente
        c = Cliente(nombre="Big Party")
        db.session.add(c)
        db.session.commit()
        
        test_date = datetime.date(2026, 5, 10)
        p = Pedido(cliente_id=c.id, pax=72, fecha=test_date, intervalo="14:00", arroz_id=1)
        db.session.add(p)
        db.session.commit()

    response = client.post(
        '/api/v1/availability/check',
        json={"date": "2026-05-10"},
        headers=runster_headers
    )
    
    data = response.get_json()
    slot_1400 = next(s for s in data["slots"] if s["time"] == "14:00")
    
    assert slot_1400["available"] == False
    assert slot_1400["status"] == "red"
    assert slot_1400["pax_total"] == 72
    assert slot_1400["remaining_pax"] == 0
