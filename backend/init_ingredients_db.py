from app import create_app, db
from app.models import Ingrediente, ArrozIngrediente

app = create_app()
with app.app_context():
    db.create_all()
    print("Tablas de ingredientes y recetas creadas (si no existían).")

    # Seed initial ingredients if table is empty
    if Ingrediente.query.count() == 0:
        ingredients = [
            ("Arroz Bombita", "g"),
            ("Pollo Troceado", "g"),
            ("Conejo Troceado", "g"),
            ("Garrofó", "g"),
            ("Judía Verde (Bajoqueta)", "g"),
            ("Tomate Triturado", "g"),
            ("Aceite de Oliva", "ml"),
            ("Azafrán", "g"),
            ("Pimentón Dulce", "g"),
            ("Caracoles (Baquetes)", "ud"),
            ("Romero Fresco", "ud"),
            ("Sal", "g"),
            ("Caldo de Carne", "ml"),
            ("Ñora", "ud"),
            ("Ajo", "g")
        ]
        for nombre, unidad in ingredients:
            db.session.add(Ingrediente(nombre=nombre, unidad=unidad))
        db.session.commit()
        print("Ingredientes iniciales insertados.")
