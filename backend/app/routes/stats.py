from flask import request, jsonify
from app.models import Pedido, PedidoLinea, Arroz, Cliente, Compra, CompraLinea, Ingrediente, Proveedor, HistoricoPrecio
from . import api_v1_bp
from app.auth import requires_auth, requires_role
from app import db
from sqlalchemy import func, extract, and_, case
from datetime import datetime, timedelta
import calendar

def get_prev_year_date(dt):
    try:
        return dt.replace(year=dt.year - 1)
    except ValueError: # Feb 29
        return dt.replace(year=dt.year - 1, day=28)

def get_period_dates(period, mode, now):
    if period == 'week':
        curr_start = now - timedelta(days=now.weekday())
        curr_start = curr_start.replace(hour=0, minute=0, second=0, microsecond=0)
        curr_end_calend = curr_start + timedelta(days=6, hours=23, minutes=59, seconds=59, microseconds=999999)
    elif period == 'month':
        curr_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_day = calendar.monthrange(now.year, now.month)[1]
        curr_end_calend = now.replace(day=last_day, hour=23, minute=59, second=59, microsecond=999999)
    elif period == 'semester':
        if now.month <= 6:
            curr_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            curr_end_calend = now.replace(month=6, day=30, hour=23, minute=59, second=59, microsecond=999999)
        else:
            curr_start = now.replace(month=7, day=1, hour=0, minute=0, second=0, microsecond=0)
            curr_end_calend = now.replace(month=12, day=31, hour=23, minute=59, second=59, microsecond=999999)
    elif period == 'ytd':
        curr_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        curr_end_calend = now.replace(month=12, day=31, hour=23, minute=59, second=59, microsecond=999999)
    else: # quarter (default)
        q_start_month = ((now.month - 1) // 3) * 3 + 1
        curr_start = now.replace(month=q_start_month, day=1, hour=0, minute=0, second=0, microsecond=0)
        q_end_month = q_start_month + 2
        last_day = calendar.monthrange(now.year, q_end_month)[1]
        curr_end_calend = now.replace(month=q_end_month, day=last_day, hour=23, minute=59, second=59, microsecond=999999)

    curr_end = now if mode == 'mtd' else curr_end_calend

    prev_start = get_prev_year_date(curr_start)
    prev_end = get_prev_year_date(curr_end)
    
    return curr_start, curr_end, prev_start, prev_end

@api_v1_bp.route('/stats/dashboard', methods=['GET'])
@requires_auth
@requires_role(['admin', 'gerente', 'encargado'])
def get_dashboard_stats():
    """
    Returns comprehensive business metrics and analytics.
    """
    period = request.args.get('period', 'quarter')
    mode = request.args.get('mode', 'full') # 'full' (calendar) or 'mtd' (month-to-date)
    now = datetime.utcnow()
    
    curr_start, curr_end, prev_start, prev_end = get_period_dates(period, mode, now)

    # Previous Period (Same calendar range but previous year)
    def get_prev_year_date_local(dt):
        try:
            return dt.replace(year=dt.year - 1)
        except ValueError: # Handle Feb 29
            return dt.replace(year=dt.year - 1, day=28)

    prev_start = get_prev_year_date(curr_start)
    prev_end = get_prev_year_date(curr_end)

    def get_metrics(start, end):
        # Base filter for valid orders in window
        valid_orders_filter = [
            Pedido.fecha_pedido >= start,
            Pedido.fecha_pedido <= end,
            Pedido.status != 'cancelado',
            Pedido.deleted_at.is_(None)
        ]

        # Billing, Rations & Count
        stats = db.session.query(
            func.sum(Pedido.pax * PedidoLinea.precio_unitario).label('revenue'),
            func.sum(Pedido.pax).label('rations'),
            func.count(func.distinct(Pedido.id)).label('orders_count')
        ).join(PedidoLinea).filter(*valid_orders_filter).first()

        revenue = float(stats.revenue or 0)
        rations = int(stats.rations or 0)
        orders_count = int(stats.orders_count or 0)
        avg_ticket = revenue / orders_count if orders_count > 0 else 0

        if orders_count == 0:
            return {
                "revenue": 0, "rations": 0, "orders_count": 0, "avg_ticket": 0,
                "top_arroces": [], "top_clients": [], "top_zipcodes": [], "busiest_month": None
            }

        # Top Arroces
        top_arroces = db.session.query(
            Arroz.nombre,
            func.sum(Pedido.pax).label('total_rations'),
            func.sum(Pedido.pax * PedidoLinea.precio_unitario).label('subtotal')
        ).join(PedidoLinea, Arroz.id == PedidoLinea.arroz_id)\
         .join(Pedido, Pedido.id == PedidoLinea.pedido_id)\
         .filter(*valid_orders_filter)\
         .group_by(Arroz.id)\
         .order_by(func.sum(Pedido.pax).desc())\
         .limit(5).all()

        # Top Clients by Revenue (as requested)
        top_clients = db.session.query(
            Cliente.nombre,
            func.count(Pedido.id).label('orders'),
            func.sum(Pedido.pax * PedidoLinea.precio_unitario).label('spent'),
            func.sum(Pedido.pax).label('rations_total')
        ).join(Pedido, Cliente.id == Pedido.cliente_id)\
         .join(PedidoLinea, Pedido.id == PedidoLinea.pedido_id)\
         .filter(*valid_orders_filter)\
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
         .filter(*valid_orders_filter)\
         .group_by(Cliente.codigo_postal)\
         .order_by(func.count(Pedido.id).desc())\
         .limit(5).all()

        # Busiest Month
        busiest = db.session.query(
            extract('month', Pedido.fecha_pedido).label('month'),
            func.sum(Pedido.pax * PedidoLinea.precio_unitario).label('rev')
        ).join(PedidoLinea).filter(*valid_orders_filter)\
         .group_by('month').order_by(func.sum(Pedido.pax * PedidoLinea.precio_unitario).desc()).first()

        months_map = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
        busiest_month = months_map[int(busiest.month)-1] if busiest else None

        return {
            "revenue": revenue,
            "rations": rations,
            "orders_count": orders_count,
            "avg_ticket": avg_ticket,
            "top_arroces": [{"nombre": a.nombre, "rations": int(a.total_rations), "subtotal": float(a.subtotal)} for a in top_arroces],
            "top_clients": [{"nombre": c.nombre, "orders": int(c.orders), "spent": float(c.spent), "rations": int(c.rations_total)} for c in top_clients],
            "top_zipcodes": [{"cp": z.codigo_postal or "N/A", "orders": int(z.orders), "revenue": float(z.revenue)} for z in top_zipcodes],
            "busiest_month": busiest_month
        }

    def get_period_label(start, end, p_type, is_to_today):
        months_map = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
        
        prefix = f"1-{end.day} " if is_to_today else ""
        
        if p_type == 'week':
            week_num = start.isocalendar()[1]
            return f"{prefix}Semana {week_num} ({start.strftime('%d %b')})"
        elif p_type == 'month':
            return f"{prefix}{months_map[start.month-1]} {start.year}"
        elif p_type == 'quarter':
            q = (start.month - 1) // 3 + 1
            base_label = f"{q}º Trimestre {start.year}"
            return f"{prefix}{base_label}" if is_to_today else base_label
        elif p_type == 'semester':
            s = 1 if start.month <= 6 else 2
            base_label = f"{s}º Semestre {start.year}"
            return f"{prefix}{base_label}" if is_to_today else base_label
            
        base_label = f"Año {start.year}"
        return f"{prefix}{base_label}" if is_to_today else base_label

    period_info = {
        "current": {"label": get_period_label(curr_start, curr_end, period, mode == 'mtd')},
        "previous": {"label": get_period_label(prev_start, prev_end, period, mode == 'mtd')}
    }

    def get_sparkline(p_start, p_end):
        """Returns 4 data points for the same period over the last 4 years."""
        points = []
        for i in range(3, -1, -1): # From 3 years ago to current
            # Let's just adjust year directly
            try:
                s_i = p_start.replace(year=curr_start.year - i)
                e_i = p_end.replace(year=curr_end.year - i)
            except ValueError: # Leap year
                s_i = p_start.replace(year=curr_start.year - i, day=28)
                e_i = p_end.replace(year=curr_end.year - i, day=28)
            
            m = get_metrics(s_i, e_i)
            points.append(m)
        return points

    # We need to call get_metrics multiple times for sparklines. 
    # To optimize, let's just get the 4 metrics objects.
    spark_data = get_sparkline(curr_start, curr_end)
    curr_metrics = spark_data[3]
    prev_metrics = spark_data[2]

    # 2. Historical Trend (Compare Year vs Last 3 Years)
    def get_yearly_trend(year):
        trend = db.session.query(
            extract('month', Pedido.fecha_pedido).label('month'),
            func.sum(Pedido.pax * PedidoLinea.precio_unitario).label('rev'),
            func.sum(Pedido.pax).label('rats'),
            func.count(func.distinct(Pedido.id)).label('ords'),
            func.count(func.distinct(Pedido.cliente_id)).label('cli')
        ).join(PedidoLinea).filter(
            extract('year', Pedido.fecha_pedido) == year,
            Pedido.status != 'cancelado',
            Pedido.deleted_at.is_(None)
        ).group_by('month').all()
        
        result = {
            "revenue": [0] * 12,
            "rations": [0] * 12,
            "orders": [0] * 12,
            "clients": [0] * 12
        }
        for t in trend:
            idx = int(t.month) - 1
            result["revenue"][idx] = float(t.rev or 0)
            result["rations"][idx] = int(t.rats or 0)
            result["orders"][idx] = int(t.ords or 0)
            result["clients"][idx] = int(t.cli or 0)
        return result

    t_curr = get_yearly_trend(now.year)
    t_prev1 = get_yearly_trend(now.year - 1)
    t_prev2 = get_yearly_trend(now.year - 2)
    t_prev3 = get_yearly_trend(now.year - 3)

    history = { metric: {
            "current": t_curr[metric],
            "prev1": t_prev1[metric],
            "prev2": t_prev2[metric],
            "prev3": t_prev3[metric]
        } for metric in ["revenue", "rations", "orders", "clients"]
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
                "sublabel": "vs año anterior",
                "sparkline": [m["revenue"] for m in spark_data]
            },
            "rations": {
                "value": curr_metrics["rations"],
                "growth": calc_growth(curr_metrics["rations"], prev_metrics["rations"]),
                "label": "Raciones Totales",
                "sublabel": "vs año anterior",
                "sparkline": [m["rations"] for m in spark_data]
            },
            "orders": {
                "value": curr_metrics["orders_count"],
                "growth": calc_growth(curr_metrics["orders_count"], prev_metrics["orders_count"]),
                "label": "Número de Pedidos",
                "sublabel": "vs año anterior",
                "sparkline": [m["orders_count"] for m in spark_data]
            },
            "avg_ticket": {
                "value": round(curr_metrics["avg_ticket"], 2),
                "growth": calc_growth(curr_metrics["avg_ticket"], prev_metrics["avg_ticket"]),
                "label": "Ticket Medio",
                "sublabel": "vs año anterior",
                "sparkline": [m["avg_ticket"] for m in spark_data]
            }
        },
        "period_info": period_info,
        "top_arroces": curr_metrics["top_arroces"],
        "top_clients": curr_metrics["top_clients"],
        "top_zipcodes": curr_metrics["top_zipcodes"],
        "busiest_month": curr_metrics["busiest_month"],
        "history": history
    }), 200

@api_v1_bp.route('/stats/expenses', methods=['GET'])
@requires_auth
@requires_role(['admin', 'gerente', 'encargado'])
def get_expense_stats():
    """
    Returns expense and stock metrics.
    """
    period = request.args.get('period', 'quarter')
    mode = request.args.get('mode', 'full')
    now = datetime.utcnow()
    
    curr_start, curr_end, prev_start, prev_end = get_period_dates(period, mode, now)

    def get_metrics(start, end):
        # Base filter for purchases in window
        purchases_filter = [
            Compra.fecha_compra >= start.date(),
            Compra.fecha_compra <= end.date()
        ]

        stats = db.session.query(
            func.sum(Compra.total).label('total_expense'),
            func.count(func.distinct(Compra.id)).label('purchases_count')
        ).filter(*purchases_filter).first()

        total_expense = float(stats.total_expense or 0)
        purchases_count = int(stats.purchases_count or 0)

        # Top Expenses by Ingredient
        top_ingredients = db.session.query(
            Ingrediente.nombre,
            func.sum(CompraLinea.cantidad).label('total_qty'),
            func.sum(CompraLinea.cantidad * CompraLinea.precio_unitario).label('total_spent'),
            Ingrediente.unidad_medida
        ).join(CompraLinea, Ingrediente.id == CompraLinea.ingrediente_id)\
         .join(Compra, Compra.id == CompraLinea.compra_id)\
         .filter(*purchases_filter)\
         .group_by(Ingrediente.id)\
         .order_by(func.sum(CompraLinea.cantidad * CompraLinea.precio_unitario).desc())\
         .limit(5).all()

        # Top Providers
        top_providers = db.session.query(
            Proveedor.nombre,
            func.count(Compra.id).label('purchases'),
            func.sum(Compra.total).label('total_spent')
        ).join(Compra, Proveedor.id == Compra.proveedor_id)\
         .filter(*purchases_filter)\
         .group_by(Proveedor.id)\
         .order_by(func.sum(Compra.total).desc())\
         .limit(5).all()

        return {
            "total_expense": total_expense,
            "purchases_count": purchases_count,
            "top_ingredients": [{"nombre": i.nombre, "qty": float(i.total_qty), "spent": float(i.total_spent), "unit": i.unidad_medida} for i in top_ingredients],
            "top_providers": [{"nombre": p.nombre, "count": int(p.purchases), "spent": float(p.total_spent)} for p in top_providers]
        }

    # Sparkline data
    def get_sparkline(p_start, p_end):
        points = []
        for i in range(3, -1, -1):
            try:
                s_i = p_start.replace(year=now.year - i)
                e_i = p_end.replace(year=now.year - i)
            except ValueError:
                s_i = p_start.replace(year=now.year - i, day=28)
                e_i = p_end.replace(year=now.year - i, day=28)
            points.append(get_metrics(s_i, e_i))
        return points

    spark_data = get_sparkline(curr_start, curr_end)
    curr_metrics = spark_data[3]
    prev_metrics = spark_data[2]

    # Stock alerts (not period dependent, just current state)
    stock_alerts = db.session.query(func.count(Ingrediente.id)).filter(
        Ingrediente.stock_actual <= Ingrediente.stock_minimo
    ).scalar()

    def calc_growth(curr, prev):
        if prev > 0: return round(((curr - prev) / prev) * 100, 1)
        return 100 if curr > 0 else 0

    return jsonify({
        "summary": {
            "total_expense": {
                "value": curr_metrics["total_expense"],
                "growth": calc_growth(curr_metrics["total_expense"], prev_metrics["total_expense"]),
                "label": "Gasto en Compras",
                "sublabel": "vs año anterior",
                "sparkline": [m["total_expense"] for m in spark_data]
            },
            "purchases_count": {
                "value": curr_metrics["purchases_count"],
                "growth": calc_growth(curr_metrics["purchases_count"], prev_metrics["purchases_count"]),
                "label": "Número de Facturas",
                "sublabel": "vs año anterior",
                "sparkline": [m["purchases_count"] for m in spark_data]
            },
            "stock_alerts": {
                "value": stock_alerts,
                "label": "Alertas de Stock",
                "sublabel": "Por debajo del mínimo",
                "status": "warning" if stock_alerts > 0 else "ok"
            }
        },
        "top_ingredients": curr_metrics["top_ingredients"],
        "top_providers": curr_metrics["top_providers"]
    }), 200


@api_v1_bp.route('/stats/mapa', methods=['GET'])
@requires_auth
@requires_role(['admin', 'gerente', 'encargado'])
def stats_mapa():
    from datetime import date as date_cls

    MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
             'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

    period   = request.args.get('period', 'month')        # month|quarter|semester|year
    year     = request.args.get('year',     type=int, default=datetime.now().year)
    month    = request.args.get('month',    type=int, default=datetime.now().month)
    quarter  = request.args.get('quarter',  type=int, default=1)   # 1-4
    semester = request.args.get('semester', type=int, default=1)   # 1-2

    def get_date_range(y, p, mo, q, s):
        if p == 'month':
            last = calendar.monthrange(y, mo)[1]
            return date_cls(y, mo, 1), date_cls(y, mo, last)
        elif p == 'quarter':
            sm = (q - 1) * 3 + 1
            em = sm + 2
            return date_cls(y, sm, 1), date_cls(y, em, calendar.monthrange(y, em)[1])
        elif p == 'semester':
            if s == 1:
                return date_cls(y, 1, 1), date_cls(y, 6, 30)
            return date_cls(y, 7, 1), date_cls(y, 12, 31)
        else:  # year
            return date_cls(y, 1, 1), date_cls(y, 12, 31)

    def format_label(y, p, mo, q, s):
        if p == 'month':   return f"{MESES[mo - 1]} {y}"
        if p == 'quarter': return f"T{q} {y}"
        if p == 'semester':return f"{'1er' if s == 1 else '2º'} Semestre {y}"
        return str(y)

    def query_mapa(fecha_inicio, fecha_fin):
        rows = db.session.query(
            Cliente.id,
            Cliente.nombre,
            Cliente.latitud,
            Cliente.longitud,
            Cliente.direccion_limpia,
            Cliente.codigo_postal,
            func.sum(case((Pedido.local_recogida == False, 1), else_=0)).label('pedidos_local'),
            func.sum(case((Pedido.local_recogida == True, 1), else_=0)).label('pedidos_reparto'),
            func.sum(Pedido.pax).label('total_raciones'),
        ).join(Pedido, Pedido.cliente_id == Cliente.id)\
         .filter(
            func.date(Pedido.fecha_pedido) >= fecha_inicio,
            func.date(Pedido.fecha_pedido) <= fecha_fin,
            Pedido.deleted_at == None,
            Pedido.status != 'cancelado',
            db.or_(Cliente.latitud != None, Cliente.codigo_postal != None),
         ).group_by(Cliente.id).all()
        return [{
            "cliente_id": r.id,
            "nombre": r.nombre,
            "lat": float(r.latitud) if r.latitud is not None else None,
            "lng": float(r.longitud) if r.longitud is not None else None,
            "direccion_limpia": r.direccion_limpia or "",
            "codigo_postal": r.codigo_postal or "",
            "pedidos_local": int(r.pedidos_local or 0),
            "pedidos_reparto": int(r.pedidos_reparto or 0),
            "total_raciones": int(r.total_raciones or 0),
        } for r in rows]

    curr_start, curr_end = get_date_range(year,     period, month, quarter, semester)
    prev_start, prev_end = get_date_range(year - 1, period, month, quarter, semester)

    return jsonify({
        "current":  {"label": format_label(year,     period, month, quarter, semester), "data": query_mapa(curr_start, curr_end)},
        "previous": {"label": format_label(year - 1, period, month, quarter, semester), "data": query_mapa(prev_start, prev_end)},
    }), 200

@api_v1_bp.route('/clients/<int:client_id>/per-week', methods=['GET'])
@requires_auth
@requires_role(['admin', 'gerente', 'encargado'])
def get_client_weekly_stats(client_id):
    """
    Returns weekly order history for a specific client.
    """
    # Get last 12 weeks of data
    twelve_weeks_ago = datetime.utcnow() - timedelta(weeks=12)
    
    orders = db.session.query(
        func.date(Pedido.fecha_pedido).label('fecha'),
        func.sum(Pedido.pax).label('rations'),
        func.sum(Pedido.pax * PedidoLinea.precio_unitario).label('revenue'),
        func.count(func.distinct(Pedido.id)).label('orders_count')
    ).select_from(Pedido)\
     .join(PedidoLinea, Pedido.id == PedidoLinea.pedido_id)\
     .filter(
        Pedido.cliente_id == client_id,
        Pedido.fecha_pedido >= twelve_weeks_ago,
        Pedido.status != 'cancelado',
        Pedido.deleted_at.is_(None)
    ).group_by(func.date(Pedido.fecha_pedido)).order_by(func.date(Pedido.fecha_pedido).asc()).all()

    # Aggregate by week in Python for robustness across SQL dialects
    weekly_data = {}
    for o in orders:
        # o.fecha is a date object
        year, week, _ = o.fecha.isocalendar()
        key = f"{year}-W{week:02d}"
        if key not in weekly_data:
            weekly_data[key] = {"label": f"Sem {week}", "rations": 0, "revenue": 0, "orders_count": 0}
        weekly_data[key]["rations"] += int(o.rations)
        weekly_data[key]["revenue"] += float(o.revenue)
        weekly_data[key]["orders_count"] += int(o.orders_count)

    return jsonify(list(weekly_data.values())), 200
@api_v1_bp.route('/clients/analysis', methods=['GET'])
@requires_auth
@requires_role(['admin', 'gerente', 'encargado'])
def get_clients_analysis():
    """
    Returns data for the general client analysis dashboard with cohort comparison.
    Supports: period=month|quarter|semester|ytd|all|custom
    Custom range: start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
    """
    period = request.args.get('period', 'quarter')
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    now = datetime.utcnow()

    has_comparison = True

    if start_date_str and end_date_str:
        # Custom date range
        curr_start = datetime.strptime(start_date_str, '%Y-%m-%d')
        curr_end = datetime.strptime(end_date_str, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
        delta = curr_end - curr_start
        prev_end = curr_start - timedelta(days=1)
        prev_start = prev_end - delta
    elif period == 'month':
        curr_start = now - timedelta(days=30)
        curr_end = now
        prev_start = curr_start - timedelta(days=365)
        prev_end = curr_end - timedelta(days=365)
    elif period == 'semester':
        curr_start = now - timedelta(days=180)
        curr_end = now
        prev_start = curr_start - timedelta(days=365)
        prev_end = curr_end - timedelta(days=365)
    elif period == '12months':
        curr_start = now - timedelta(days=365)
        curr_end = now
        prev_start = curr_start - timedelta(days=365)
        prev_end = curr_start
    elif period == 'ytd':
        curr_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        curr_end = now
        prev_start = curr_start.replace(year=curr_start.year - 1)
        prev_end = now.replace(year=now.year - 1)
    elif period in ('all', 'historical'):
        curr_start = datetime(2000, 1, 1)
        curr_end = now
        prev_start = None
        prev_end = None
        has_comparison = False
    else: # quarter (default)
        q_start_month = ((now.month - 1) // 3) * 3 + 1
        curr_start = now.replace(month=q_start_month, day=1, hour=0, minute=0, second=0, microsecond=0)
        curr_end = now
        prev_start = curr_start.replace(year=curr_start.year - 1)
        prev_end = curr_end.replace(year=curr_end.year - 1)

    def get_period_buyers(start, end):
        if not start or not end: return {}
        rows = db.session.query(
            Pedido.cliente_id,
            func.sum(Pedido.pax).label('total_rations'),
            func.count(func.distinct(Pedido.id)).label('total_orders')
        ).filter(
            Pedido.fecha_pedido >= start,
            Pedido.fecha_pedido <= end,
            Pedido.status != 'cancelado',
            Pedido.deleted_at.is_(None)
        ).group_by(Pedido.cliente_id).all()
        return {r.cliente_id: {"rations": int(r.total_rations), "orders": int(r.total_orders)} for r in rows}

    curr_buyers = get_period_buyers(curr_start, curr_end)
    prev_buyers = get_period_buyers(prev_start, prev_end) if has_comparison else {}

    cohorts = {
        "new": 0, "lost": 0, "retained": 0, "grown": 0, "decreased": 0
    }
    cohort_ids = {
        "new": [], "lost": [], "grown": [], "decreased": []
    }

    if has_comparison:
        curr_ids = set(curr_buyers.keys())
        prev_ids = set(prev_buyers.keys())

        new_ids = list(curr_ids - prev_ids)
        lost_ids = list(prev_ids - curr_ids)
        cohorts["new"] = len(new_ids)
        cohorts["lost"] = len(lost_ids)
        cohort_ids["new"] = new_ids
        cohort_ids["lost"] = lost_ids

        retained_ids = curr_ids & prev_ids
        cohorts["retained"] = len(retained_ids)

        for cid in retained_ids:
            if curr_buyers[cid]["rations"] > prev_buyers[cid]["rations"]:
                cohorts["grown"] += 1
                cohort_ids["grown"].append(cid)
            elif curr_buyers[cid]["rations"] < prev_buyers[cid]["rations"]:
                cohorts["decreased"] += 1
                cohort_ids["decreased"].append(cid)
    else:
        cohorts["new"] = len(curr_buyers)
        cohort_ids["new"] = list(curr_buyers.keys())

    # Health Segments (Filtered by period buyers) — with IDs
    segments = {"active": 0, "at_risk": 0, "inactive": 0, "churned": 0}
    segment_ids = {"active": [], "at_risk": [], "inactive": [], "churned": []}

    lo_query = db.session.query(
        Pedido.cliente_id,
        func.max(Pedido.fecha_pedido).label('last_date')
    ).filter(Pedido.status != 'cancelado', Pedido.deleted_at.is_(None))

    if has_comparison:
        lo_query = lo_query.filter(Pedido.fecha_pedido >= curr_start)

    last_orders = lo_query.group_by(Pedido.cliente_id).all()

    # For 'all' mode, use absolute thresholds; for period mode, relative to period end
    ref_date = curr_end
    for lo in last_orders:
        delta = ref_date - lo.last_date
        weeks = delta.days // 7
        if weeks < 4:
            segments["active"] += 1
            segment_ids["active"].append(lo.cliente_id)
        elif weeks < 8:
            segments["at_risk"] += 1
            segment_ids["at_risk"].append(lo.cliente_id)
        elif weeks < 12:
            segments["inactive"] += 1
            segment_ids["inactive"].append(lo.cliente_id)
        else:
            segments["churned"] += 1
            segment_ids["churned"].append(lo.cliente_id)

    # Zone Patterns (filtered by period)
    zone_filter = [Pedido.status != 'cancelado', Pedido.deleted_at.is_(None)]
    zone_filter.append(Pedido.fecha_pedido >= curr_start)
    zone_filter.append(Pedido.fecha_pedido <= curr_end)

    zone_stats = db.session.query(
        Cliente.codigo_postal,
        Arroz.nombre,
        func.sum(Pedido.pax).label('total_rations')
    ).select_from(Cliente)\
     .join(Pedido, Cliente.id == Pedido.cliente_id)\
     .join(PedidoLinea, Pedido.id == PedidoLinea.pedido_id)\
     .join(Arroz, Arroz.id == PedidoLinea.arroz_id)\
     .filter(*zone_filter)\
     .group_by(Cliente.codigo_postal, Arroz.id)\
     .order_by(Cliente.codigo_postal, func.sum(Pedido.pax).desc()).all()
     
    patterns_by_cp = {}
    for row in zone_stats:
        cp = row.codigo_postal or "S/D"
        if cp not in patterns_by_cp: patterns_by_cp[cp] = []
        if len(patterns_by_cp[cp]) < 3:
            patterns_by_cp[cp].append({"arroz": row.nombre, "rations": int(row.total_rations)})

    # Campaign Suggestions
    suggestions = []
    if cohorts["lost"] > 0:
        suggestions.append({
            "type": "retention",
            "title": "Recuperación de Clientes",
            "description": f"Has perdido {cohorts['lost']} clientes respecto al periodo anterior. Considera una campaña dirigida.",
            "impact": "Crítico"
        })
    if cohorts["decreased"] > 0:
        suggestions.append({
            "type": "alert",
            "title": "Alerta de Descenso",
            "description": f"{cohorts['decreased']} clientes fieles han bajado su volumen. Averigua si hay problemas de calidad o servicio.",
            "impact": "Alto"
        })
    if segments["at_risk"] > 0:
        suggestions.append({
            "type": "retention",
            "title": "Campaña de Reactivación",
            "description": f"Hay {segments['at_risk']} clientes en riesgo (4-8 semanas sin pedir).",
            "impact": "Alto"
        })

    return jsonify({
        "period": period,
        "cohorts": cohorts,
        "cohort_ids": cohort_ids,
        "segments": segments,
        "segment_ids": segment_ids,
        "patterns": patterns_by_cp,
        "suggestions": suggestions
    }), 200

@api_v1_bp.route('/clients/<int:client_id>/full-history', methods=['GET'])
@requires_auth
@requires_role(['admin', 'gerente', 'encargado'])
def get_client_full_history(client_id):
    """
    Returns monthly history and detailed specific orders for a client.
    """
    now = datetime.utcnow()
    one_year_ago = now - timedelta(days=365)
    
    # 1. Monthly aggregated data (last 12 months)
    y_col = extract('year', Pedido.fecha_pedido)
    m_col = extract('month', Pedido.fecha_pedido)
    
    monthly_rows = db.session.query(
        y_col.label('y'),
        m_col.label('m'),
        func.sum(Pedido.pax).label('rations'),
        func.sum(Pedido.pax * PedidoLinea.precio_unitario).label('revenue'),
        func.count(func.distinct(Pedido.id)).label('orders_count')
    ).join(PedidoLinea).filter(
        Pedido.cliente_id == client_id,
        Pedido.fecha_pedido >= one_year_ago,
        Pedido.status != 'cancelado',
        Pedido.deleted_at.is_(None)
    ).group_by(y_col, m_col).order_by(y_col, m_col).all()

    months_map = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    monthly_data = []
    for r in monthly_rows:
        monthly_data.append({
            "label": f"{months_map[int(r.m)-1]} {int(r.y)}",
            "rations": int(r.rations),
            "revenue": float(r.revenue),
            "orders_count": int(r.orders_count)
        })

    # 2. Detailed order history (Last 50 orders)
    detailed_orders = db.session.query(
        Pedido.id,
        Pedido.fecha_pedido,
        Pedido.pax,
        Pedido.status,
        Pedido.local_recogida
    ).filter(
        Pedido.cliente_id == client_id,
        Pedido.deleted_at.is_(None)
    ).order_by(Pedido.fecha_pedido.desc()).limit(50).all()

    last_orders = []
    for p in detailed_orders:
        # Get line items for this order
        items = db.session.query(
            Arroz.nombre
        ).join(PedidoLinea).filter(PedidoLinea.pedido_id == p.id).all()
        
        last_orders.append({
            "id": p.id,
            "fecha": p.fecha_pedido.isoformat(),
            "pax": p.pax,
            "status": p.status,
            "tipo": "Recogida" if p.local_recogida else "Reparto",
            "items": [{"nombre": i.nombre} for i in items]
        })

    return jsonify({
        "monthly": monthly_data,
        "recent_orders": last_orders
    }), 200
