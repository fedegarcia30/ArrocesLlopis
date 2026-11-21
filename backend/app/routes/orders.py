from flask import request, jsonify
from datetime import datetime, timedelta
from app.models import Cliente, Pedido, PedidoLinea, Arroz, HistoricoPrecio
from app import db
from . import api_v1_bp
from .availability import MAX_ORDERS_PER_SLOT, MAX_PAX_PER_SLOT
from app.auth import requires_auth
from app.utils.logger import logger
from app.utils.stock import adjust_stock_from_order


def precio_vigente(arroz_id, fecha):
    history = HistoricoPrecio.query.filter(
        HistoricoPrecio.item_id == arroz_id,
        HistoricoPrecio.tipo_item == 'venta',
        HistoricoPrecio.fecha_inicio <= fecha,
        (HistoricoPrecio.fecha_fin.is_(None)) | (HistoricoPrecio.fecha_fin > fecha)
    ).order_by(HistoricoPrecio.fecha_inicio.desc()).first()
    if history:
        return float(history.precio)
    arroz = Arroz.query.get(arroz_id)
    return float(arroz.precio) if arroz else None


@api_v1_bp.route('/orders/create', methods=['POST', 'OPTIONS'])
@requires_auth
def create_order():
    data = request.get_json()

    required_keys = ['date', 'time', 'client', 'order']
    if not data or not all(k in data for k in required_keys):
        return jsonify({"success": False, "message": "Missing required fields"}), 400

    try:
        order_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"success": False, "message": "Invalid date format"}), 400

    order_time = data['time']
    client_data = data['client']
    order_data = data['order']
    lines = order_data.get('lines')
    if lines:
        try:
            items = [(int(line['arroz_id']), int(line['pax'])) for line in lines]
        except (KeyError, TypeError, ValueError):
            return jsonify({"success": False, "message": "Líneas de pedido inválidas"}), 400
    else:
        items = [(int(order_data['arroz_id']), int(order_data.get('pax', 0)))]

    if any(pax < 1 for _, pax in items):
        return jsonify({"success": False, "message": "Cada línea debe tener al menos 1 ración"}), 400
    requested_pax = sum(pax for _, pax in items)
    if requested_pax < 2:
        return jsonify({"success": False, "message": "Minimum 2 PAX per order"}), 400

    # Build datetime from date + time slot
    try:
        hour, minute = map(int, order_time.split(':'))
        fecha_pedido = datetime(order_date.year, order_date.month, order_date.day, hour, minute)
    except (ValueError, AttributeError):
        return jsonify({"success": False, "message": "Invalid time format"}), 400

    # Check availability for this slot (15-min window)
    slot_start = fecha_pedido
    slot_end = slot_start + timedelta(minutes=15)

    existing = Pedido.query.filter(
        Pedido.fecha_pedido >= slot_start,
        Pedido.fecha_pedido < slot_end,
        Pedido.status != 'cancelado',
        Pedido.deleted_at.is_(None)
    ).all()

    current_orders = len(existing)
    current_pax = sum(p.pax for p in existing)

    if (current_orders + 1 > MAX_ORDERS_PER_SLOT) or (current_pax + requested_pax > MAX_PAX_PER_SLOT):
        logger.warning(f"Order rejected: Slot full logic triggered. Date: {order_date}, Time: {order_time}")
        return jsonify({
            "success": False,
            "error_code": "SLOT_FULL",
            "message": "Lo sentimos, el hueco seleccionado ya no tiene disponibilidad (máximo 6 pedidos o 72 raciones)."
        }), 400

    # Validate rice lines and aggregate duplicate items
    aggregated_items = {}
    for arroz_id, pax in items:
        arroz = Arroz.query.get(arroz_id)
        if not arroz:
            return jsonify({"success": False, "message": "Arroz no encontrado"}), 400
        aggregated_items[arroz_id] = aggregated_items.get(arroz_id, 0) + pax
    requested_pax = sum(aggregated_items.values())

    try:
        # Client handling
        cliente_id = client_data.get('id')
        if not cliente_id:
            nuevo_cliente = Cliente(
                nombre=client_data.get('nombre', 'Sin Nombre'),
                telefono=client_data.get('telefono', ''),
                direccion=client_data.get('direccion', ''),
                codigo_postal=client_data.get('codigo_postal', '')
            )
            db.session.add(nuevo_cliente)
            db.session.flush()
            cliente_id = nuevo_cliente.id

        nuevo_pedido = Pedido(
            cliente_id=cliente_id,
            pax=requested_pax,
            fecha_pedido=fecha_pedido,
            recogido=bool(order_data.get('recogida')),
            local_recogida=bool(order_data.get('recogida')),
            observaciones=order_data.get('observaciones', '')
        )
        db.session.add(nuevo_pedido)
        db.session.flush()

        # Create one line per rice
        for arroz_id, pax in aggregated_items.items():
            price = precio_vigente(arroz_id, fecha_pedido)
            db.session.add(PedidoLinea(
                pedido_id=nuevo_pedido.id,
                arroz_id=arroz_id,
                precio_unitario=price,
                raciones=pax
            ))
            adjust_stock_from_order(arroz_id, pax)

        # Update client totals
        cliente = Cliente.query.get(cliente_id)
        if cliente:
            cliente.num_pedidos = (cliente.num_pedidos or 0) + 1
            cliente.raciones = (cliente.raciones or 0) + requested_pax

        db.session.commit()
        logger.info(f"Order #{nuevo_pedido.id} created successfully for client #{cliente_id} ({requested_pax} PAX, {len(aggregated_items)} lines)")

        return jsonify({
            "success": True,
            "order_id": nuevo_pedido.id,
            "message": "Pedido confirmado correctamente."
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating order: {str(e)}", exc_info=True)
        return jsonify({"success": False, "message": str(e)}), 500
