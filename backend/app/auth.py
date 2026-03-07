from functools import wraps
from flask import request, jsonify
import firebase_admin
from firebase_admin import credentials, auth
import os


def init_firebase():
    if firebase_admin._apps:
        return
    creds_path = os.environ.get('FIREBASE_CREDENTIALS_PATH')
    project_id = os.environ.get('VITE_FIREBASE_PROJECT_ID')

    if creds_path and os.path.exists(creds_path):
        cred = credentials.Certificate(creds_path)
        firebase_admin.initialize_app(cred)
    elif project_id:
        firebase_admin.initialize_app(options={'projectId': project_id})
    else:
        firebase_admin.initialize_app()


from app.models import Usuario
from flask import g

def requires_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == 'OPTIONS':
            return jsonify({}), 200

        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Unauthorized. Bearer token required"}), 401

        token = auth_header.split(' ')[1]

        try:
            decoded_token = auth.verify_id_token(token)
            email = decoded_token.get('email')
            
            if not email:
                return jsonify({"error": "Token missing email"}), 401

            # Lookup user in database
            db_user = Usuario.query.filter_by(username=email, activo=True).first()
            if not db_user:
                # Optional: Handle auto-creation or just reject
                # For now, we reject if not in DB to enforce RBAC
                return jsonify({"error": f"User {email} not registered in application database"}), 403

            # Inject user data into requests
            request.user = {
                "uid": decoded_token.get('uid'),
                "email": email,
                "rol": db_user.rol,
                "id": db_user.id
            }
            
            # Store in 'g' for logger
            g.firebase_uid = email
            
        except Exception as e:
            from app.utils.logger import logger
            logger.warning(f"Auth failed. Invalid token: {str(e)} - IP: {request.remote_addr}")
            return jsonify({"error": f"Invalid or expired token: {str(e)}"}), 401

        return f(*args, **kwargs)

    return decorated

def requires_role(roles):
    """
    Decorator to restrict access based on user role.
    Usage: @requires_role(['admin', 'gerente'])
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(request, 'user') or request.user.get('rol') not in roles:
                return jsonify({"error": "Permission denied. Insufficient role"}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator
