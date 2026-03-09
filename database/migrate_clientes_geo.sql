-- Migración: Añadir columnas de geolocalización y campos extra a clientes
-- Ejecutar con: python database/migrate.py (ajustando la ruta en el script)
-- O directamente: mysql -u root -p arroces_llopis < database/migrate_clientes_geo.sql

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS raciones INT DEFAULT 0 COMMENT 'Total de raciones pedidas históricamente',
  ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE COMMENT 'Cliente activo/inactivo',
  ADD COLUMN IF NOT EXISTS direccion_limpia VARCHAR(500) COMMENT 'Dirección normalizada para geocodificación',
  ADD COLUMN IF NOT EXISTS latitud DECIMAL(10, 8) COMMENT 'Latitud GPS',
  ADD COLUMN IF NOT EXISTS longitud DECIMAL(11, 8) COMMENT 'Longitud GPS';
