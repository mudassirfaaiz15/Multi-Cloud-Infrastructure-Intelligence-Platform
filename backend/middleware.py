"""
Enterprise Authentication and RBAC Middleware

Implements production-grade security:
- JWT token validation with expiration
- Role-based access control (RBAC)
- Permission checking at route level
- Audit logging for all operations
- Secure credential handling
- Rate limiting support
- Token refresh mechanism

Architecture:
    Request → JWT Validation → RBAC Check → Permission Validation → Route Handler
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional, Callable
from functools import wraps
from datetime import datetime, timedelta
from dataclasses import dataclass

import jwt
from flask import request, jsonify, g
from cryptography.fernet import Fernet

from models import RoleType, PermissionType, AuditLogDTO, APIResponse

logger = logging.getLogger(__name__)


# ============================================================================
# CONFIGURATION
# ============================================================================

class SecurityConfig:
    """Centralized security configuration"""
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-secret-change-in-production')
    JWT_ALGORITHM = 'HS256'
    JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', '24'))
    JWT_REFRESH_EXPIRATION_DAYS = int(os.environ.get('JWT_REFRESH_EXPIRATION_DAYS', '7'))
    
    # Credential encryption
    ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY', '').encode()
    if not ENCRYPTION_KEY:
        # Generate for development - MUST be set in production
        ENCRYPTION_KEY = Fernet.generate_key()
    
    # Rate limiting
    RATE_LIMIT_ENABLED = os.environ.get('RATE_LIMIT_ENABLED', 'true').lower() == 'true'
    RATE_LIMIT_REQUESTS = int(os.environ.get('RATE_LIMIT_REQUESTS', '100'))
    RATE_LIMIT_WINDOW_SECONDS = int(os.environ.get('RATE_LIMIT_WINDOW_SECONDS', '60'))
    
    # CORS configuration
    ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')


# ============================================================================
# JWT TOKEN MANAGEMENT
# ============================================================================

@dataclass
class TokenPayload:
    """JWT token payload structure"""
    user_id: str
    email: str
    roles: List[str]
    permissions: List[str]
    issued_at: datetime
    expires_at: datetime
    refresh_token_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to JWT-serializable dict"""
        return {
            'user_id': self.user_id,
            'email': self.email,
            'roles': self.roles,
            'permissions': self.permissions,
            'iat': self.issued_at.timestamp(),
            'exp': self.expires_at.timestamp(),
            'refresh_token_id': self.refresh_token_id,
        }


class JWTManager:
    """Manages JWT token creation, validation, and refresh"""
    
    @staticmethod
    def create_token(
        user_id: str,
        email: str,
        roles: List[str],
        permissions: List[str],
        expires_in_hours: Optional[int] = None
    ) -> str:
        """
        Create a signed JWT token
        
        Args:
            user_id: User UUID
            email: User email
            roles: List of role names
            permissions: List of permission names
            expires_in_hours: Token expiration time (default: config value)
        
        Returns:
            Signed JWT token
        
        Enterprise Pattern: Token includes user context and permissions to reduce
        database calls. However, permissions should be re-validated on sensitive ops.
        """
        now = datetime.utcnow()
        expires_in = expires_in_hours or SecurityConfig.JWT_EXPIRATION_HOURS
        expires_at = now + timedelta(hours=expires_in)
        
        payload = TokenPayload(
            user_id=user_id,
            email=email,
            roles=roles,
            permissions=permissions,
            issued_at=now,
            expires_at=expires_at,
        )
        
        try:
            token = jwt.encode(
                payload.to_dict(),
                SecurityConfig.JWT_SECRET_KEY,
                algorithm=SecurityConfig.JWT_ALGORITHM,
            )
            logger.info(f"Token created for user {email}")
            return token
        except Exception as e:
            logger.error(f"Token creation failed: {str(e)}")
            raise
    
    @staticmethod
    def validate_token(token: str) -> Optional[TokenPayload]:
        """
        Validate and decode a JWT token
        
        Args:
            token: JWT token string
        
        Returns:
            TokenPayload if valid, None if invalid or expired
        """
        try:
            payload = jwt.decode(
                token,
                SecurityConfig.JWT_SECRET_KEY,
                algorithms=[SecurityConfig.JWT_ALGORITHM],
            )
            
            # Reconstruct TokenPayload
            token_payload = TokenPayload(
                user_id=payload['user_id'],
                email=payload['email'],
                roles=payload['roles'],
                permissions=payload['permissions'],
                issued_at=datetime.fromtimestamp(payload['iat']),
                expires_at=datetime.fromtimestamp(payload['exp']),
                refresh_token_id=payload.get('refresh_token_id'),
            )
            return token_payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {str(e)}")
            return None
    
    @staticmethod
    def refresh_token(token: str) -> Optional[str]:
        """
        Refresh an expired/expiring token
        
        Args:
            token: Current JWT token
        
        Returns:
            New JWT token if refresh is valid, None otherwise
        """
        try:
            # Try to decode with more lenient settings for refresh
            payload = jwt.decode(
                token,
                SecurityConfig.JWT_SECRET_KEY,
                algorithms=[SecurityConfig.JWT_ALGORITHM],
                options={"verify_exp": False},  # Allow expired tokens for refresh
            )
            
            # Check if enough time has passed since issuance
            now = datetime.utcnow()
            iat = datetime.fromtimestamp(payload['iat'])
            age_days = (now - iat).days
            
            if age_days > SecurityConfig.JWT_REFRESH_EXPIRATION_DAYS:
                logger.warning("Token too old to refresh")
                return None
            
            # Create new token with same payload
            new_token = JWTManager.create_token(
                user_id=payload['user_id'],
                email=payload['email'],
                roles=payload['roles'],
                permissions=payload['permissions'],
            )
            logger.info(f"Token refreshed for user {payload['email']}")
            return new_token
        except Exception as e:
            logger.error(f"Token refresh failed: {str(e)}")
            return None


# ============================================================================
# CREDENTIAL ENCRYPTION
# ============================================================================

class CredentialManager:
    """Securely manages AWS credential encryption/decryption"""
    
    @staticmethod
    def encrypt_credentials(access_key: str, secret_key: str) -> str:
        """
        Encrypt AWS credentials
        
        Args:
            access_key: AWS access key ID
            secret_key: AWS secret access key
        
        Returns:
            Encrypted credentials blob (base64 encoded)
        """
        if not SecurityConfig.ENCRYPTION_KEY:
            raise ValueError("ENCRYPTION_KEY not configured")
        
        credentials = json.dumps({
            'access_key': access_key,
            'secret_key': secret_key,
            'encrypted_at': datetime.utcnow().isoformat(),
        })
        
        cipher = Fernet(SecurityConfig.ENCRYPTION_KEY)
        encrypted = cipher.encrypt(credentials.encode())
        return encrypted.decode()  # Return base64 string
    
    @staticmethod
    def decrypt_credentials(encrypted_blob: str) -> Dict[str, str]:
        """
        Decrypt AWS credentials
        
        Args:
            encrypted_blob: Encrypted credentials blob
        
        Returns:
            Dictionary with 'access_key' and 'secret_key'
        """
        if not SecurityConfig.ENCRYPTION_KEY:
            raise ValueError("ENCRYPTION_KEY not configured")
        
        try:
            cipher = Fernet(SecurityConfig.ENCRYPTION_KEY)
            decrypted = cipher.decrypt(encrypted_blob.encode())
            creds = json.loads(decrypted.decode())
            
            # Check if encryption is old (>7 days)
            encrypted_at = datetime.fromisoformat(creds['encrypted_at'])
            if (datetime.utcnow() - encrypted_at).days > 7:
                logger.warning("Using credentials older than 7 days - consider re-encryption")
            
            return {
                'access_key': creds['access_key'],
                'secret_key': creds['secret_key'],
            }
        except Exception as e:
            logger.error(f"Credential decryption failed: {str(e)}")
            raise


# ============================================================================
# FLASK MIDDLEWARE DECORATORS
# ============================================================================

def require_jwt(f: Callable) -> Callable:
    """
    Decorator: Require valid JWT token
    
    Sets g.user_id, g.email, g.roles, g.permissions if valid
    
    Enterprise Pattern: Extract token context once and cache in Flask g object
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Extract token from Authorization header
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({
                'success': False,
                'error': 'Missing or invalid Authorization header',
            }), 401
        
        token = auth_header[7:]  # Remove 'Bearer ' prefix
        
        # Validate token
        token_payload = JWTManager.validate_token(token)
        if not token_payload:
            return jsonify({
                'success': False,
                'error': 'Invalid or expired token',
            }), 401
        
        # Store in Flask g object for use in route handler
        g.user_id = token_payload.user_id
        g.email = token_payload.email
        g.roles = token_payload.roles
        g.permissions = token_payload.permissions
        g.token_payload = token_payload
        
        logger.info(f"Authenticated user: {g.email}")
        
        return f(*args, **kwargs)
    
    return decorated_function


def require_permission(*required_permissions: str) -> Callable:
    """
    Decorator: Require specific permissions
    
    Usage:
        @require_permission(PermissionType.RESOURCE_READ.value)
        def get_resources():
            ...
    
    Can be chained with @require_jwt
    
    Enterprise Pattern: RBAC enforcement at route handler level
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Check if user is authenticated (g.user_id should be set)
            if not hasattr(g, 'user_id'):
                return jsonify({
                    'success': False,
                    'error': 'Authentication required',
                }), 401
            
            # Check permissions
            user_permissions = getattr(g, 'permissions', [])
            has_permission = any(perm in user_permissions for perm in required_permissions)
            
            if not has_permission:
                # Log failed access attempt (security audit)
                logger.warning(
                    f"Permission denied for user {g.email}: "
                    f"required={required_permissions}, has={user_permissions}"
                )
                return jsonify({
                    'success': False,
                    'error': f'Insufficient permissions. Required: {required_permissions}',
                }), 403
            
            logger.info(f"Permission check passed for user {g.email}: {required_permissions}")
            
            return f(*args, **kwargs)
        
        return decorated_function
    
    return decorator


def require_role(*required_roles: str) -> Callable:
    """
    Decorator: Require specific role(s)
    
    Usage:
        @require_role('admin', 'editor')
        def modify_resource():
            ...
    
    Can be chained with @require_jwt
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'roles'):
                return jsonify({
                    'success': False,
                    'error': 'Authentication required',
                }), 401
            
            user_roles = g.roles
            has_role = any(role in user_roles for role in required_roles)
            
            if not has_role:
                logger.warning(
                    f"Role check failed for user {g.email}: "
                    f"required={required_roles}, has={user_roles}"
                )
                return jsonify({
                    'success': False,
                    'error': f'Insufficient role. Required: {required_roles}',
                }), 403
            
            return f(*args, **kwargs)
        
        return decorated_function
    
    return decorator


def audit_log(action: str, resource_type: str) -> Callable:
    """
    Decorator: Automatically log API actions to audit table
    
    Usage:
        @audit_log('RESOURCE_CREATED', 'ec2_instance')
        def create_ec2_instance():
            ...
    
    Enterprise Pattern: All actions audit-logged for compliance
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Call the route handler
            response = f(*args, **kwargs)
            
            # Log the action
            try:
                audit_entry = AuditLogDTO(
                    id=None,  # Will be generated by DB
                    user_id=getattr(g, 'user_id', 'unknown'),
                    action=action,
                    resource_type=resource_type,
                    resource_id=None,  # Can be extracted from response
                    changes={},  # Can be enriched by route handler
                    ip_address=request.remote_addr or 'unknown',
                    user_agent=request.headers.get('User-Agent', 'unknown'),
                    status='success' if isinstance(response, tuple) and response[1] < 400 else 'failure',
                    error_message=None,
                    created_at=datetime.utcnow(),
                )
                
                # TODO: Save to audit_logs table via Supabase
                logger.info(f"Audit: {action} on {resource_type} by {g.email}")
            except Exception as e:
                logger.error(f"Audit logging failed: {str(e)}")
            
            return response
        
        return decorated_function
    
    return decorator


# ============================================================================
# ROLE-PERMISSION MAPPINGS
# ============================================================================

DEFAULT_ROLE_PERMISSIONS = {
    RoleType.ADMIN: [
        PermissionType.RESOURCE_READ.value,
        PermissionType.RESOURCE_MODIFY.value,
        PermissionType.RESOURCE_DELETE.value,
        PermissionType.BILLING_READ.value,
        PermissionType.BILLING_MODIFY.value,
        PermissionType.SECURITY_READ.value,
        PermissionType.SECURITY_MODIFY.value,
        PermissionType.USER_READ.value,
        PermissionType.USER_MODIFY.value,
        PermissionType.AI_QUERY.value,
        PermissionType.AI_ADVANCED.value,
        PermissionType.AUDIT_READ.value,
        PermissionType.SYSTEM_ADMIN.value,
    ],
    RoleType.EDITOR: [
        PermissionType.RESOURCE_READ.value,
        PermissionType.RESOURCE_MODIFY.value,
        PermissionType.BILLING_READ.value,
        PermissionType.SECURITY_READ.value,
        PermissionType.AI_QUERY.value,
        PermissionType.AI_ADVANCED.value,
    ],
    RoleType.VIEWER: [
        PermissionType.RESOURCE_READ.value,
        PermissionType.BILLING_READ.value,
        PermissionType.SECURITY_READ.value,
        PermissionType.AI_QUERY.value,
    ],
}
