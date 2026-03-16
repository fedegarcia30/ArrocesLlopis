from flask import request, jsonify
from app.models import Cliente
from . import api_v1_bp
from app.auth import requires_auth
from app.utils.logger import logger

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
    sort_by = request.args.get('sort_by', 'nombre').strip()
    sort_order = request.args.get('sort_order', 'asc').strip()
    
    query = Cliente.query.filter(Cliente.activo == True)
    if search:
        query = query.filter(
            (Cliente.nombre.like(f"%{search}%")) | 
            (Cliente.telefono.like(f"%{search}%"))
        )
    
    # Sorting logic
    sort_column = getattr(Cliente, sort_by, Cliente.nombre)
    if sort_order == 'desc':
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
        
    pagination = query.paginate(page=page, per_page=per_page)
    
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
    try:
        db.session.commit()
        logger.info(f"Client #{client.id} ({client.nombre}) updated successfully")
    except Exception as e:
        logger.error(f"Error updating client #{client.id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to update client"}), 500
    
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
    try:
        db.session.commit()
        logger.info(f"Client #{client.id} disabled (soft-delete)")
    except Exception as e:
        logger.error(f"Error soft-deleting client #{client.id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to delete client"}), 500
    
    return jsonify({"success": True, "message": "Cliente desactivado correctamente"}), 200

@api_v1_bp.route('/clients/stats', methods=['GET'])
@requires_auth
def get_client_stats():
    """
    Returns administrative KPIs for clients with dynamic period support.
    Supports: period=month|quarter|semester|ytd|all|custom
    Custom range: start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
    """
    from datetime import datetime, timedelta
    from sqlalchemy import func
    from app.models import Pedido, Cliente
    from app import db

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
        label_period = "rango seleccionado"
    elif period == 'all':
        curr_start = datetime(2000, 1, 1)
        curr_end = now
        prev_start = None
        prev_end = None
        has_comparison = False
        label_period = "histórico"
    elif period == 'month':
        curr_start = now - timedelta(days=30)
        curr_end = now
        prev_start = curr_start - timedelta(days=365)
        prev_end = curr_end - timedelta(days=365)
        label_period = "mes"
    elif period == 'semester':
        curr_start = now - timedelta(days=180)
        curr_end = now
        prev_start = curr_start - timedelta(days=365)
        prev_end = curr_end - timedelta(days=365)
        label_period = "semestre"
    elif period == 'ytd':
        curr_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        curr_end = now
        prev_start = curr_start.replace(year=curr_start.year - 1)
        prev_end = curr_end.replace(year=curr_end.year - 1)
        label_period = "año (YTD)"
    else: # quarter (default)
        curr_start = now - timedelta(days=90)
        curr_end = now
        prev_start = curr_start - timedelta(days=365)
        prev_end = curr_end - timedelta(days=365)
        label_period = "trimestre"

    # 1. Total Clients who ordered in period (period-aware)
    total_in_period = db.session.query(func.count(func.distinct(Pedido.cliente_id)))\
        .filter(
            Pedido.fecha_pedido >= curr_start,
            Pedido.fecha_pedido <= curr_end,
            Pedido.status != 'cancelado',
            Pedido.deleted_at.is_(None)
        ).scalar() or 0

    if has_comparison:
        total_prev = db.session.query(func.count(func.distinct(Pedido.cliente_id)))\
            .filter(
                Pedido.fecha_pedido >= prev_start,
                Pedido.fecha_pedido <= prev_end,
                Pedido.status != 'cancelado',
                Pedido.deleted_at.is_(None)
            ).scalar() or 0
        growth_total = ((total_in_period - total_prev) / total_prev * 100) if total_prev > 0 else (100 if total_in_period > 0 else 0)
    else:
        growth_total = 0

    # 2. Dormant Clients (ordered in period but last order >12 weeks ago)
    def count_dormant(start, end):
        """Count clients whose last order within [start, end] is >12 weeks before end."""
        last_orders = db.session.query(
            Pedido.cliente_id,
            func.max(Pedido.fecha_pedido).label('last_date')
        ).filter(
            Pedido.fecha_pedido >= start,
            Pedido.fecha_pedido <= end,
            Pedido.status != 'cancelado',
            Pedido.deleted_at.is_(None)
        ).group_by(Pedido.cliente_id).all()

        count = 0
        for lo in last_orders:
            weeks = (end - lo.last_date).days // 7
            if weeks > 12:
                count += 1
        return count

    dormant_curr = count_dormant(curr_start, curr_end)
    if has_comparison:
        dormant_prev = count_dormant(prev_start, prev_end)
        growth_dormant = ((dormant_curr - dormant_prev) / dormant_prev * 100) if dormant_prev > 0 else (100 if dormant_curr > 0 else 0)
    else:
        growth_dormant = 0

    # 3. Churn/Lost Clients (same logic as /clients/analysis cohort "lost")
    # Lost = clients who ordered in prev period but NOT in current period
    if has_comparison:
        valid_filter = [Pedido.status != 'cancelado', Pedido.deleted_at.is_(None)]

        curr_buyer_ids = db.session.query(Pedido.cliente_id).filter(
            Pedido.fecha_pedido >= curr_start,
            Pedido.fecha_pedido <= curr_end,
            *valid_filter
        )
        prev_buyer_ids_q = db.session.query(func.distinct(Pedido.cliente_id)).filter(
            Pedido.fecha_pedido >= prev_start,
            Pedido.fecha_pedido <= prev_end,
            *valid_filter
        )
        # Lost current: ordered in prev but not in curr
        churn_curr = prev_buyer_ids_q.filter(
            ~Pedido.cliente_id.in_(curr_buyer_ids)
        ).count()

        # For growth: compare with the year before that
        try:
            pp_start = prev_start.replace(year=prev_start.year - 1)
            pp_end = prev_end.replace(year=prev_end.year - 1)
        except ValueError:
            pp_start = prev_start.replace(year=prev_start.year - 1, day=28)
            pp_end = prev_end.replace(year=prev_end.year - 1, day=28)

        prev_buyer_sub_2 = db.session.query(Pedido.cliente_id).filter(
            Pedido.fecha_pedido >= prev_start,
            Pedido.fecha_pedido <= prev_end,
            *valid_filter
        )
        pp_buyer_ids_q = db.session.query(func.distinct(Pedido.cliente_id)).filter(
            Pedido.fecha_pedido >= pp_start,
            Pedido.fecha_pedido <= pp_end,
            *valid_filter
        )
        churn_prev = pp_buyer_ids_q.filter(
            ~Pedido.cliente_id.in_(prev_buyer_sub_2)
        ).count()

        growth_churn = ((churn_curr - churn_prev) / churn_prev * 100) if churn_prev > 0 else (100 if churn_curr > 0 else 0)
    else:
        churn_curr = 0
        growth_churn = 0

    # 4. VIP Clients
    def get_vip_data(start, end):
        """Returns (count, list_of_ids) for VIP clients."""
        base_filter = [
            Pedido.fecha_pedido >= start,
            Pedido.fecha_pedido <= end,
            Pedido.status != 'cancelado',
            Pedido.deleted_at.is_(None)
        ]
        subq_avg = db.session.query(func.count(Pedido.id).label('ord_count'))\
            .filter(*base_filter)\
            .group_by(Pedido.cliente_id).subquery()
        avg_val = db.session.query(func.avg(subq_avg.c.ord_count)).scalar() or 0

        if avg_val == 0:
            return 0, []

        vip_rows = db.session.query(Pedido.cliente_id)\
            .filter(*base_filter)\
            .group_by(Pedido.cliente_id)\
            .having(func.count(Pedido.id) > avg_val).all()
        vip_ids_list = [r.cliente_id for r in vip_rows]
        return len(vip_ids_list), vip_ids_list

    vip_curr, vip_curr_ids = get_vip_data(curr_start, curr_end)
    if has_comparison:
        vip_prev, _ = get_vip_data(prev_start, prev_end)
        growth_vip = ((vip_curr - vip_prev) / vip_prev * 100) if vip_prev > 0 else (100 if vip_curr > 0 else 0)
    else:
        growth_vip = 0

    sublabel = "total histórico" if not has_comparison else f"vs {label_period} anterior"

    return jsonify({
        "total_clients": {
            "value": total_in_period,
            "growth": round(growth_total, 1),
            "label": "Clientes en periodo",
            "sublabel": sublabel
        },
        "dormant_clients": {
            "value": dormant_curr,
            "growth": round(growth_dormant, 1),
            "label": "Clientes dormidos",
            "sublabel": sublabel,
            "inverse": True
        },
        "churn_clients": {
            "value": churn_curr,
            "growth": round(growth_churn, 1),
            "label": "Clientes perdidos",
            "sublabel": sublabel,
            "inverse": True
        },
        "power_users": {
            "value": vip_curr,
            "growth": round(growth_vip, 1),
            "label": "Clientes VIP",
            "sublabel": sublabel
        },
        "vip_ids": vip_curr_ids
    }), 200


@api_v1_bp.route('/clients/geo', methods=['POST'])
@requires_auth
def get_clients_geo():
    """
    Returns geo data for a list of client IDs.
    Used to show client locations on the map independently of orders.
    """
    data = request.get_json()
    ids = data.get('ids', [])
    if not ids:
        return jsonify([]), 200

    clientes = Cliente.query.filter(
        Cliente.id.in_(ids),
        Cliente.activo == True
    ).all()

    return jsonify([{
        "cliente_id": c.id,
        "nombre": c.nombre,
        "lat": float(c.latitud) if c.latitud else None,
        "lng": float(c.longitud) if c.longitud else None,
        "direccion_limpia": c.direccion_limpia if hasattr(c, 'direccion_limpia') else "",
        "codigo_postal": c.codigo_postal or ""
    } for c in clientes]), 200
