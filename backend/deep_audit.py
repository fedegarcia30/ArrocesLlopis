from app import create_app, db
from app.models import Cliente, Pedido, PedidoLinea
from sqlalchemy import func
from datetime import datetime

def deep_audit():
    app = create_app()
    with app.app_context():
        fed_id = 569 # Federico Garcia
        start_date = datetime(2026, 1, 1)
        
        print(f"\n--- Auditoría Profunda para Federico Garcia (ID: {fed_id}) - Año 2026 ---")
        
        # Get all orders for 2026
        orders = Pedido.query.filter(
            Pedido.cliente_id == fed_id,
            Pedido.fecha_pedido >= start_date,
            Pedido.deleted_at.is_(None)
        ).all()
        
        print(f"Pedidos encontrados en 2026: {len(orders)}")
        
        stats_total_spent = 0
        stats_total_rations = 0
        
        for p in orders:
            lineas = PedidoLinea.query.filter_by(pedido_id=p.id).all()
            p_spent = sum(float(l.precio_unitario) * p.pax for l in lineas)
            p_rations = p.pax if lineas else 0 # In our query logic, we join with PedidoLinea, so no lineas = no results
            
            stats_total_spent += p_spent
            stats_total_rations += p_rations
            
            print(f"Pedido {p.id} | Fecha: {p.fecha_pedido} | Status: {p.status} | Pax: {p.pax} | Lineas: {len(lineas)} | Subtotal: {p_spent}€")

        print(f"\nTOTAL CALCULADO MANUALMENTE (con lineas): {stats_total_spent:.2f}€ | {stats_total_rations} raciones")

        # Now check Francisco Llopis (ID 980)
        fra_id = 980
        print(f"\n--- Auditoría Profunda para Francisco Llopis (ID: {fra_id}) - Año 2026 ---")
        orders_fra = Pedido.query.filter(
            Pedido.cliente_id == fra_id,
            Pedido.fecha_pedido >= start_date,
            Pedido.deleted_at.is_(None)
        ).all()
        
        fra_spent = 0
        for p in orders_fra:
            lineas = PedidoLinea.query.filter_by(pedido_id=p.id).all()
            fra_spent += sum(float(l.precio_unitario) * p.pax for l in lineas)
        
        print(f"Facturación Llopis 2026: {fra_spent:.2f}€")

if __name__ == '__main__':
    deep_audit()
