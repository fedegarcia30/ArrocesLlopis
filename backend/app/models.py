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
    raciones = db.Column(db.Integer, default=0)
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

class Ingrediente(db.Model):
    __tablename__ = 'ingredientes'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(255), nullable=False, unique=True)
    unidad_medida = db.Column(db.String(50), default='g') # g, ml, ud, etc.
    stock_actual = db.Column(db.Numeric(10, 3), default=0)
    stock_minimo = db.Column(db.Numeric(10, 3), default=0)
    precio_actual = db.Column(db.Numeric(10, 2), default=0) # Added for price tracking
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ArrozIngrediente(db.Model):
    __tablename__ = 'arroz_ingredientes'
    id = db.Column(db.Integer, primary_key=True)
    arroz_id = db.Column(db.Integer, db.ForeignKey('arroces.id'), nullable=False)
    ingrediente_id = db.Column(db.Integer, db.ForeignKey('ingredientes.id'), nullable=False)
    cantidad_por_racion = db.Column(db.Numeric(10, 3), nullable=False) # Cantidad por ración
    
    arroz = db.relationship('Arroz', backref=db.backref('ingredientes_assoc', lazy=True, cascade="all, delete-orphan"))
    ingrediente = db.relationship('Ingrediente', lazy=True)

class Proveedor(db.Model):
    __tablename__ = 'proveedores'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(255), nullable=False)
    contacto = db.Column(db.String(255))
    telefono = db.Column(db.String(20))
    email = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Compra(db.Model):
    __tablename__ = 'compras'
    id = db.Column(db.Integer, primary_key=True)
    proveedor_id = db.Column(db.Integer, db.ForeignKey('proveedores.id'), nullable=False)
    fecha_compra = db.Column(db.Date, nullable=False)
    total = db.Column(db.Numeric(10, 2), nullable=False)
    observaciones = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class CompraLinea(db.Model):
    __tablename__ = 'compra_lineas'
    id = db.Column(db.Integer, primary_key=True)
    compra_id = db.Column(db.Integer, db.ForeignKey('compras.id'), nullable=False)
    ingrediente_id = db.Column(db.Integer, db.ForeignKey('ingredientes.id'), nullable=False)
    cantidad = db.Column(db.Numeric(10, 3), nullable=False)
    precio_unitario = db.Column(db.Numeric(10, 2), nullable=False)

class HistoricoPrecio(db.Model):
    __tablename__ = 'historico_precios'
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, nullable=False)
    tipo_item = db.Column(db.Enum('venta', 'compra'), nullable=False) # 'venta' (arroz), 'compra' (ingrediente)
    precio = db.Column(db.Numeric(10, 2), nullable=False)
    fecha_inicio = db.Column(db.DateTime, default=datetime.utcnow)
