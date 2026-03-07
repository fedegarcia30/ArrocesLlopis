USE arroces_llopis;

-- Create history table
CREATE TABLE IF NOT EXISTS historico_precios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    tipo_item ENUM('venta', 'compra') NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_item_tipo (item_id, tipo_item)
);

-- Add precio_actual to ingredientes if it doesn't exist
-- Using a procedure to handle "IF NOT EXISTS" for older MySQL if needed, 
-- but I'll try the direct approach or catch the error in python.
-- Actually, ALTER TABLE ... ADD COLUMN is fine if I handle the error.
ALTER TABLE ingredientes ADD COLUMN precio_actual DECIMAL(10,2) DEFAULT 0;
