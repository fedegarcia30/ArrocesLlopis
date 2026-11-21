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
