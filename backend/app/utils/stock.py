from app.models import ArrozIngrediente, Ingrediente
from app import db
from app.utils.logger import logger

def adjust_stock_from_order(arroz_id, pax, restore=False):
    """
    Adjusts stock for all ingredients in a rice recipe.
    restore=False: Subtracts from stock (for new orders)
    restore=True: Adds back to stock (for cancellations)
    """
    try:
        # Get recipe ingredients
        recipe_items = ArrozIngrediente.query.filter_by(arroz_id=arroz_id).all()
        
        if not recipe_items:
            logger.info(f"No recipe found for rice ID {arroz_id}, no stock adjustment needed.")
            return True

        for item in recipe_items:
            ingrediente = Ingrediente.query.get(item.ingrediente_id)
            if not ingrediente:
                logger.warning(f"Ingredient ID {item.ingrediente_id} not found during stock adjustment.")
                continue

            total_amount = float(item.cantidad_por_racion) * pax
            
            if restore:
                ingrediente.stock_actual = float(ingrediente.stock_actual or 0) + total_amount
                action = "restored"
            else:
                ingrediente.stock_actual = float(ingrediente.stock_actual or 0) - total_amount
                action = "subtracted"

            logger.info(f"Stock {action} for {ingrediente.nombre}: {total_amount} {ingrediente.unidad_medida}. New total: {ingrediente.stock_actual}")

        return True
    except Exception as e:
        logger.error(f"Error adjusting stock for rice {arroz_id}: {str(e)}", exc_info=True)
        return False
