from app import create_app, db
from app.models import Cliente, Pedido
from sqlalchemy import func

def migrate():
    app = create_app()
    with app.app_context():
        print("Iniciando migración de raciones por cliente...")
        
        # 1. Asegurarse de que la columna existe (si no se usó Flask-Migrate)
        try:
            db.engine.execute('ALTER TABLE clientes ADD COLUMN raciones INT DEFAULT 0')
            print("Columna 'raciones' añadida a la tabla 'clientes'.")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("La columna 'raciones' ya existe.")
            else:
                print(f"Nota al añadir columna: {e}")

        # 2. Calcular raciones totales por cliente desde pedidos existentes
        # Solo contamos pedidos no cancelados
        stats = db.session.query(
            Pedido.cliente_id,
            func.sum(Pedido.pax).label('total_raciones')
        ).filter(
            Pedido.status != 'cancelado',
            Pedido.deleted_at.is_(None)
        ).group_by(Pedido.cliente_id).all()

        total_updated = 0
        for cliente_id, total_raciones in stats:
            cliente = Cliente.query.get(cliente_id)
            if cliente:
                cliente.raciones = int(total_raciones)
                total_updated += 1
        
        db.session.commit()
        print(f"Migración completada. Se han actualizado {total_updated} clientes.")

if __name__ == '__main__':
    migrate()
