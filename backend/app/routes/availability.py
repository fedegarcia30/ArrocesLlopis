from flask import request, jsonify
from datetime import datetime, timedelta
from sqlalchemy import func, extract
from app.models import Pedido
from app import db
from . import api_v1_bp
from app.auth import requires_auth

MAX_ORDERS_PER_SLOT = 6
MAX_PAX_PER_SLOT = 72

DEFAULT_SLOTS = [
    "13:00", "13:15", "13:30", "13:45",
    "14:00", "14:15", "14:30", "14:45",
    "15:00", "15:15", "15:30",
]


def _time_to_slot(dt):
    """Rounds a datetime down to the nearest 15-min slot string."""
    minute = (dt.minute // 15) * 15
    return f"{dt.hour:02d}:{minute:02d}"


@api_v1_bp.route('/availability/check', methods=['POST', 'OPTIONS'])
@requires_auth
def check_availability():
    data = request.get_json()
    if not data or 'date' not in data:
        return jsonify({"error": "Date is required (YYYY-MM-DD)"}), 400

    try:
        query_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    # Get all non-cancelled pedidos for this date
    day_start = datetime.combine(query_date, datetime.min.time())
    day_end = day_start + timedelta(days=1)

    pedidos = Pedido.query.filter(
        Pedido.fecha_pedido >= day_start,
        Pedido.fecha_pedido < day_end,
        Pedido.status != 'cancelado',
        Pedido.deleted_at.is_(None)
    ).all()

    # Aggregate by slot
    usage_by_slot = {}
    for p in pedidos:
        slot = _time_to_slot(p.fecha_pedido)
        if slot not in usage_by_slot:
            usage_by_slot[slot] = {"orders_count": 0, "pax_total": 0}
        usage_by_slot[slot]["orders_count"] += 1
        usage_by_slot[slot]["pax_total"] += p.pax

    slots_response = []

    for slot_time in DEFAULT_SLOTS:
        usage = usage_by_slot.get(slot_time, {"orders_count": 0, "pax_total": 0})

        orders_c = usage['orders_count']
        pax_t = usage['pax_total']

        remaining_orders = max(0, MAX_ORDERS_PER_SLOT - orders_c)
        remaining_pax = max(0, MAX_PAX_PER_SLOT - pax_t)

        available = remaining_orders > 0 and remaining_pax >= 2

        if not available:
            status = 'red'
        elif remaining_orders <= 2 or remaining_pax <= 12:
            status = 'yellow'
        else:
            status = 'green'

        slots_response.append({
            "time": slot_time,
            "orders_count": orders_c,
            "pax_total": pax_t,
            "available": available,
            "remaining_orders": remaining_orders,
            "remaining_pax": remaining_pax,
            "status": status
        })

    return jsonify({
        "date": data['date'],
        "slots": slots_response
    }), 200
