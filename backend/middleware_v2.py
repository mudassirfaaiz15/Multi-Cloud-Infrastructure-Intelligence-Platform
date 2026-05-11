"""
Production-Grade Middleware
Authentication, rate limiting, logging, error handling
"""

import logging
import jwt
from functools import wraps
from datetime import datetime
from typing import Callable, Optional, Dict, Any
from flask import request, jsonify, current_app
from database import SessionLocal
from db_models import User, AuditLog

logger = logging.getLogger(__name__)

# ============================================================================
# AUTHENTICATION MIDDLEWARE
# ============================================================================

def require_auth(f: Callable) -> Callable:
    """
    Decorator: Require JWT authentication
    
    Usage:
        @app.route("/protected")
        @require_auth
        def protected_route():
            pass
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Get token from header
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                return jsonify({"error": "Missing or invalid authorization header"}), 401
            
            token = auth_header[7:]  # Remove "Bearer " prefix
            
            # Verify token
            try:
                payload = jwt.decode(
                    token,
                    current_app.config['JWT_SECRET_KEY'],
                    algorithms=['HS256']
                )
            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Token expired"}), 401
            except jwt.InvalidTokenError:
                return jsonify({"error": "Invalid token"}), 401
            
            # Get user from database
            db = SessionLocal()
            try:
                user = db.query(User).filter(User.id == payload['user_id']).first()
                if not user or not user.is_active:
                    return jsonify({"error": "User not found or inactive"}), 401
                
                # Store user in request context
                request.user = user
                request.user_id = str(user.id)
                
                return f(*args, **kwargs)
            finally:
                db.close()
        
        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            return jsonify({"error": "Authentication failed"}), 500
    
    return decorated_function


def require_role(role: str) -> Callable:
    """
    Decorator: Require specific role
    
    Usage:
        @app.route("/admin")
        @require_auth
        @require_role("admin")
        def admin_route():
            pass
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(request, 'user') or request.user.role != role:
                return jsonify({"error": "Insufficient permissions"}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator


# ============================================================================
# RATE LIMITING
# ============================================================================

class RateLimiter:
    """Simple in-memory rate limiter"""
    
    def __init__(self):
        self.requests: Dict[str, list] = {}
    
    def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> bool:
        """Check if request is allowed"""
        now = datetime.utcnow().timestamp()
        
        if key not in self.requests:
            self.requests[key] = []
        
        # Remove old requests outside window
        self.requests[key] = [
            req_time for req_time in self.requests[key]
            if now - req_time < window_seconds
        ]
        
        # Check limit
        if len(self.requests[key]) >= max_requests:
            return False
        
        # Add current request
        self.requests[key].append(now)
        return True


_rate_limiter = RateLimiter()


def rate_limit(calls: int = 100, period: int = 60) -> Callable:
    """
    Decorator: Rate limit endpoint
    
    Usage:
        @app.route("/api/data")
        @rate_limit(calls=100, period=60)
        def get_data():
            pass
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get client identifier
            client_id = request.remote_addr
            if hasattr(request, 'user_id'):
                client_id = f"user:{request.user_id}"
            
            # Check rate limit
            if not _rate_limiter.is_allowed(client_id, calls, period):
                return jsonify({
                    "error": "Rate limit exceeded",
                    "retry_after": period,
                }), 429
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


# ============================================================================
# AUDIT LOGGING
# ============================================================================

def audit_log(action: str, resource_type: str) -> Callable:
    """
    Decorator: Log action to audit trail
    
    Usage:
        @app.route("/api/resource", methods=["POST"])
        @require_auth
        @audit_log("CREATE", "resource")
        def create_resource():
            pass
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Execute function
                result = f(*args, **kwargs)
                
                # Log to audit trail
                if hasattr(request, 'user_id'):
                    db = SessionLocal()
                    try:
                        audit_entry = AuditLog(
                            user_id=request.user_id,
                            action=action,
                            resource_type=resource_type,
                            ip_address=request.remote_addr,
                            user_agent=request.headers.get('User-Agent', ''),
                            success=True,
                        )
                        db.add(audit_entry)
                        db.commit()
                    except Exception as e:
                        logger.warning(f"Failed to log audit entry: {str(e)}")
                    finally:
                        db.close()
                
                return result
            
            except Exception as e:
                # Log failed action
                if hasattr(request, 'user_id'):
                    db = SessionLocal()
                    try:
                        audit_entry = AuditLog(
                            user_id=request.user_id,
                            action=action,
                            resource_type=resource_type,
                            ip_address=request.remote_addr,
                            user_agent=request.headers.get('User-Agent', ''),
                            success=False,
                            error_message=str(e),
                        )
                        db.add(audit_entry)
                        db.commit()
                    except Exception as log_error:
                        logger.warning(f"Failed to log audit entry: {str(log_error)}")
                    finally:
                        db.close()
                
                raise
        
        return decorated_function
    return decorator


# ============================================================================
# REQUEST/RESPONSE LOGGING
# ============================================================================

def setup_middleware(app):
    """Setup all middleware for Flask app"""
    
    @app.before_request
    def log_request():
        """Log incoming request"""
        logger.debug(f"{request.method} {request.path} from {request.remote_addr}")
    
    @app.after_request
    def log_response(response):
        """Log outgoing response"""
        logger.debug(f"{request.method} {request.path} -> {response.status_code}")
        return response


# ============================================================================
# ERROR HANDLING
# ============================================================================

def handle_error(error: Exception) -> tuple:
    """Handle exceptions and return JSON response"""
    logger.error(f"Error: {str(error)}")
    
    return jsonify({
        "error": "Internal server error",
        "message": str(error),
        "timestamp": datetime.utcnow().isoformat(),
    }), 500
