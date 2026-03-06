from app import create_app, db
from app.models import Pedido
from sqlalchemy import func
from datetime import datetime, timedelta

app = create_app()

def diagnostic():
    with app.app_context():
        now = datetime.utcnow()
        print(f"Now: {now}")
        
        # Test Quarter period
        period = 'quarter'
        days = 90
        curr_start = now - timedelta(days=90)
        curr_end = now
        prev_start = curr_start - timedelta(days=365)
        prev_end = curr_end - timedelta(days=365)
        window_delta = curr_end - curr_start
        curr_churn_window_start = curr_start - window_delta
        prev_churn_window_start = prev_start - window_delta
        
        print(f"\n--- Period: {period} ---")
        print(f"Current Start: {curr_start}")
        print(f"Current Churn Search Window: {curr_churn_window_start} to {curr_start}")
        print(f"Previous Start (YoY): {prev_start}")
        print(f"Previous Churn Search Window: {prev_churn_window_start} to {prev_start}")

        # Orders in these windows
        orders_curr_churn_win = db.session.query(func.count(Pedido.id)).filter((Pedido.fecha_pedido >= curr_churn_window_start) & (Pedido.fecha_pedido < curr_start)).scalar()
        orders_prev_churn_win = db.session.query(func.count(Pedido.id)).filter((Pedido.fecha_pedido >= prev_churn_window_start) & (Pedido.fecha_pedido < prev_start)).scalar()
        
        print(f"ORDERS_CURR_WIN: {orders_curr_churn_win}")
        print(f"ORDERS_PREV_WIN: {orders_prev_churn_win}")

        # Churn Calc
        recent_buyers_sub = db.session.query(Pedido.cliente_id).filter(Pedido.fecha_pedido >= curr_start)
        churn_curr = db.session.query(func.count(func.distinct(Pedido.cliente_id)))\
            .filter((Pedido.fecha_pedido >= curr_churn_window_start) & (Pedido.fecha_pedido < curr_start))\
            .filter(~Pedido.cliente_id.in_(recent_buyers_sub)).scalar() or 0
            
        hist_buyers_sub = db.session.query(Pedido.cliente_id).filter((Pedido.fecha_pedido >= prev_start) & (Pedido.fecha_pedido <= prev_end))
        churn_prev = db.session.query(func.count(func.distinct(Pedido.cliente_id)))\
            .filter((Pedido.fecha_pedido >= prev_churn_window_start) & (Pedido.fecha_pedido < prev_start))\
            .filter(~Pedido.cliente_id.in_(hist_buyers_sub)).scalar() or 0
            
        print(f"RESULT_CHURN_CURR: {churn_curr}")
        print(f"RESULT_CHURN_PREV: {churn_prev}")
        
        # Growth
        growth = ((churn_curr - churn_prev) / churn_prev * 100) if churn_prev > 0 else (100 if churn_curr > 0 else 0)
        print(f"RESULT_GROWTH: {growth}")

        # Check for orders in late 2024 specifically
        o2024 = db.session.query(func.count(Pedido.id)).filter(Pedido.fecha_pedido >= datetime(2024, 9, 1)).filter(Pedido.fecha_pedido < datetime(2025, 1, 1)).scalar()
        print(f"ORDERS_SEPT_DEC_2024: {o2024}")

if __name__ == "__main__":
    diagnostic()
