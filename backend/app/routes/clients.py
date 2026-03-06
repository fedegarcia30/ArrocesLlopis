from flask import request, jsonify
from app.models import Cliente
from . import api_v1_bp
from app.auth import requires_auth

def serialize_client(c):
    return {
        "id": c.id,
        "nombre": c.nombre,
        "telefono": c.telefono,
        "direccion": c.direccion,
        "codigo_postal": c.codigo_postal,
        "observaciones": c.observaciones,
        "num_pedidos": c.num_pedidos,
        "activo": c.activo,
        "created_at": c.created_at.isoformat() if c.created_at else None
    }

@api_v1_bp.route('/clients/lookup', methods=['POST', 'OPTIONS'])
@requires_auth
def lookup_client():
    """
    Searches for clients by phone number prefix.
    """
    data = request.get_json()
    
    if not data or 'phone' not in data:
        return jsonify({"error": "Phone number is required"}), 400
        
    phone = data['phone'].strip()
    
    if len(phone) < 4:
        return jsonify({"found": False, "clients": []}), 200
        
    # Query clients by phone prefix
    clientes = Cliente.query.filter(
        (Cliente.telefono.like(f"{phone}%")) & 
        (Cliente.activo == True)
    ).limit(5).all()
    
    return jsonify({
        "found": len(clientes) > 0,
        "clients": [serialize_client(c) for c in clientes]
    }), 200

@api_v1_bp.route('/clients', methods=['GET'])
@requires_auth
def get_clients():
    """
    Lists clients with optional search.
    """
    search = request.args.get('search', '').strip()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    query = Cliente.query.filter(Cliente.activo == True)
    if search:
        query = query.filter(
            (Cliente.nombre.like(f"%{search}%")) | 
            (Cliente.telefono.like(f"%{search}%"))
        )
    
    pagination = query.order_by(Cliente.nombre).paginate(page=page, per_page=per_page)
    
    return jsonify({
        "clients": [serialize_client(c) for c in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page
    }), 200

@api_v1_bp.route('/clients/<int:client_id>', methods=['PUT'])
@requires_auth
def update_client(client_id):
    """
    Updates client information.
    """
    client = Cliente.query.get_or_404(client_id)
    data = request.get_json()
    
    if 'nombre' in data: client.nombre = data['nombre']
    if 'telefono' in data: client.telefono = data['telefono']
    if 'direccion' in data: client.direccion = data['direccion']
    if 'codigo_postal' in data: client.codigo_postal = data['codigo_postal']
    if 'observaciones' in data: client.observaciones = data['observaciones']
    
    from app import db
    db.session.commit()
    
    return jsonify(serialize_client(client)), 200

@api_v1_bp.route('/clients/<int:client_id>', methods=['DELETE'])
@requires_auth
def delete_client(client_id):
    """
    Soft-deletes a client by setting activo to False.
    """
    client = Cliente.query.get_or_404(client_id)
    client.activo = False
    
    from app import db
    db.session.commit()
    
    return jsonify({"success": True, "message": "Cliente desactivado correctamente"}), 200

@api_v1_bp.route('/clients/stats', methods=['GET'])
@requires_auth
def get_client_stats():
    """
    Returns administrative KPIs for clients with dynamic period support.
    """
    from datetime import datetime, timedelta
    from sqlalchemy import func
    from app.models import Pedido, Cliente
    from app import db
    
    period = request.args.get('period', 'quarter')
    now = datetime.utcnow()
    
    # Define current and previous year time windows
    if period == 'month':
        start_date = now - timedelta(days=30)
        label_period = "mes"
    elif period == 'semester':
        start_date = now - timedelta(days=180)
        label_period = "semestre"
    elif period == 'ytd':
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        label_period = "año (YTD)"
    else: # quarter (default)
        start_date = now - timedelta(days=90)
        label_period = "trimestre"

    # Precise boundaries
    curr_start = start_date
    curr_end = now
    prev_start = curr_start - timedelta(days=365)
    prev_end = curr_end - timedelta(days=365)

    # 1. Total Clients & New Clients Growth (YoY)
    total_active_clients = Cliente.query.filter(Cliente.activo == True).count()
    new_curr = Cliente.query.filter((Cliente.created_at >= curr_start) & (Cliente.activo == True)).count()
    new_prev = Cliente.query.filter((Cliente.created_at >= prev_start) & (Cliente.created_at <= prev_end) & (Cliente.activo == True)).count()
    
    growth_total = ((new_curr - new_prev) / new_prev * 100) if new_prev > 0 else (100 if new_curr > 0 else 0)

    # 2. Active Clients (YoY)
    active_curr = db.session.query(func.count(func.distinct(Pedido.cliente_id)))\
        .filter(Pedido.fecha_pedido >= curr_start).scalar() or 0
    active_prev = db.session.query(func.count(func.distinct(Pedido.cliente_id)))\
        .filter((Pedido.fecha_pedido >= prev_start) & (Pedido.fecha_pedido <= prev_end)).scalar() or 0
    
    growth_active = ((active_curr - active_prev) / active_prev * 100) if active_prev > 0 else (100 if active_curr > 0 else 0)

    # 3. Churn Clients (YoY)
    # Churn Current: ordered in [T - 2*window, T - window] but NOT in [T - window, now]
    window_delta = curr_end - curr_start
    curr_churn_window_start = curr_start - window_delta
    recent_buyers_sub = db.session.query(Pedido.cliente_id).filter(Pedido.fecha_pedido >= curr_start)
    
    churn_curr = db.session.query(func.count(func.distinct(Pedido.cliente_id)))\
        .filter((Pedido.fecha_pedido >= curr_churn_window_start) & (Pedido.fecha_pedido < curr_start))\
        .filter(~Pedido.cliente_id.in_(recent_buyers_sub)).scalar() or 0
        
    # Churn Previous Year (YoY): ordered in [PrevT - window, PrevT] but NOT in [PrevT, PrevEnd]
    prev_churn_window_start = prev_start - window_delta
    hist_buyers_sub = db.session.query(Pedido.cliente_id).filter((Pedido.fecha_pedido >= prev_start) & (Pedido.fecha_pedido <= prev_end))
    
    churn_prev = db.session.query(func.count(func.distinct(Pedido.cliente_id)))\
        .filter((Pedido.fecha_pedido >= prev_churn_window_start) & (Pedido.fecha_pedido < prev_start))\
        .filter(~Pedido.cliente_id.in_(hist_buyers_sub)).scalar() or 0
        
    growth_churn = ((churn_curr - churn_prev) / churn_prev * 100) if churn_prev > 0 else (100 if churn_curr > 0 else 0)

    # 4. VIP Clients (YoY)
    def get_vip_count(start, end):
        # Avg orders per client in this window
        subq_avg = db.session.query(func.count(Pedido.id).label('ord_count'))\
            .filter((Pedido.fecha_pedido >= start) & (Pedido.fecha_pedido <= end))\
            .group_by(Pedido.cliente_id).subquery()
        avg_val = db.session.query(func.avg(subq_avg.c.ord_count)).scalar() or 0
        
        # Count clients above avg
        if avg_val == 0: return 0
        return db.session.query(func.count(func.distinct(Pedido.cliente_id)))\
            .group_by(Pedido.cliente_id)\
            .having(func.count(Pedido.id) > avg_val)\
            .filter((Pedido.fecha_pedido >= start) & (Pedido.fecha_pedido <= end)).count()

    vip_curr = get_vip_count(curr_start, curr_end)
    vip_prev = get_vip_count(prev_start, prev_end)
    growth_vip = ((vip_curr - vip_prev) / vip_prev * 100) if vip_prev > 0 else (100 if vip_curr > 0 else 0)

    return jsonify({
        "total_clients": {
            "value": total_active_clients,
            "growth": round(growth_total, 1),
            "label": "Total de clientes",
            "sublabel": f"vs {label_period} año anterior"
        },
        "active_clients": {
            "value": active_curr,
            "growth": round(growth_active, 1),
            "label": "Clientes activos",
            "sublabel": f"vs {label_period} año anterior"
        },
        "churn_clients": {
            "value": churn_curr,
            "growth": round(growth_churn, 1),
            "label": "Clientes perdidos",
            "sublabel": f"vs {label_period} año anterior",
            "inverse": True
        },
        "power_users": {
            "value": vip_curr,
            "growth": round(growth_vip, 1),
            "label": "Clientes VIP",
            "sublabel": f"vs {label_period} año anterior"
        }
    }), 200
