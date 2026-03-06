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
            request.user = decoded_token
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({"error": f"Invalid or expired token: {str(e)}"}), 401

    return decorated
