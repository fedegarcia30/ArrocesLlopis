from flask import request, jsonify
from app.models import Pedido, Cliente, PedidoLinea, Arroz, PedidoFeedback
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
                "precio_unitario": float(l.precio_unitario),
                "raciones": l.raciones
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
    
    # Stock Synchronization & Client Stats (before commit)
    cliente = Cliente.query.get(pedido.cliente_id)
    if new_status == 'cancelado' and old_status != 'cancelado':
        # Restore stock
        lineas = PedidoLinea.query.filter_by(pedido_id=pedido.id).all()
        for l in lineas:
            adjust_stock_from_order(l.arroz_id, l.raciones, restore=True)
        # Update client stats: decrement
        if cliente:
            cliente.num_pedidos = max(0, (cliente.num_pedidos or 0) - 1)
            cliente.raciones = max(0, (cliente.raciones or 0) - pedido.pax)

    elif old_status == 'cancelado' and new_status != 'cancelado':
        # Subtract stock again if uncanceled
        lineas = PedidoLinea.query.filter_by(pedido_id=pedido.id).all()
        for l in lineas:
            adjust_stock_from_order(l.arroz_id, l.raciones, restore=False)
        # Update client stats: increment
        if cliente:
            cliente.num_pedidos = (cliente.num_pedidos or 0) + 1
            cliente.raciones = (cliente.raciones or 0) + pedido.pax

    try:
        db.session.commit()
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

    old_lines = PedidoLinea.query.filter_by(pedido_id=pedido_id).all()
    old_pax = pedido.pax

    if 'lines' in data:
        try:
            grouped = {}
            for line in data['lines']:
                arroz_id = int(line['arroz_id'])
                raciones = int(line['pax'])
                if raciones < 1:
                    raise ValueError
                grouped[arroz_id] = grouped.get(arroz_id, 0) + raciones
        except (KeyError, TypeError, ValueError):
            return jsonify({"error": "Líneas de pedido inválidas"}), 400

        new_pax = sum(grouped.values())
        if new_pax < 2:
            return jsonify({"error": "Minimum 2 PAX per order"}), 400

        if pedido.status != 'cancelado':
            for line in old_lines:
                adjust_stock_from_order(line.arroz_id, line.raciones, restore=True)

        for line in old_lines:
            db.session.delete(line)
        db.session.flush()

        for arroz_id, raciones in grouped.items():
            arroz = Arroz.query.get(arroz_id)
            if not arroz:
                return jsonify({"error": "Arroz not found"}), 404
            db.session.add(PedidoLinea(
                pedido_id=pedido_id,
                arroz_id=arroz_id,
                precio_unitario=float(arroz.precio),
                raciones=raciones
            ))
            if pedido.status != 'cancelado':
                adjust_stock_from_order(arroz_id, raciones, restore=False)

        pedido.pax = new_pax
        if pedido.status != 'cancelado':
            cliente = Cliente.query.get(pedido.cliente_id)
            if cliente:
                cliente.raciones = (cliente.raciones or 0) + new_pax - old_pax
    else:
        current_linea = old_lines[0] if old_lines else None
        new_pax = int(data.get('pax', old_pax))

        if 'pax' in data and pedido.status != 'cancelado':
            if current_linea:
                diff = new_pax - old_pax
                if diff > 0:
                    adjust_stock_from_order(current_linea.arroz_id, diff, restore=False)
                elif diff < 0:
                    adjust_stock_from_order(current_linea.arroz_id, abs(diff), restore=True)
                current_linea.raciones = max(0, current_linea.raciones + diff)

        if 'arroz_id' in data and current_linea:
            new_arroz = Arroz.query.get(data['arroz_id'])
            if not new_arroz:
                return jsonify({"error": "Arroz not found"}), 404
            if pedido.status != 'cancelado':
                adjust_stock_from_order(current_linea.arroz_id, current_linea.raciones, restore=True)
                adjust_stock_from_order(new_arroz.id, current_linea.raciones, restore=False)
            current_linea.arroz_id = new_arroz.id
            current_linea.precio_unitario = new_arroz.precio

    # Apply updates
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

    if 'pax' in data and 'lines' not in data:
        new_pax_val = int(data['pax'])
        # If order is active, sync client raciones
        if pedido.status != 'cancelado':
            cliente = Cliente.query.get(pedido.cliente_id)
            if cliente:
                diff = new_pax_val - pedido.pax
                cliente.raciones = (cliente.raciones or 0) + diff
        pedido.pax = new_pax_val

    if 'observaciones' in data:
        pedido.observaciones = data['observaciones']

    if 'local_recogida' in data:
        # Igual que en la creación: un pedido de recogida en local no deja
        # recipientes que recoger, así que se marca recogido=True.
        pedido.local_recogida = bool(data['local_recogida'])
        pedido.recogido = pedido.local_recogida

    if 'recogido' in data:
        pedido.recogido = bool(data['recogido'])

    if 'direccion' in data:
        cliente = Cliente.query.get(pedido.cliente_id)
        if cliente:
            cliente.direccion = data['direccion']

    try:
        db.session.commit()
        logger.info(f"Pedido #{pedido.id} properties updated successfully")
    except Exception as e:
        logger.error(f"Error updating properties for pedido #{pedido.id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to update pedido"}), 500

    cliente = Cliente.query.get(pedido.cliente_id)
    lineas = PedidoLinea.query.filter_by(pedido_id=pedido.id).all()

    return jsonify(_serialize_pedido(pedido, cliente, lineas)), 200


@api_v1_bp.route('/pedidos/<int:pedido_id>/feedback', methods=['POST', 'OPTIONS'])
@requires_auth
def save_pedido_feedback(pedido_id):
    pedido = Pedido.query.get(pedido_id)
    if not pedido:
        return jsonify({"error": "Pedido not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    rating = data.get('rating')
    comentario = data.get('comentario')

    if rating is not None:
        try:
            rating = int(rating)
            if not (1 <= rating <= 10):
                return jsonify({"error": "Rating must be between 1 and 10"}), 400
        except ValueError:
            return jsonify({"error": "Rating must be an integer"}), 400

    feedback = PedidoFeedback.query.filter_by(pedido_id=pedido_id).first()
    if not feedback:
        feedback = PedidoFeedback(pedido_id=pedido_id)
        db.session.add(feedback)

    if rating is not None:
        feedback.rating = rating
    if comentario is not None:
        feedback.comentario = comentario

    try:
        db.session.commit()
        logger.info(f"Feedback saved for pedido #{pedido_id}")
        return jsonify({"success": True}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error saving feedback for pedido #{pedido_id}: {str(e)}")
        return jsonify({"error": "Failed to save feedback"}), 500


@api_v1_bp.route('/pedidos/<int:pedido_id>/feedback', methods=['GET', 'OPTIONS'])
@requires_auth
def get_pedido_feedback(pedido_id):
    feedback = PedidoFeedback.query.filter_by(pedido_id=pedido_id).first()
    if not feedback:
        return jsonify({"error": "Feedback not found"}), 404

    return jsonify({
        "pedido_id": feedback.pedido_id,
        "rating": feedback.rating,
        "comentario": feedback.comentario,
        "created_at": feedback.created_at.isoformat() if feedback.created_at else None
    }), 200
