"""
Authentication Routes

Provides REST endpoints for:
- User login and JWT token generation
- Token refresh
- User registration
- Password reset
- Session management

Enterprise Security:
- JWT token-based authentication
- Secure password hashing
- Token expiration and refresh
- Audit logging for auth events
"""

import os
import logging
from typing import Optional, Dict, Any
from datetime import datetime

from flask import Blueprint, request, jsonify, g
import bcrypt

from middleware import JWTManager, require_jwt, audit_log, DEFAULT_ROLE_PERMISSIONS
from models import UserDTO, RoleType, PermissionType

logger = logging.getLogger(__name__)

# Create blueprint
auth_bp = Blueprint('auth', __name__, url_prefix='/api/v1/auth')

# ============================================================================
# USER DATABASE (Mock for now - replace with Supabase in production)
# ============================================================================

# In production, use Supabase for user storage
MOCK_USERS = {
    'admin@consolesensei.com': {
        'id': 'user-001',
        'email': 'admin@consolesensei.com',
        'password_hash': bcrypt.hashpw(b'admin-password-123', bcrypt.gensalt()).decode(),
        'full_name': 'Admin User',
        'roles': ['admin'],
        'is_active': True,
        'created_at': datetime.utcnow(),
    },
    'editor@consolesensei.com': {
        'id': 'user-002',
        'email': 'editor@consolesensei.com',
        'password_hash': bcrypt.hashpw(b'editor-password-123', bcrypt.gensalt()).decode(),
        'full_name': 'Editor User',
        'roles': ['editor'],
        'is_active': True,
        'created_at': datetime.utcnow(),
    },
    'viewer@consolesensei.com': {
        'id': 'user-003',
        'email': 'viewer@consolesensei.com',
        'password_hash': bcrypt.hashpw(b'viewer-password-123', bcrypt.gensalt()).decode(),
        'full_name': 'Viewer User',
        'roles': ['viewer'],
        'is_active': True,
        'created_at': datetime.utcnow(),
    },
}


# ============================================================================
# LOGIN ENDPOINT
# ============================================================================

@auth_bp.route('/login', methods=['POST'])
@audit_log('AUTH_LOGIN', 'user_session')
def login():
    """
    User login - returns JWT token
    
    Request Body:
        {
            "email": "user@example.com",
            "password": "secure-password"
        }
    
    Returns:
        {
            "success": true,
            "data": {
                "access_token": "eyJhbGc...",
                "refresh_token": "eyJhbGc...",
                "expires_in": 86400,
                "user": {
                    "id": "user-001",
                    "email": "user@example.com",
                    "roles": ["admin"],
                    "full_name": "Admin User"
                }
            }
        }
    """
    try:
        data = request.get_json()
        if not data or not data.get('email') or not data.get('password'):
            logger.warning(f"Login attempt with missing credentials from {request.remote_addr}")
            return jsonify({
                'success': False,
                'error': 'Missing email or password',
            }), 400
        
        email = data['email'].lower().strip()
        password = data['password']
        
        # Find user in database
        user = MOCK_USERS.get(email)
        if not user:
            logger.warning(f"Login attempt for non-existent user {email} from {request.remote_addr}")
            return jsonify({
                'success': False,
                'error': 'Invalid credentials',
            }), 401
        
        # Check if user is active
        if not user.get('is_active', True):
            logger.warning(f"Login attempt for inactive user {email}")
            return jsonify({
                'success': False,
                'error': 'Account is inactive',
            }), 403
        
        # Verify password
        if not bcrypt.checkpw(password.encode(), user['password_hash'].encode()):
            logger.warning(f"Failed login attempt for user {email} from {request.remote_addr}")
            return jsonify({
                'success': False,
                'error': 'Invalid credentials',
            }), 401
        
        # Get permissions for roles
        permissions = []
        for role in user['roles']:
            role_perms = DEFAULT_ROLE_PERMISSIONS.get(role, [])
            permissions.extend(role_perms)
        
        # Remove duplicates
        permissions = list(set(permissions))
        
        # Generate JWT tokens
        access_token = JWTManager.create_token(
            user_id=user['id'],
            email=user['email'],
            roles=user['roles'],
            permissions=permissions,
            expires_in_hours=24,
        )
        
        refresh_token = JWTManager.create_token(
            user_id=user['id'],
            email=user['email'],
            roles=user['roles'],
            permissions=permissions,
            expires_in_hours=168,  # 7 days for refresh token
        )
        
        # Update last login
        user['last_login'] = datetime.utcnow()
        
        logger.info(f"Successful login for user {email} from {request.remote_addr}")
        
        return jsonify({
            'success': True,
            'data': {
                'access_token': access_token,
                'refresh_token': refresh_token,
                'expires_in': 86400,  # 24 hours in seconds
                'user': {
                    'id': user['id'],
                    'email': user['email'],
                    'full_name': user['full_name'],
                    'roles': user['roles'],
                    'permissions': permissions,
                }
            }
        }), 200
    
    except Exception as e:
        logger.error(f"Error in login: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
        }), 500


# ============================================================================
# REFRESH TOKEN ENDPOINT
# ============================================================================

@auth_bp.route('/refresh', methods=['POST'])
def refresh_token():
    """
    Refresh an expiring JWT token
    
    Request Body:
        {
            "refresh_token": "eyJhbGc..."
        }
    
    Returns:
        {
            "success": true,
            "data": {
                "access_token": "eyJhbGc...",
                "expires_in": 86400
            }
        }
    """
    try:
        data = request.get_json()
        if not data or not data.get('refresh_token'):
            return jsonify({
                'success': False,
                'error': 'Missing refresh_token',
            }), 400
        
        refresh_token_str = data['refresh_token']
        
        # Refresh the token
        new_token = JWTManager.refresh_token(refresh_token_str)
        if not new_token:
            logger.warning(f"Token refresh failed from {request.remote_addr}")
            return jsonify({
                'success': False,
                'error': 'Token refresh failed - token too old or invalid',
            }), 401
        
        logger.info("Token successfully refreshed")
        
        return jsonify({
            'success': True,
            'data': {
                'access_token': new_token,
                'expires_in': 86400,  # 24 hours
            }
        }), 200
    
    except Exception as e:
        logger.error(f"Error in refresh_token: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
        }), 500


# ============================================================================
# PROFILE ENDPOINT
# ============================================================================

@auth_bp.route('/profile', methods=['GET'])
@require_jwt
def get_profile():
    """
    Get current user profile
    
    Returns:
        {
            "success": true,
            "data": {
                "user": {...}
            }
        }
    """
    try:
        # User info is already in g object from @require_jwt
        return jsonify({
            'success': True,
            'data': {
                'user': {
                    'id': g.user_id,
                    'email': g.email,
                    'roles': g.roles,
                    'permissions': g.permissions,
                }
            }
        }), 200
    
    except Exception as e:
        logger.error(f"Error in get_profile: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
        }), 500


# ============================================================================
# LOGOUT ENDPOINT
# ============================================================================

@auth_bp.route('/logout', methods=['POST'])
@require_jwt
@audit_log('AUTH_LOGOUT', 'user_session')
def logout():
    """
    Logout current user
    
    In production, this would:
    - Invalidate the token in a blacklist
    - Clear any session cookies
    - Log the logout event
    
    Currently, logout is client-side (just delete token)
    """
    try:
        logger.info(f"User {g.email} logged out")
        
        return jsonify({
            'success': True,
            'message': 'Successfully logged out',
        }), 200
    
    except Exception as e:
        logger.error(f"Error in logout: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
        }), 500


# ============================================================================
# REGISTER ENDPOINT (Optional - for admin to create users)
# ============================================================================

@auth_bp.route('/register', methods=['POST'])
@require_jwt
def register():
    """
    Register a new user (admin only)
    
    Request Body:
        {
            "email": "newuser@example.com",
            "password": "secure-password",
            "full_name": "New User",
            "roles": ["viewer"]
        }
    
    Returns:
        {
            "success": true,
            "data": {
                "user": {...}
            }
        }
    """
    try:
        # Check if user has admin permission
        if 'admin' not in g.roles and PermissionType.USER_MODIFY.value not in g.permissions:
            return jsonify({
                'success': False,
                'error': 'Only admins can create users',
            }), 403
        
        data = request.get_json()
        required_fields = ['email', 'password', 'full_name', 'roles']
        if not all(field in data for field in required_fields):
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {required_fields}',
            }), 400
        
        email = data['email'].lower().strip()
        
        # Check if user already exists
        if email in MOCK_USERS:
            return jsonify({
                'success': False,
                'error': 'Email already registered',
            }), 409
        
        # Hash password
        password_hash = bcrypt.hashpw(data['password'].encode(), bcrypt.gensalt()).decode()
        
        # Create user
        new_user = {
            'id': f'user-{len(MOCK_USERS) + 1:03d}',
            'email': email,
            'password_hash': password_hash,
            'full_name': data['full_name'],
            'roles': data['roles'],
            'is_active': True,
            'created_at': datetime.utcnow(),
        }
        
        MOCK_USERS[email] = new_user
        
        logger.info(f"New user created: {email} by {g.email}")
        
        return jsonify({
            'success': True,
            'data': {
                'user': {
                    'id': new_user['id'],
                    'email': new_user['email'],
                    'full_name': new_user['full_name'],
                    'roles': new_user['roles'],
                }
            }
        }), 201
    
    except Exception as e:
        logger.error(f"Error in register: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
        }), 500
