"""
Production-Grade Authentication Routes
Real database integration with JWT tokens
"""

from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timedelta
import jwt
import bcrypt
import logging
from typing import Dict, Any, Optional, Tuple

from database import SessionLocal
from db_models import User, Session as UserSession

logger = logging.getLogger(__name__)

# Create blueprint
auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def hash_password(password: str) -> str:
    """Hash password with bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))


def create_jwt_token(user_id: str, expires_in_hours: int = 24) -> str:
    """Create JWT token"""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(hours=expires_in_hours),
        'iat': datetime.utcnow(),
    }
    return jwt.encode(
        payload,
        current_app.config['JWT_SECRET_KEY'],
        algorithm='HS256'
    )


def verify_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify JWT token"""
    try:
        payload = jwt.decode(
            token,
            current_app.config['JWT_SECRET_KEY'],
            algorithms=['HS256']
        )
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {str(e)}")
        return None


def get_user_from_token(token: str) -> Optional[User]:
    """Get user from JWT token"""
    payload = verify_jwt_token(token)
    if not payload:
        return None
    
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == payload['user_id']).first()
        return user
    finally:
        db.close()


# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Register new user
    
    Request:
        {
            "email": "user@example.com",
            "password": "secure_password",
            "full_name": "John Doe"
        }
    
    Response:
        {
            "success": true,
            "user": {...},
            "token": "jwt_token"
        }
    """
    try:
        data = request.get_json()
        
        # Validate input
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        email = data.get("email", "").strip()
        password = data.get("password", "").strip()
        full_name = data.get("full_name", "").strip()
        
        if not email or not password or not full_name:
            return jsonify({"error": "Missing required fields"}), 400
        
        if len(password) < 8:
            return jsonify({"error": "Password must be at least 8 characters"}), 400
        
        db = SessionLocal()
        try:
            # Check if user exists
            existing_user = db.query(User).filter(User.email == email).first()
            if existing_user:
                return jsonify({"error": "User already exists"}), 409
            
            # Create new user
            user = User(
                email=email,
                password_hash=hash_password(password),
                full_name=full_name,
                role="viewer",  # Default role
                is_active=True,
            )
            
            db.add(user)
            db.commit()
            db.refresh(user)
            
            # Create JWT token
            token = create_jwt_token(str(user.id))
            
            logger.info(f"User registered: {email}")
            
            return jsonify({
                "success": True,
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role,
                },
                "token": token,
                "expires_in": current_app.config['JWT_EXPIRATION_HOURS'] * 3600,
            }), 201
        
        finally:
            db.close()
    
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return jsonify({"error": "Registration failed"}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Login user
    
    Request:
        {
            "email": "user@example.com",
            "password": "secure_password"
        }
    
    Response:
        {
            "success": true,
            "user": {...},
            "token": "jwt_token"
        }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        email = data.get("email", "").strip()
        password = data.get("password", "").strip()
        
        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400
        
        db = SessionLocal()
        try:
            # Find user
            user = db.query(User).filter(User.email == email).first()
            
            if not user or not verify_password(password, user.password_hash):
                logger.warning(f"Failed login attempt for: {email}")
                return jsonify({"error": "Invalid credentials"}), 401
            
            if not user.is_active:
                return jsonify({"error": "User account is inactive"}), 403
            
            # Update last login
            user.last_login_at = datetime.utcnow()
            db.commit()
            
            # Create JWT token
            token = create_jwt_token(str(user.id))
            
            logger.info(f"User logged in: {email}")
            
            return jsonify({
                "success": True,
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role,
                },
                "token": token,
                "expires_in": current_app.config['JWT_EXPIRATION_HOURS'] * 3600,
            }), 200
        
        finally:
            db.close()
    
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({"error": "Login failed"}), 500


@auth_bp.route("/verify", methods=["GET"])
def verify():
    """
    Verify JWT token
    
    Headers:
        Authorization: Bearer <token>
    
    Response:
        {
            "valid": true,
            "user": {...}
        }
    """
    try:
        # Get token from header
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid authorization header"}), 401
        
        token = auth_header[7:]  # Remove "Bearer " prefix
        
        # Verify token
        user = get_user_from_token(token)
        if not user:
            return jsonify({"error": "Invalid or expired token"}), 401
        
        return jsonify({
            "valid": True,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
            },
        }), 200
    
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        return jsonify({"error": "Verification failed"}), 500


@auth_bp.route("/refresh", methods=["POST"])
def refresh():
    """
    Refresh JWT token
    
    Headers:
        Authorization: Bearer <token>
    
    Response:
        {
            "token": "new_jwt_token"
        }
    """
    try:
        # Get token from header
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid authorization header"}), 401
        
        token = auth_header[7:]
        
        # Verify token
        user = get_user_from_token(token)
        if not user:
            return jsonify({"error": "Invalid or expired token"}), 401
        
        # Create new token
        new_token = create_jwt_token(str(user.id))
        
        logger.info(f"Token refreshed for user: {user.email}")
        
        return jsonify({
            "token": new_token,
            "expires_in": current_app.config['JWT_EXPIRATION_HOURS'] * 3600,
        }), 200
    
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        return jsonify({"error": "Refresh failed"}), 500


@auth_bp.route("/logout", methods=["POST"])
def logout():
    """
    Logout user
    
    Headers:
        Authorization: Bearer <token>
    
    Response:
        {
            "success": true
        }
    """
    try:
        # Get token from header
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid authorization header"}), 401
        
        token = auth_header[7:]
        
        # Verify token
        user = get_user_from_token(token)
        if not user:
            return jsonify({"error": "Invalid or expired token"}), 401
        
        logger.info(f"User logged out: {user.email}")
        
        return jsonify({"success": True}), 200
    
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return jsonify({"error": "Logout failed"}), 500


@auth_bp.route("/me", methods=["GET"])
def get_current_user():
    """
    Get current user profile
    
    Headers:
        Authorization: Bearer <token>
    
    Response:
        {
            "user": {...}
        }
    """
    try:
        # Get token from header
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid authorization header"}), 401
        
        token = auth_header[7:]
        
        # Verify token
        user = get_user_from_token(token)
        if not user:
            return jsonify({"error": "Invalid or expired token"}), 401
        
        return jsonify({
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat(),
                "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
            },
        }), 200
    
    except Exception as e:
        logger.error(f"Get user error: {str(e)}")
        return jsonify({"error": "Failed to get user"}), 500
