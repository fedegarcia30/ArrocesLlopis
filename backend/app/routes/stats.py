from flask import request, jsonify
from app.models import Pedido, PedidoLinea, Arroz, Cliente
from . import api_v1_bp
from app.auth import requires_auth
from app import db
from sqlalchemy import func, extract
from datetime import datetime, timedelta

@api_v1_bp.route('/stats/dashboard', methods=['GET'])
@requires_auth
def get_dashboard_stats():
    """
    Returns comprehensive business metrics and analytics.
    """
    period = request.args.get('period', 'quarter')
    now = datetime.utcnow()
    
    # 1. Define Time Windows
    if period == 'month':
        start_date = now - timedelta(days=30)
    elif period == 'semester':
        start_date = now - timedelta(days=180)
    elif period == 'ytd':
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else: # quarter (default)
        start_date = now - timedelta(days=90)

    window_delta = now - start_date
    curr_start = start_date
    prev_start = curr_start - timedelta(days=365)
    prev_end = now - timedelta(days=365)

    def get_metrics(start, end):
        # Base query for orders in window
        query_base = db.session.query(Pedido).filter(Pedido.fecha_pedido >= start, Pedido.fecha_pedido <= end)
        order_ids = [p.id for p in query_base.all()]
        
        if not order_ids:
            return {
                "revenue": 0,
                "rations": 0,
                "orders_count": 0,
                "avg_ticket": 0,
                "top_arroces": [],
                "top_clients": [],
                "top_zipcodes": [],
                "busiest_month": None
            }

        # Billing & Rations
        # revenue = SUM(pedido.pax * linea.precio_unitario)
        # However, looking at models, PedidoLinea has precio_unitario. 
        # Typically price is per pax.
        stats = db.session.query(
            func.sum(Pedido.pax * PedidoLinea.precio_unitario).label('revenue'),
            func.sum(Pedido.pax).label('rations'),
            func.count(func.distinct(Pedido.id)).label('orders_count')
        ).join(PedidoLinea).filter(Pedido.id.in_(order_ids)).first()

        revenue = float(stats.revenue or 0)
        rations = int(stats.rations or 0)
        orders_count = int(stats.orders_count or 0)
        avg_ticket = revenue / orders_count if orders_count > 0 else 0

        # Top Arroces
        top_arroces = db.session.query(
            Arroz.nombre,
            func.sum(Pedido.pax).label('total_rations'),
            func.sum(Pedido.pax * PedidoLinea.precio_unitario).label('subtotal')
        ).join(PedidoLinea, Arroz.id == PedidoLinea.arroz_id)\
         .join(Pedido, Pedido.id == PedidoLinea.pedido_id)\
         .filter(Pedido.id.in_(order_ids))\
         .group_by(Arroz.id)\
         .order_by(func.sum(Pedido.pax).desc())\
         .limit(5).all()

        # Top Clients
        top_clients = db.session.query(
            Cliente.nombre,
            func.count(Pedido.id).label('orders'),
            func.sum(Pedido.pax * PedidoLinea.precio_unitario).label('spent')
        ).join(Pedido, Cliente.id == Pedido.cliente_id)\
         .join(PedidoLinea, Pedido.id == PedidoLinea.pedido_id)\
         .filter(Pedido.id.in_(order_ids))\
         .group_by(Cliente.id)\
         .order_by(func.sum(Pedido.pax * PedidoLinea.precio_unitario).desc())\
         .limit(5).all()

        # Top Zip Codes
        top_zipcodes = db.session.query(
            Cliente.codigo_postal,
            func.count(Pedido.id).label('orders'),
            func.sum(Pedido.pax * PedidoLinea.precio_unitario).label('revenue')
        ).join(Pedido, Cliente.id == Pedido.cliente_id)\
         .join(PedidoLinea, Pedido.id == PedidoLinea.pedido_id)\
         .filter(Pedido.id.in_(order_ids))\
         .group_by(Cliente.codigo_postal)\
         .order_by(func.count(Pedido.id).desc())\
         .limit(5).all()

        # Busiest Month (only if window covers months)
        busiest = db.session.query(
            extract('month', Pedido.fecha_pedido).label('month'),
            func.sum(Pedido.pax * PedidoLinea.precio_unitario).label('rev')
        ).join(PedidoLinea).filter(Pedido.id.in_(order_ids))\
         .group_by('month').order_by(func.sum(Pedido.pax * PedidoLinea.precio_unitario).desc()).first()

        months_map = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
        busiest_month = months_map[int(busiest.month)-1] if busiest else None

        return {
            "revenue": revenue,
            "rations": rations,
            "orders_count": orders_count,
            "avg_ticket": avg_ticket,
            "top_arroces": [{"nombre": a.nombre, "rations": int(a.total_rations), "subtotal": float(a.subtotal)} for a in top_arroces],
            "top_clients": [{"nombre": c.nombre, "orders": int(c.orders), "spent": float(c.spent)} for c in top_clients],
            "top_zipcodes": [{"cp": z.codigo_postal or "N/A", "orders": int(z.orders), "revenue": float(z.revenue)} for z in top_zipcodes],
            "busiest_month": busiest_month
        }

    curr_metrics = get_metrics(curr_start, now)
    prev_metrics = get_metrics(prev_start, prev_end)

    # 2. Historical Trend (Compare Year vs Last 3 Years)
    def get_yearly_trend(year):
        trend = db.session.query(
            extract('month', Pedido.fecha_pedido).label('month'),
            func.sum(Pedido.pax * PedidoLinea.precio_unitario).label('rev')
        ).join(PedidoLinea).filter(extract('year', Pedido.fecha_pedido) == year)\
         .group_by('month').all()
        
        result = [0] * 12
        for t in trend:
            result[int(t.month)-1] = float(t.rev)
        return result

    history = {
        "current": get_yearly_trend(now.year),
        "prev1": get_yearly_trend(now.year - 1),
        "prev2": get_yearly_trend(now.year - 2),
        "prev3": get_yearly_trend(now.year - 3)
    }

    # Helper to calc growth
    def calc_growth(curr, prev):
        if prev > 0: return round(((curr - prev) / prev) * 100, 1)
        return 100 if curr > 0 else 0

    return jsonify({
        "summary": {
            "revenue": {
                "value": curr_metrics["revenue"],
                "growth": calc_growth(curr_metrics["revenue"], prev_metrics["revenue"]),
                "label": "Facturación Total",
                "sublabel": "vs año anterior"
            },
            "rations": {
                "value": curr_metrics["rations"],
                "growth": calc_growth(curr_metrics["rations"], prev_metrics["rations"]),
                "label": "Raciones Totales",
                "sublabel": "vs año anterior"
            },
            "orders": {
                "value": curr_metrics["orders_count"],
                "growth": calc_growth(curr_metrics["orders_count"], prev_metrics["orders_count"]),
                "label": "Número de Pedidos",
                "sublabel": "vs año anterior"
            },
            "avg_ticket": {
                "value": round(curr_metrics["avg_ticket"], 2),
                "growth": calc_growth(curr_metrics["avg_ticket"], prev_metrics["avg_ticket"]),
                "label": "Ticket Medio",
                "sublabel": "vs año anterior"
            }
        },
        "top_arroces": curr_metrics["top_arroces"],
        "top_clients": curr_metrics["top_clients"],
        "top_zipcodes": curr_metrics["top_zipcodes"],
        "busiest_month": curr_metrics["busiest_month"],
        "history": history
    }), 200
