from flask import request, jsonify
from app.models import Ingrediente, ArrozIngrediente, Arroz, HistoricoPrecio, Compra, CompraLinea
from app import db
from . import api_v1_bp
from app.auth import requires_auth, requires_role
from app.utils.logger import logger

@api_v1_bp.route('/ingredients', methods=['GET'])
@requires_auth
def get_ingredients():
    """
    Lists all available ingredients with stock info.
    """
    try:
        ingredients = Ingrediente.query.order_by(Ingrediente.nombre).all()
        return jsonify([
            {
                "id": i.id,
                "nombre": i.nombre,
                "unidad_medida": i.unidad_medida,
                "stock_actual": float(i.stock_actual) if i.stock_actual else 0,
                "stock_minimo": float(i.stock_minimo) if i.stock_minimo else 0,
                "precio_actual": float(i.precio_actual) if i.precio_actual else 0
            } for i in ingredients
        ]), 200
    except Exception as e:
        logger.error(f"Error fetching ingredients: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to fetch ingredients"}), 500

@api_v1_bp.route('/ingredients/<int:ingredient_id>', methods=['PUT'])
@requires_auth
@requires_role(['admin', 'encargado', 'gerente'])
def update_ingredient(ingredient_id):
    """
    Updates an ingredient's configuration/stock.
    """
    data = request.get_json()
    try:
        ingredient = Ingrediente.query.get_or_404(ingredient_id)
        
        if 'nombre' in data:
            ingredient.nombre = data['nombre']
        if 'unidad_medida' in data:
            ingredient.unidad_medida = data['unidad_medida']
        if 'stock_actual' in data:
            ingredient.stock_actual = data['stock_actual']
        if 'stock_minimo' in data:
            ingredient.stock_minimo = data['stock_minimo']
        
        price_changed = False
        if 'precio_actual' in data:
            new_price = float(data['precio_actual'])
            if float(ingredient.precio_actual or 0) != new_price:
                ingredient.precio_actual = new_price
                price_changed = True
            
        if price_changed:
            history = HistoricoPrecio(
                item_id=ingredient.id,
                tipo_item='compra',
                precio=ingredient.precio_actual
            )
            db.session.add(history)
            
        db.session.commit()
        logger.info(f"Ingredient #{ingredient_id} ({ingredient.nombre}) updated. Price changed: {price_changed}")
        
        return jsonify({"success": True, "message": "Ingrediente actualizado"}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating ingredient {ingredient_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to update ingredient"}), 500

@api_v1_bp.route('/ingredients/purchase', methods=['POST'])
@requires_auth
@requires_role(['admin', 'encargado', 'gerente'])
def process_purchase():
    """
    Adds purchased quantities to current stock and records the purchase transaction.
    Expects {proveedor_id, items: [{ingrediente_id, cantidad, precio_unitario}]}.
    """
    data = request.get_json()
    if not data or 'items' not in data:
        return jsonify({"error": "Invalid data format"}), 400
        
    try:
        total_purchase = 0
        items = data.get('items', [])
        
        if not items:
            return jsonify({"error": "No items in purchase"}), 400

        # Create the purchase header
        nueva_compra = Compra(
            proveedor_id=data.get('proveedor_id', 1), # Default to 1 if not provided for now
            fecha_compra=request.args.get('fecha', datetime.utcnow().date()),
            total=0,
            observaciones=data.get('observaciones', '')
        )
        db.session.add(nueva_compra)
        db.session.flush()

        for item in items:
            ingredient = Ingrediente.query.get(item['ingrediente_id'])
            if ingredient:
                qty = float(item['cantidad'])
                price = float(item['precio_unitario'])
                
                # Update stock
                ingredient.stock_actual = (float(ingredient.stock_actual) or 0) + qty
                
                # Check for price change and update current reference price
                if float(ingredient.precio_actual or 0) != price:
                    ingredient.precio_actual = price
                    history = HistoricoPrecio(
                        item_id=ingredient.id,
                        tipo_item='compra',
                        precio=price
                    )
                    db.session.add(history)

                # Create purchase line
                linea = CompraLinea(
                    compra_id=nueva_compra.id,
                    ingrediente_id=ingredient.id,
                    cantidad=qty,
                    precio_unitario=price
                )
                db.session.add(linea)
                total_purchase += (qty * price)
                
        nueva_compra.total = total_purchase
        db.session.commit()
        logger.info(f"Purchase #{nueva_compra.id} processed with {len(items)} items. Total: {total_purchase}")
        
        return jsonify({"success": True, "purchase_id": nueva_compra.id, "message": "Compra registrada y stock actualizado"}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error processing purchase: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to process purchase"}), 500

@api_v1_bp.route('/rices/<int:rice_id>/recipe', methods=['GET'])
@requires_auth
def get_rice_recipe(rice_id):
    """
    Returns the list of ingredients and quantities for a specific rice.
    """
    try:
        rice = Arroz.query.get_or_404(rice_id)
        recipe = ArrozIngrediente.query.filter_by(arroz_id=rice_id).all()
        
        return jsonify({
            "rice_id": rice_id,
            "rice_name": rice.nombre,
            "ingredients": [
                {
                    "ingrediente_id": r.ingrediente_id,
                    "nombre": r.ingrediente.nombre,
                    "cantidad_por_racion": float(r.cantidad_por_racion),
                    "unidad_medida": r.ingrediente.unidad_medida
                } for r in recipe
            ]
        }), 200
    except Exception as e:
        logger.error(f"Error fetching recipe for rice {rice_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to fetch recipe"}), 500

@api_v1_bp.route('/rices/<int:rice_id>/recipe', methods=['POST'])
@requires_auth
@requires_role(['admin', 'encargado', 'gerente'])
def update_rice_recipe(rice_id):
    """
    Updates the recipe for a specific rice. 
    Expects a list of {ingrediente_id, cantidad}.
    """
    data = request.get_json()
    if not isinstance(data, list):
        return jsonify({"error": "Invalid data format. Expected a list of ingredients"}), 400
        
    try:
        # Check if rice exists
        rice = Arroz.query.get_or_404(rice_id)
        
        # Remove existing recipe
        ArrozIngrediente.query.filter_by(arroz_id=rice_id).delete()
        
        # Add new ingredients
        for item in data:
            nuevo_item = ArrozIngrediente(
                arroz_id=rice_id,
                ingrediente_id=item['ingrediente_id'],
                cantidad_por_racion=item['cantidad_por_racion']
            )
            db.session.add(nuevo_item)
            
        db.session.commit()
        logger.info(f"Recipe updated for rice #{rice_id} ({rice.nombre}) by user")
        
        return jsonify({"success": True, "message": "Receta actualizada correctamente"}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating recipe for rice {rice_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to update recipe"}), 500
