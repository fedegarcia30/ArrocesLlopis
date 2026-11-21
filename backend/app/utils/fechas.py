"""Utilidades de fecha para las reglas de negocio sobre pedidos pasados."""
from datetime import date, datetime

from flask import request

try:
    from zoneinfo import ZoneInfo
    _TZ = ZoneInfo('Europe/Madrid')
except Exception:  # sin base de datos de zonas horarias (p. ej. Windows sin tzdata)
    _TZ = None


def hoy_local() -> date:
    """Fecha actual en la hora del negocio (Europe/Madrid)."""
    return datetime.now(_TZ).date() if _TZ else datetime.now().date()


def es_pasado(valor) -> bool:
    """True si la fecha (date o datetime) es anterior a hoy."""
    if valor is None:
        return False
    d = valor.date() if isinstance(valor, datetime) else valor
    return d < hoy_local()


def puede_editar_pasado() -> bool:
    """Solo el admin puede crear o modificar pedidos de fechas pasadas."""
    user = getattr(request, 'user', None) or {}
    return user.get('rol') == 'admin'


ERROR_PASADO = {
    "success": False,
    "error_code": "PAST_DATE",
    "error": "Solo el administrador puede crear o modificar pedidos de fechas pasadas.",
    "message": "Solo el administrador puede crear o modificar pedidos de fechas pasadas.",
}
