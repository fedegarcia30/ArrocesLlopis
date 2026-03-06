-- =====================================================
-- Script COMPLETO: Base de datos Arroces Llopis (MySQL)
-- Fase 1: Pedidos, Clientes, Arroces + Engagement
-- Fase 2: Stock, Compras, Proveedores
-- Robustez: Status, Usuarios, Soft Delete, Triggers, Vistas
-- Compatible React + Python (Flask/SQLAlchemy)
-- =====================================================

-- 1. Crear/Usar DB
CREATE DATABASE IF NOT EXISTS arroces_llopis CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE arroces_llopis;

-- 2. Tablas CORE (Clientes, Arroces)
DROP TABLE IF EXISTS pedidos, arroz_ingredientes, ingredientes, compra_lineas, compras, usuarios, proveedores;
DROP TABLE IF EXISTS clientes, arroces;

CREATE TABLE clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    direccion VARCHAR(500),
    codigo_postal VARCHAR(10),
    observaciones TEXT,
    num_pedidos INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_telefono (telefono),
    INDEX idx_nombre (nombre)
);

CREATE TABLE arroces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    precio DECIMAL(10,2) NOT NULL CHECK (precio > 0),
    caldo VARCHAR(100),
    disponible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_nombre (nombre),
    INDEX idx_disponible (disponible)
);

-- 3. Usuarios (Autenticación Backend)
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('admin', 'cocinero', 'repartidor', 'gerente') DEFAULT 'gerente',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_rol (rol)
);

-- 4. Pedidos (arroz_id directo, sin tabla intermedia para simplificar el módulo de pedidos)
CREATE TABLE pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NOT NULL,
    usuario_asignado_id INT,
    arroz_id INT NOT NULL,
    pax INT NOT NULL CHECK (pax >= 2),
    fecha DATE NOT NULL,
    intervalo VARCHAR(10) NOT NULL,
    observaciones TEXT,
    status ENUM('nuevo', 'preparando', 'listo', 'entregado', 'cancelado') DEFAULT 'nuevo',
    entregado BOOLEAN DEFAULT FALSE,
    recogido BOOLEAN DEFAULT FALSE,
    local_recogida BOOLEAN DEFAULT FALSE,
    review INT CHECK (review IS NULL OR (review >= 1 AND review <= 5)),
    comentarios_recogida TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
    FOREIGN KEY (usuario_asignado_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (arroz_id) REFERENCES arroces(id) ON DELETE RESTRICT,
    INDEX idx_fecha (fecha),
    INDEX idx_intervalo (intervalo),
    INDEX idx_cliente (cliente_id),
    INDEX idx_status (status),
    INDEX idx_usuario (usuario_asignado_id)
);

-- 5. FASE 2: Stock y Compras
CREATE TABLE proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    contacto VARCHAR(255),
    telefono VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre)
);

CREATE TABLE ingredientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    unidad_medida VARCHAR(50) DEFAULT 'kg',
    stock_actual DECIMAL(10,3) DEFAULT 0.000,
    stock_minimo DECIMAL(10,3) DEFAULT 0.000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre)
);

CREATE TABLE arroz_ingredientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    arroz_id INT NOT NULL,
    ingrediente_id INT NOT NULL,
    cantidad_por_racion DECIMAL(10,3) NOT NULL CHECK (cantidad_por_racion > 0),
    FOREIGN KEY (arroz_id) REFERENCES arroces(id) ON DELETE CASCADE,
    FOREIGN KEY (ingrediente_id) REFERENCES ingredientes(id) ON DELETE RESTRICT,
    UNIQUE KEY unique_receta (arroz_id, ingrediente_id)
);

CREATE TABLE compras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proveedor_id INT NOT NULL,
    fecha_compra DATE NOT NULL,
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE RESTRICT,
    INDEX idx_fecha (fecha_compra)
);

CREATE TABLE compra_lineas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    compra_id INT NOT NULL,
    ingrediente_id INT NOT NULL,
    cantidad DECIMAL(10,3) NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario > 0),
    FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE,
    FOREIGN KEY (ingrediente_id) REFERENCES ingredientes(id) ON DELETE RESTRICT,
    INDEX idx_compra (compra_id)
);

-- 6. TRIGGERS
DELIMITER //

-- Trigger: Actualizar num_pedidos al crear pedido
CREATE TRIGGER trg_clientes_num_pedidos_insert
AFTER INSERT ON pedidos
FOR EACH ROW
BEGIN
    UPDATE clientes SET num_pedidos = num_pedidos + 1 WHERE id = NEW.cliente_id;
END//

-- Trigger: Actualizar num_pedidos al eliminar (soft delete)
CREATE TRIGGER trg_clientes_num_pedidos_delete
AFTER UPDATE ON pedidos
FOR EACH ROW
BEGIN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        UPDATE clientes SET num_pedidos = num_pedidos - 1 WHERE id = OLD.cliente_id AND num_pedidos > 0;
    END IF;
END//

DELIMITER ;

-- 7. VISTAS ÚTILES
CREATE OR REPLACE VIEW vista_pedidos_detallados AS
SELECT
    p.id, p.cliente_id, c.nombre AS cliente_nombre, c.telefono, c.direccion, c.codigo_postal,
    p.pax, p.fecha, p.intervalo, p.status, p.observaciones,
    a.nombre AS arroz_nombre,
    (a.precio * p.pax) AS precio_final,
    u.username AS asignado,
    p.created_at
FROM pedidos p
JOIN clientes c ON p.cliente_id = c.id
JOIN arroces a ON p.arroz_id = a.id
LEFT JOIN usuarios u ON p.usuario_asignado_id = u.id
WHERE p.deleted_at IS NULL;

CREATE OR REPLACE VIEW vista_stock_critico AS
SELECT i.nombre, i.stock_actual, i.stock_minimo, i.unidad_medida,
       (i.stock_actual - i.stock_minimo) AS diferencia
FROM ingredientes i
WHERE i.stock_actual <= i.stock_minimo;

-- 8. Datos de prueba (opcional)
INSERT INTO usuarios (username, password_hash, rol) VALUES 
('admin', '$2b$12$ejemplo_hash', 'admin'),
('cocinero1', '$2b$12$ejemplo_hash', 'cocinero');

INSERT INTO arroces (nombre, precio, caldo, disponible) VALUES 
('Señoret', 13.50, 'Pescado', TRUE),
('Negro', 13.50, 'Pescado', TRUE),
('Abanda', 12.00, 'Pescado', TRUE);
