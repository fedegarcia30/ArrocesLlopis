from . import db
from datetime import datetime

class Cliente(db.Model):
    __tablename__ = 'clientes'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(255), nullable=False)
    telefono = db.Column(db.String(20))
    direccion = db.Column(db.String(500))
    codigo_postal = db.Column(db.String(10))
    observaciones = db.Column(db.Text)
    num_pedidos = db.Column(db.Integer, default=0)
    activo = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = db.Column(db.DateTime)

class Arroz(db.Model):
    __tablename__ = 'arroces'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(255), nullable=False, unique=True)
    precio = db.Column(db.Numeric(10, 2), nullable=False)
    caldo = db.Column(db.String(100))
    disponible = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = db.Column(db.DateTime)

class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    rol = db.Column(db.Enum('admin', 'cocinero', 'repartidor', 'gerente'), default='gerente')
    activo = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Pedido(db.Model):
    __tablename__ = 'pedidos'
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=False)
    usuario_asignado_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    pax = db.Column(db.Integer, nullable=False)
    fecha_pedido = db.Column(db.DateTime, nullable=False)
    observaciones = db.Column(db.Text)
    status = db.Column(db.Enum('nuevo', 'preparando', 'listo', 'entregado', 'cancelado'), default='nuevo')
    entregado = db.Column(db.Boolean, default=False)
    recogido = db.Column(db.Boolean, default=False)
    local_recogida = db.Column(db.Boolean, default=False)
    review = db.Column(db.Integer)
    comentarios_recogida = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = db.Column(db.DateTime)

    # Relación con pedido_lineas
    lineas = db.relationship('PedidoLinea', backref='pedido', lazy=True)

class PedidoLinea(db.Model):
    __tablename__ = 'pedido_lineas'
    id = db.Column(db.Integer, primary_key=True)
    pedido_id = db.Column(db.Integer, db.ForeignKey('pedidos.id'), nullable=False)
    arroz_id = db.Column(db.Integer, db.ForeignKey('arroces.id'), nullable=False)
    precio_unitario = db.Column(db.Numeric(10, 2), nullable=False)

    arroz = db.relationship('Arroz', lazy=True)
