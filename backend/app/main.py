from app import create_app, db
from app.models import Cliente, Arroz, Usuario, Pedido, PedidoLinea

app = create_app()

@app.shell_context_processor
def make_shell_context():
    return {'db': db, 'Cliente': Cliente, 'Arroz': Arroz, 'Usuario': Usuario, 'Pedido': Pedido, 'PedidoLinea': PedidoLinea}

if __name__ == '__main__':
    app.run(debug=True, port=5001)
