from app import create_app, db
from app.models import Cliente, Arroz, Usuario, Pedido

app = create_app()

@app.shell_context_processor
def make_shell_context():
    return {'db': db, 'Cliente': Cliente, 'Arroz': Arroz, 'Usuario': Usuario, 'Pedido': Pedido}

if __name__ == '__main__':
    app.run(debug=True)
