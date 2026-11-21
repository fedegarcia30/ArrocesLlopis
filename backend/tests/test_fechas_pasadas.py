"""Regla: solo el admin puede crear o modificar pedidos de fechas pasadas."""
import datetime

import pytest

from app import db
from app.models import Cliente, Pedido, PedidoLinea, Usuario


def _set_rol(app, rol):
    # El token de desarrollo corresponde siempre a este usuario; cambiamos su rol
    with app.app_context():
        u = Usuario.query.filter_by(username='admin@arrocesllopis.com').first()
        u.rol = rol
        db.session.commit()


def _pedido(app, fecha):
    with app.app_context():
        c = Cliente(nombre="Pasado", telefono="600111222")
        db.session.add(c)
        db.session.commit()
        p = Pedido(cliente_id=c.id, pax=4, fecha_pedido=fecha, status='nuevo')
        db.session.add(p)
        db.session.commit()
        db.session.add(PedidoLinea(pedido_id=p.id, arroz_id=1, precio_unitario=15, raciones=4))
        db.session.commit()
        return p.id


AYER = datetime.datetime.now() - datetime.timedelta(days=2)
MANANA = datetime.datetime.now() + datetime.timedelta(days=2)


def _payload(fecha):
    return {
        "date": fecha.strftime('%Y-%m-%d'), "time": "14:00",
        "client": {"id": None, "nombre": "Nuevo", "telefono": "600999888", "direccion": "", "codigo_postal": ""},
        "order": {"lines": [{"arroz_id": 1, "pax": 4}], "recogida": True},
    }


@pytest.mark.parametrize("rol", ["gerente", "cocinero"])
def test_no_admin_no_crea_en_pasado(client, app, runster_headers, rol):
    _set_rol(app, rol)
    r = client.post('/api/v1/orders/create', json=_payload(AYER), headers=runster_headers)
    assert r.status_code == 403
    assert r.get_json()["error_code"] == "PAST_DATE"
    # En fechas futuras sí puede
    r = client.post('/api/v1/orders/create', json=_payload(MANANA), headers=runster_headers)
    assert r.status_code == 201


def test_admin_crea_en_pasado(client, app, runster_headers):
    r = client.post('/api/v1/orders/create', json=_payload(AYER), headers=runster_headers)
    assert r.status_code == 201


def test_no_admin_no_modifica_pedido_pasado(client, app, runster_headers):
    pid = _pedido(app, AYER.replace(hour=13, minute=0, second=0, microsecond=0))
    _set_rol(app, "gerente")

    for body in ({"observaciones": "x"}, {"lines": [{"arroz_id": 1, "pax": 6}]}, {"local_recogida": False},
                 {"fecha_pedido": MANANA.strftime('%Y-%m-%d') + " 14:00"}):
        r = client.patch(f'/api/v1/pedidos/{pid}', json=body, headers=runster_headers)
        assert r.status_code == 403, body

    # Cancelar un pedido pasado: no
    r = client.patch(f'/api/v1/pedidos/{pid}/status', json={"status": "cancelado"}, headers=runster_headers)
    assert r.status_code == 403

    # Logística sobre pedidos pasados: sí (entregar y recoger recipientes)
    r = client.patch(f'/api/v1/pedidos/{pid}/status', json={"status": "entregado"}, headers=runster_headers)
    assert r.status_code == 200
    r = client.patch(f'/api/v1/pedidos/{pid}', json={"recogido": True}, headers=runster_headers)
    assert r.status_code == 200


def test_no_admin_no_mueve_pedido_al_pasado(client, app, runster_headers):
    pid = _pedido(app, MANANA.replace(hour=13, minute=0, second=0, microsecond=0))
    _set_rol(app, "gerente")
    r = client.patch(f'/api/v1/pedidos/{pid}', json={"fecha_pedido": AYER.strftime('%Y-%m-%d') + " 14:00"}, headers=runster_headers)
    assert r.status_code == 403
    # Mover dentro del futuro, sí
    r = client.patch(f'/api/v1/pedidos/{pid}', json={"fecha_pedido": MANANA.strftime('%Y-%m-%d') + " 14:30"}, headers=runster_headers)
    assert r.status_code == 200


def test_admin_modifica_pedido_pasado(client, app, runster_headers):
    pid = _pedido(app, AYER.replace(hour=13, minute=0, second=0, microsecond=0))
    r = client.patch(f'/api/v1/pedidos/{pid}', json={"observaciones": "corrección"}, headers=runster_headers)
    assert r.status_code == 200
    r = client.patch(f'/api/v1/pedidos/{pid}/status', json={"status": "cancelado"}, headers=runster_headers)
    assert r.status_code == 200
