from flask import jsonify, request
from . import api_v1_bp
from app.auth import requires_auth

@api_v1_bp.route('/auth/me', methods=['GET', 'OPTIONS'])
@requires_auth
def get_current_user():
    """
    Returns the current user profile and role.
    This is called by the frontend after Firebase login to sync the role.
    """
    if not hasattr(request, 'user'):
        return jsonify({"error": "No user found in request"}), 401
        
    return jsonify(request.user), 200
