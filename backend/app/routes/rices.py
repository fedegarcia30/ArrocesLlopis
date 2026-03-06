from flask import jsonify, request
from app.models import Arroz
from . import api_v1_bp
from app.auth import requires_auth
from app import db

@api_v1_bp.route('/rices', methods=['GET', 'POST', 'OPTIONS'])
@requires_auth
def manage_rices():
    if request.method == 'GET':
        arroces = Arroz.query.filter_by(deleted_at=None).all()
        result = []
        for arroz in arroces:
            result.append({
                "id": arroz.id,
                "nombre": arroz.nombre,
                "precio": float(arroz.precio) if arroz.precio else 0.0,
                "caldo": arroz.caldo,
                "disponible": arroz.disponible
            })
        return jsonify(result), 200

    if request.method == 'POST':
        data = request.get_json()
        if not data or 'nombre' not in data or 'precio' not in data:
            return jsonify({"error": "Faltan datos obligatorios"}), 400
        
        new_arroz = Arroz(
            nombre=data['nombre'],
            precio=data['precio'],
            caldo=data.get('caldo', ''),
            disponible=data.get('disponible', True)
        )
        db.session.add(new_arroz)
        db.session.commit()
        return jsonify({"id": new_arroz.id, "message": "Arroz creado correctamente"}), 201

@api_v1_bp.route('/rices/<int:id>', methods=['GET', 'PUT', 'DELETE', 'OPTIONS'])
@requires_auth
def rice_detail(id):
    arroz = Arroz.query.get_or_404(id)
    
    if request.method == 'GET':
        return jsonify({
            "id": arroz.id,
            "nombre": arroz.nombre,
            "precio": float(arroz.precio),
            "caldo": arroz.caldo,
            "disponible": arroz.disponible
        }), 200

    if request.method == 'PUT':
        data = request.get_json()
        if 'nombre' in data: arroz.nombre = data['nombre']
        if 'precio' in data: arroz.precio = data['precio']
        if 'caldo' in data: arroz.caldo = data['caldo']
        if 'disponible' in data: arroz.disponible = data['disponible']
        
        db.session.commit()
        return jsonify({"message": "Arroz actualizado correctamente"}), 200

    if request.method == 'DELETE':
        # Soft delete instead of hard delete
        arroz.disponible = False
        db.session.commit()
        return jsonify({"message": "Arroz marcado como no disponible"}), 200
