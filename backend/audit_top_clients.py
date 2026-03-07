from app import create_app, db
from app.models import Cliente, Pedido, PedidoLinea
from sqlalchemy import func
from datetime import datetime

def audit_clients():
    app = create_app()
    with app.app_context():
        # 1. Buscar clientes
        clients = Cliente.query.filter(Cliente.nombre.like('%Llopis%') | Cliente.nombre.like('%Garcia%')).all()
        print(f"\n--- Clientes encontrados ({len(clients)}) ---")
        for c in clients:
            print(f"ID: {c.id} | Nombre: {c.nombre} | Telefono: {c.telefono} | Raciones: {c.raciones}")

        # 2. Calcular ingresos y raciones para el año actual (2026)
        start_date = datetime(2026, 1, 1)
        
        stats = db.session.query(
            Cliente.nombre,
            func.count(Pedido.id).label('orders'),
            func.sum(Pedido.pax * PedidoLinea.precio_unitario).label('spent'),
            func.sum(Pedido.pax).label('rations_total')
        ).join(Pedido, Cliente.id == Pedido.cliente_id)\
         .join(PedidoLinea, Pedido.id == PedidoLinea.pedido_id)\
         .filter(
             Pedido.fecha_pedido >= start_date,
             Pedido.status != 'cancelado',
             Pedido.deleted_at.is_(None)
         )\
         .group_by(Cliente.id)\
         .order_by(func.sum(Pedido.pax * PedidoLinea.precio_unitario).desc())\
         .all()

        print("\n--- Ranking de Ingresos 2026 (Top 10) ---")
        for i, s in enumerate(stats[:10], 1):
            print(f"{i}. {s.nombre}: {float(s.spent):.2f}€ | {int(s.rations_total)} raciones | {s.orders} pedidos")

if __name__ == '__main__':
    audit_clients()
