from app import create_app, db
from app.models import Cliente, Pedido, PedidoLinea
from sqlalchemy import func

def check_fedex():
    app = create_app()
    with app.app_context():
        fed = Cliente.query.filter(Cliente.nombre.like('%Federico%Garcia%')).first()
        if not fed:
            print("Federico Garcia no encontrado.")
            return
        
        print(f"\n--- Pedidos de {fed.nombre} (ID: {fed.id}) ---")
        orders = Pedido.query.filter_by(cliente_id=fed.id).all()
        for p in orders:
            lineas = PedidoLinea.query.filter_by(pedido_id=p.id).all()
            total = sum(l.precio_unitario * p.pax for l in lineas)
            print(f"Pedido ID: {p.id} | Fecha: {p.fecha_pedido} | Status: {p.status} | Pax: {p.pax} | Total: {total}€ | Deleted: {p.deleted_at}")

        # Francisco Llopis for comparison
        fra = Cliente.query.filter(Cliente.nombre.like('%francisco%llopis%')).first()
        if fra:
            print(f"\n--- Pedidos de {fra.nombre} (ID: {fra.id}) ---")
            orders = Pedido.query.filter_by(cliente_id=fra.id).all()
            for p in orders:
                lineas = PedidoLinea.query.filter_by(pedido_id=p.id).all()
                total = sum(l.precio_unitario * p.pax for l in lineas)
                print(f"Pedido ID: {p.id} | Fecha: {p.fecha_pedido} | Status: {p.status} | Pax: {p.pax} | Total: {total}€ | Deleted: {p.deleted_at}")

if __name__ == '__main__':
    check_fedex()
