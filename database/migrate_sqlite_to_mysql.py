from __future__ import annotations

import argparse
import logging
import sqlite3
from collections import Counter
from pathlib import Path
from urllib.parse import unquote, urlparse

import mysql.connector as mysql_connector


ROOT = Path(__file__).resolve().parents[1]
LEGACY_DB = ROOT / "Datos" / "Arroces_Llopis.db"
ENV_FILE = ROOT / "backend" / ".env"

PRODUCT_NAMES = {
    "SEÑORET": "Señoret",
    "BANDA": "Banda",
    "NEGRO": "Negro",
    "PULPO": "Pulpo",
    "POLLO": "Pollo",
    "ALCACHOFAS": "Alcachofas",
    "VERDURAS": "Verduras",
    "PAELLA": "Paella",
    "CARABINERO": "Carabinero",
    "FIDEUÁ": "Fideuá",
    "COCIDO": "Cocido",
    "CALLOS": "Callos",
    "CARRILLERAS": "Carrilleras",
    "POLLO EN PEPITORIA": "Pollo en Pepitoria",
}


def load_env_database_url() -> str:
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError(f"DATABASE_URL no encontrada en {ENV_FILE}")


def parse_database_url(url: str) -> dict:
    parsed = urlparse(url)
    if parsed.scheme not in ("mysql", "mysql+mysqlconnector"):
        raise RuntimeError(f"Esquema de base de datos no soportado: {parsed.scheme}")
    return {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 3306,
        "user": unquote(parsed.username or ""),
        "password": unquote(parsed.password or ""),
        "database": unquote(parsed.path.lstrip("/")),
        "charset": "utf8mb4",
        "use_unicode": True,
    }


def rows_by_id(cursor, table: str, id_column: str) -> dict:
    result_cursor = cursor.execute(f"SELECT * FROM {table}")
    names = [description[0] for description in result_cursor.description]
    result = {}
    for values in result_cursor.fetchall():
        row = dict(zip(names, values))
        result[row[id_column]] = row
    return result


def join_name(row: dict) -> str:
    name = " ".join(
        str(row[key]).strip()
        for key in ("nombre", "primer_apellido", "segundo_apellido")
        if row.get(key)
    )
    return name or "Sin Nombre"


def compose_address(address: dict) -> str:
    if address.get("completa") == 1 and address.get("texto_original"):
        return str(address["texto_original"]).strip()
    parts = [
        address.get("calle"),
        address.get("numero"),
        address.get("bloque_escalera"),
        address.get("piso"),
        address.get("puerta"),
    ]
    result = " ".join(str(part).strip() for part in parts if part)
    municipality = address.get("municipio")
    province = address.get("provincia")
    extras = [str(value).strip() for value in (municipality, province) if value]
    if extras:
        result = f"{result}, {', '.join(extras)}" if result else ", ".join(extras)
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--allow-dummy-clear", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    log = logging.getLogger("migration")
    if not LEGACY_DB.exists():
        raise RuntimeError(f"No existe la base SQLite: {LEGACY_DB}")
    if args.dry_run:
        log.info("Modo dry-run: no se hará commit ni se borrarán datos")

    sqlite = sqlite3.connect(str(LEGACY_DB))
    sqlite.row_factory = sqlite3.Row

    mysql = mysql_connector.connect(**parse_database_url(load_env_database_url()))
    cursor = mysql.cursor(dictionary=True)

    try:
        if not args.dry_run:
            if not args.allow_dummy_clear:
                raise RuntimeError(
                    "Uso destructivo requiere --allow-dummy-clear"
                )
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
            for table in (
                "pedido_feedback",
                "pedido_lineas",
                "pedidos",
                "clientes",
                "arroces",
                "historico_precios",
            ):
                cursor.execute(f"TRUNCATE TABLE {table}")
            cursor.execute("DROP TABLE IF EXISTS clientes_backup")
            cursor.execute("DROP TABLE IF EXISTS mes_mapping")
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1")

        productos = {
            row["id_producto"]: dict(row)
            for row in sqlite.execute("SELECT * FROM productos")
        }
        precios = list(
            dict(row)
            for row in sqlite.execute("SELECT * FROM precios")
        )

        map_arroz = {}
        arroz_rows = []
        for legacy_id, product in productos.items():
            if product["nombre"] not in PRODUCT_NAMES:
                log.warning("Producto legacy desconocido omitido: %s", product["nombre"])
                continue
            current_price_rows = [
                price for price in precios
                if price["id_producto"] == legacy_id
                and price["vigente_hasta"] is None
            ]
            current_price = (
                current_price_rows[0]["precio_por_racion_centimos"] / 100.0
                if current_price_rows
                else 0.01
            )
            cursor.execute(
                "INSERT INTO arroces (nombre, precio, caldo, disponible) "
                "VALUES (%s, %s, NULL, TRUE)",
                (PRODUCT_NAMES[product["nombre"]], current_price),
            )
            mysql_id = cursor.lastrowid
            map_arroz[legacy_id] = mysql_id
            arroz_rows.append((legacy_id, mysql_id))

        history_rows = []
        for price in precios:
            if price["id_producto"] not in map_arroz:
                continue
            history_rows.append((
                map_arroz[price["id_producto"]],
                "venta",
                price["precio_por_racion_centimos"] / 100.0,
                price["vigente_desde"],
                price["vigente_hasta"],
            ))
        cursor.executemany(
            "INSERT INTO historico_precios "
            "(item_id, tipo_item, precio, fecha_inicio, fecha_fin) "
            "VALUES (%s, %s, %s, %s, %s)",
            history_rows,
        )

        addresses = list(
            dict(row)
            for row in sqlite.execute("SELECT * FROM direcciones")
        )
        addresses_by_client = {}
        for address in addresses:
            addresses_by_client.setdefault(address["id_cliente"], []).append(address)

        pedido_address_counts = Counter()
        for row in sqlite.execute(
            "SELECT id_cliente, id_direccion_entrega "
            "FROM pedidos WHERE id_direccion_entrega IS NOT NULL"
        ):
            pedido_address_counts[(row["id_cliente"], row["id_direccion_entrega"])] += 1

        map_cliente = {}
        cliente_rows = []
        for legacy in sqlite.execute("SELECT * FROM clientes"):
            row = dict(legacy)
            candidates = addresses_by_client.get(row["id_cliente"], [])
            principal = None
            if candidates:
                principal = max(
                    candidates,
                    key=lambda address: (
                        pedido_address_counts[
                            (row["id_cliente"], address["id_direccion"])
                        ],
                        address["activa"] or 0,
                        -address["id_direccion"],
                    ),
                )

            observations = row.get("observaciones") or ""
            if row.get("pendiente_revision") == 1:
                reason = row.get("motivo_revision") or ""
                observations = f"Pendiente revisión: {reason}".strip()
                if row.get("observaciones"):
                    observations += f"\n{row['observaciones']}"

            cursor.execute(
                "INSERT INTO clientes "
                "(nombre, telefono, direccion, codigo_postal, observaciones, "
                "municipio, provincia, activo, num_pedidos, raciones, created_at) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE, 0, 0, %s)",
                (
                    join_name(row),
                    row.get("telefono_principal") or row.get("telefono_secundario"),
                    compose_address(principal) if principal else "",
                    principal.get("codigo_postal") if principal else None,
                    observations or None,
                    principal.get("municipio") if principal else None,
                    principal.get("provincia") if principal else None,
                    row.get("fecha_alta"),
                ),
            )
            mysql_id = cursor.lastrowid
            map_cliente[row["id_cliente"]] = mysql_id
            cliente_rows.append((row["id_cliente"], mysql_id))

        jornadas = rows_by_id(sqlite, "jornadas", "id_jornada")
        franjas = rows_by_id(sqlite, "franjas", "id_franja")
        detalles = {}
        for row in sqlite.execute("SELECT * FROM detalle_pedidos"):
            detalles.setdefault(row["id_pedido"], []).append(dict(row))

        prices_by_id = {row["id_precio"]: row for row in precios}
        skipped_orders = []
        skipped_lines = []
        migrated_orders = 0
        migrated_lines = 0

        for legacy in sqlite.execute("SELECT * FROM pedidos"):
            order = dict(legacy)
            details = detalles.get(order["id_pedido"], [])
            total_pax = sum((detail.get("raciones") or 0) for detail in details)
            if total_pax < 1:
                skipped_orders.append(order["id_pedido"])
                continue
            client_id = map_cliente.get(order["id_cliente"])
            if not client_id:
                log.warning("Pedido %s sin cliente válido", order["id_pedido"])
                continue

            jornada = jornadas.get(order["id_jornada"])
            if not jornada:
                log.warning("Pedido %s sin jornada", order["id_pedido"])
                continue
            franja = franjas.get(order["id_franja"]) if order["id_franja"] else None
            hour = franja["hora_entrega"] if franja and franja["hora_entrega"] else "13:00"
            fecha_pedido = f"{jornada['fecha']} {hour}"
            status_map = {
                "Realizado": "entregado",
                "Anulado": "cancelado",
                "Pendiente de aclarar": "nuevo",
            }
            status = status_map.get(order["estado"], "nuevo")
            observations = " ".join(
                str(value).strip()
                for value in (order.get("observaciones"), order.get("dudas_pendientes"))
                if value
            )

            cursor.execute(
                "INSERT INTO pedidos "
                "(cliente_id, pax, fecha_pedido, observaciones, status, entregado, "
                "recogido, local_recogida, created_at) "
                "VALUES (%s, %s, %s, %s, %s, %s, FALSE, FALSE, %s)",
                (
                    client_id,
                    int(total_pax),
                    fecha_pedido,
                    observations or None,
                    status,
                    status == "entregado",
                    fecha_pedido,
                ),
            )
            mysql_order_id = cursor.lastrowid
            migrated_orders += 1

            grouped_details = {}
            for detail in details:
                legacy_arroz_id = detail.get("id_producto")
                if legacy_arroz_id is None:
                    skipped_lines.append(detail["id_detalle"])
                    continue
                if legacy_arroz_id not in grouped_details:
                    grouped_details[legacy_arroz_id] = []
                grouped_details[legacy_arroz_id].append(detail)

            for legacy_arroz_id, product_details in grouped_details.items():
                mysql_arroz_id = map_arroz.get(legacy_arroz_id)
                if not mysql_arroz_id:
                    skipped_lines.extend(detail["id_detalle"] for detail in product_details)
                    continue

                raciones = int(
                    sum(detail.get("raciones") or 0 for detail in product_details)
                )
                detail = next(
                    (
                        candidate
                        for candidate in product_details
                        if candidate.get("id_precio") is not None
                    ),
                    product_details[0],
                )
                price = None
                legacy_price = prices_by_id.get(detail.get("id_precio"))
                if legacy_price and legacy_price["id_producto"] == legacy_arroz_id:
                    price = legacy_price["precio_por_racion_centimos"] / 100.0
                if price is None:
                    for legacy_price in precios:
                        if (
                            legacy_price["id_producto"] == legacy_arroz_id
                            and legacy_price["vigente_desde"] <= jornada["fecha"]
                            and (
                                legacy_price["vigente_hasta"] is None
                                or jornada["fecha"] < legacy_price["vigente_hasta"]
                            )
                        ):
                            price = legacy_price["precio_por_racion_centimos"] / 100.0
                            break
                if price is None:
                    cursor.execute(
                        "SELECT precio FROM arroces WHERE id = %s",
                        (mysql_arroz_id,),
                    )
                    price_row = cursor.fetchone()
                    price = float(price_row["precio"]) if price_row else 0.01

                cursor.execute(
                    "INSERT INTO pedido_lineas "
                    "(pedido_id, arroz_id, precio_unitario, raciones) "
                    "VALUES (%s, %s, %s, %s)",
                    (mysql_order_id, mysql_arroz_id, price, raciones),
                )
                migrated_lines += 1

        cursor.execute(
            "UPDATE clientes c SET "
            "num_pedidos = ("
            "SELECT COUNT(*) FROM pedidos p "
            "WHERE p.cliente_id = c.id AND p.status <> 'cancelado' "
            "AND p.deleted_at IS NULL"
            "), raciones = ("
            "SELECT COALESCE(SUM(p.pax), 0) FROM pedidos p "
            "WHERE p.cliente_id = c.id AND p.status <> 'cancelado' "
            "AND p.deleted_at IS NULL"
            ")"
        )

        if args.dry_run:
            mysql.rollback()
        else:
            mysql.commit()
        log.info(
            "Migración completada: %s pedidos, %s líneas; "
            "clientes=%s, arroces=%s, historico=%s",
            migrated_orders,
            migrated_lines,
            len(cliente_rows),
            len(arroz_rows),
            len(history_rows),
        )
        log.info("Pedidos omitidos por pax<1: %s", len(skipped_orders))
        log.info("Líneas omitidas por producto/ruta inválida: %s", len(skipped_lines))
        log.info("IDs pedidos omitidos: %s", skipped_orders)
        log.info("IDs detalles omitidos: %s", skipped_lines)
    except Exception:
        mysql.rollback()
        raise
    finally:
        cursor.close()
        mysql.close()
        sqlite.close()


if __name__ == "__main__":
    main()
