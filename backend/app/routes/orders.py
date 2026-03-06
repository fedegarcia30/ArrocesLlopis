from flask import request, jsonify
from datetime import datetime, timedelta
from app.models import Cliente, Pedido, PedidoLinea, Arroz
from app import db
from . import api_v1_bp
from .availability import MAX_ORDERS_PER_SLOT, MAX_PAX_PER_SLOT
from app.auth import requires_auth


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
    requested_pax = int(order_data.get('pax', 0))

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
        return jsonify({
            "success": False,
            "error_code": "SLOT_FULL",
            "message": "Lo sentimos, el hueco seleccionado ya no tiene disponibilidad (máximo 6 pedidos o 72 raciones)."
        }), 400

    # Validate arroz exists
    arroz_id = order_data.get('arroz_id')
    arroz = Arroz.query.get(arroz_id)
    if not arroz:
        return jsonify({"success": False, "message": "Arroz no encontrado"}), 400

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

        # Create pedido_linea
        linea = PedidoLinea(
            pedido_id=nuevo_pedido.id,
            arroz_id=arroz.id,
            precio_unitario=float(arroz.precio)
        )
        db.session.add(linea)
        db.session.commit()

        return jsonify({
            "success": True,
            "order_id": nuevo_pedido.id,
            "message": "Pedido confirmado correctamente."
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
