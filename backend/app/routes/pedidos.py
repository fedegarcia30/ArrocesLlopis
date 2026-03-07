from flask import request, jsonify
from app.models import Pedido, Cliente, PedidoLinea, Arroz
from app import db
from . import api_v1_bp
from app.auth import requires_auth
from sqlalchemy import func
from app.utils.logger import logger
from app.utils.stock import adjust_stock_from_order
from datetime import datetime, timedelta


def _serialize_pedido(pedido, cliente, lineas):
    fecha_pedido = pedido.fecha_pedido
    return {
        "id": pedido.id,
        "cliente_id": cliente.id,
        "cliente_nombre": cliente.nombre,
        "telefono": cliente.telefono,
        "direccion": cliente.direccion,
        "pax": pedido.pax,
        "fecha_pedido": fecha_pedido.isoformat() if fecha_pedido else None,
        "observaciones": pedido.observaciones or "",
        "status": pedido.status,
        "entregado": pedido.entregado,
        "recogido": pedido.recogido,
        "local_recogida": pedido.local_recogida,
        "lineas": [
            {
                "id": l.id,
                "arroz_id": l.arroz_id,
                "arroz_nombre": l.arroz.nombre if l.arroz else "",
                "precio_unitario": float(l.precio_unitario)
            } for l in lineas
        ],
        "created_at": pedido.created_at.isoformat() if pedido.created_at else None
    }


@api_v1_bp.route('/pedidos', methods=['GET', 'OPTIONS'])
@requires_auth
def get_pedidos():
    status_filter = request.args.get('status')
    fecha_filter = request.args.get('fecha')
    cliente_id_filter = request.args.get('cliente_id')

    query = Pedido.query.filter(Pedido.deleted_at.is_(None))

    if status_filter:
        query = query.filter(Pedido.status == status_filter)

    if fecha_filter:
        try:
            filter_date = datetime.strptime(fecha_filter, '%Y-%m-%d').date()
            day_start = datetime.combine(filter_date, datetime.min.time())
            day_end = day_start + timedelta(days=1)
            query = query.filter(Pedido.fecha_pedido >= day_start, Pedido.fecha_pedido < day_end)
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    if cliente_id_filter:
        query = query.filter(Pedido.cliente_id == cliente_id_filter)

    pedidos = query.order_by(Pedido.fecha_pedido.desc()).all()

    response = []
    for pedido in pedidos:
        cliente = Cliente.query.get(pedido.cliente_id)
        if not cliente:
            continue
        lineas = PedidoLinea.query.filter_by(pedido_id=pedido.id).all()
        response.append(_serialize_pedido(pedido, cliente, lineas))

    return jsonify(response), 200


@api_v1_bp.route('/pedidos/<int:pedido_id>/status', methods=['PATCH', 'OPTIONS'])
@requires_auth
def update_pedido_status(pedido_id):
    data = request.get_json()
    if not data or 'status' not in data:
        return jsonify({"error": "Status field is required"}), 400

    new_status = data['status']
    valid_statuses = ['nuevo', 'preparando', 'listo', 'entregado', 'cancelado']

    if new_status not in valid_statuses:
        return jsonify({"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}), 400

    pedido = Pedido.query.get(pedido_id)
    if not pedido:
        return jsonify({"error": "Pedido not found"}), 404

    old_status = pedido.status
    pedido.status = new_status
    if new_status == 'entregado':
        pedido.entregado = True
    
    try:
        db.session.commit()
        
        # Stock Synchronization
        if new_status == 'cancelado' and old_status != 'cancelado':
            # Restore stock
            lineas = PedidoLinea.query.filter_by(pedido_id=pedido.id).all()
            for l in lineas:
                adjust_stock_from_order(l.arroz_id, pedido.pax, restore=True)
        elif old_status == 'cancelado' and new_status != 'cancelado':
            # Subtract stock again if uncanceled
            lineas = PedidoLinea.query.filter_by(pedido_id=pedido.id).all()
            for l in lineas:
                adjust_stock_from_order(l.arroz_id, pedido.pax, restore=False)

        logger.info(f"Pedido #{pedido.id} status updated to '{new_status}'")
    except Exception as e:
        logger.error(f"Error updating status for pedido #{pedido.id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to update status"}), 500

    cliente = Cliente.query.get(pedido.cliente_id)
    lineas = PedidoLinea.query.filter_by(pedido_id=pedido.id).all()

    return jsonify(_serialize_pedido(pedido, cliente, lineas)), 200
@api_v1_bp.route('/pedidos/calendar', methods=['GET', 'OPTIONS'])
@requires_auth
def get_pedidos_calendar():
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)

    if not year or not month:
        now = datetime.now()
        year = year or now.year
        month = month or now.month

    # Filter by month
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)

    # Aggregation
    results = db.session.query(
        func.date(Pedido.fecha_pedido).label('date'),
        func.count(Pedido.id).label('count'),
        func.sum(Pedido.pax).label('total_pax')
    ).filter(
        Pedido.fecha_pedido >= start_date,
        Pedido.fecha_pedido < end_date,
        Pedido.status != 'cancelado',
        Pedido.deleted_at.is_(None)
    ).group_by(func.date(Pedido.fecha_pedido)).all()

    calendar_data = {}
    for date_obj, count, total_pax in results:
        # date_obj might be a string or date object depending on SQL flavor
        if isinstance(date_obj, str):
            date_str = date_obj
        else:
            date_str = date_obj.strftime('%Y-%m-%d')
            
        calendar_data[date_str] = {
            "count": count,
            "total_pax": int(total_pax) if total_pax else 0
        }

    return jsonify(calendar_data), 200


@api_v1_bp.route('/pedidos/<int:pedido_id>', methods=['PATCH', 'OPTIONS'])
@requires_auth
def update_pedido(pedido_id):
    pedido = Pedido.query.get(pedido_id)
    if not pedido:
        return jsonify({"error": "Pedido not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Handle selective updates
    if 'fecha_pedido' in data:
        try:
            # Expecting ISO format from frontend or YYYY-MM-DD HH:MM
            new_date_str = data['fecha_pedido']
            if 'T' in new_date_str:
                new_date = datetime.fromisoformat(new_date_str.replace('Z', '+00:00'))
            else:
                new_date = datetime.strptime(new_date_str, '%Y-%m-%d %H:%M')
            pedido.fecha_pedido = new_date
        except ValueError as e:
            return jsonify({"error": f"Invalid date format: {str(e)}"}), 400

    if 'pax' in data:
        pedido.pax = data['pax']

    if 'observaciones' in data:
        pedido.observaciones = data['observaciones']

    try:
        db.session.commit()
        logger.info(f"Pedido #{pedido.id} properties updated successfully")
    except Exception as e:
        logger.error(f"Error updating properties for pedido #{pedido.id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to update pedido"}), 500

    cliente = Cliente.query.get(pedido.cliente_id)
    lineas = PedidoLinea.query.filter_by(pedido_id=pedido.id).all()

    return jsonify(_serialize_pedido(pedido, cliente, lineas)), 200
