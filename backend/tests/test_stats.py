from datetime import datetime

from app import db
from app.models import Arroz, Cliente, Pedido, PedidoLinea


def test_dashboard_stats_aggregate_multi_line_orders(client, app, runster_headers):
    with app.app_context():
        cliente = Cliente(nombre="Multi-line client", codigo_postal="12345")
        arroz_dos = Arroz(id=2, nombre="Arroz Test 2", precio=20, disponible=True)
        db.session.add_all([cliente, arroz_dos])
        db.session.flush()

        pedido = Pedido(
            cliente_id=cliente.id,
            pax=6,
            fecha_pedido=datetime.utcnow(),
        )
        db.session.add(pedido)
        db.session.flush()
        db.session.add_all([
            PedidoLinea(
                pedido_id=pedido.id,
                arroz_id=1,
                precio_unitario=10,
                raciones=4,
            ),
            PedidoLinea(
                pedido_id=pedido.id,
                arroz_id=2,
                precio_unitario=20,
                raciones=2,
            ),
        ])
        db.session.commit()

    response = client.get(
        "/api/v1/stats/dashboard?period=quarter&mode=full",
        headers=runster_headers,
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["summary"]["rations"]["value"] == 6
    assert data["summary"]["revenue"]["value"] == 80
    assert data["summary"]["orders"]["value"] == 1
    assert sorted(item["rations"] for item in data["top_arroces"]) == [2, 4]
    client_stat = next(item for item in data["top_clients"] if item["nombre"] == "Multi-line client")
    assert client_stat["orders"] == 1
    assert client_stat["rations"] == 6
    assert client_stat["spent"] == 80
    zipcode_stat = next(item for item in data["top_zipcodes"] if item["cp"] == "12345")
    assert zipcode_stat["orders"] == 1
    assert zipcode_stat["revenue"] == 80


def test_dashboard_stats_reference_period(client, runster_headers):
    """?ref=YYYY-MM-DD permite analizar un periodo pasado (por defecto, el actual)."""
    response = client.get('/api/v1/stats/dashboard?period=quarter&mode=mtd&ref=2025-02-10', headers=runster_headers)
    assert response.status_code == 200
    info = response.get_json()["period_info"]
    # periodo pasado: se fuerza periodo completo (sin prefijo "1-N")
    assert info["current"]["label"] == "1º Trimestre 2025"
    assert info["previous"]["label"] == "1º Trimestre 2024"

    response = client.get('/api/v1/stats/dashboard?period=ytd&ref=2024-06-01', headers=runster_headers)
    assert response.get_json()["period_info"]["current"]["label"] == "Año 2024"

    response = client.get('/api/v1/stats/expenses?period=month&ref=2024-03-15', headers=runster_headers)
    assert response.status_code == 200


def test_client_stats_reference_period(client, app, runster_headers):
    """Los análisis de clientes aceptan ?ref para navegar a periodos de calendario pasados."""
    import datetime
    from app.models import Cliente, Pedido
    from app import db
    with app.app_context():
        c = Cliente(nombre="Cliente T1", telefono="777")
        db.session.add(c)
        db.session.commit()
        db.session.add(Pedido(cliente_id=c.id, pax=4, fecha_pedido=datetime.datetime(2025, 2, 10, 13, 0), status='entregado'))
        db.session.commit()

    r = client.get('/api/v1/clients/stats?period=quarter&ref=2025-02-15', headers=runster_headers)
    assert r.status_code == 200
    assert r.get_json()["total_clients"]["value"] == 1

    # Otro trimestre: el cliente no aparece
    r = client.get('/api/v1/clients/stats?period=quarter&ref=2025-05-15', headers=runster_headers)
    assert r.get_json()["total_clients"]["value"] == 0

    r = client.get('/api/v1/clients/analysis?period=quarter&ref=2025-02-15', headers=runster_headers)
    assert r.status_code == 200
