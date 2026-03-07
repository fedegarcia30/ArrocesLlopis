from app import create_app, db
from app.models import Cliente, Pedido, PedidoLinea
from sqlalchemy import func
from datetime import datetime

def find_federicos():
    app = create_app()
    with app.app_context():
        # Search for Federico
        clients = Cliente.query.filter(Cliente.nombre.like('%Federico%')).all()
        print(f"\n--- Clientes 'Federico' encontrados ({len(clients)}) ---")
        for c in clients:
            # Get 2026 stats for each
            start_date = datetime(2026, 1, 1)
            orders = db.session.query(
                func.count(Pedido.id).label('orders'),
                func.sum(Pedido.pax * PedidoLinea.precio_unitario).label('spent'),
                func.sum(Pedido.pax).label('rations_total')
            ).join(PedidoLinea).filter(
                Pedido.cliente_id == c.id,
                Pedido.fecha_pedido >= start_date,
                Pedido.status != 'cancelado',
                Pedido.deleted_at.is_(None)
            ).first()
            
            spent = float(orders.spent or 0)
            rations = int(orders.rations_total or 0)
            print(f"ID: {c.id} | Nombre: {c.nombre} | Gastado 2026: {spent:.2f}€ | Raciones 2026: {rations}")

if __name__ == '__main__':
    find_federicos()
