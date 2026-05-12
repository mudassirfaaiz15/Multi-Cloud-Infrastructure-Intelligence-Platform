"""
Flask application entry point for ConsoleSensei Cloud Ops.
Main application factory and blueprint registration.
"""

from flask import Flask, jsonify, request, g
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
from datetime import datetime
import uuid
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import blueprints
from routes.auth import auth_bp
from routes.aws_resources import aws_bp
from routes.activity_security import activity_bp
from routes.ai_routes import ai_bp

# Import middleware and models
from middleware import SecurityConfig, require_jwt
from models import APIResponse, RoleType, PermissionType
from websocket_manager import get_connection_manager, get_event_broadcaster


def create_app(config_name="development"):
    app = Flask(__name__)
    app.config.update(
        DEBUG=(config_name == "development"),
        TESTING=(config_name == "testing"),
        FLASK_ENV=config_name,
    )
    
    # Configure CORS
    cors_origins = ["http://localhost:5173", "http://localhost:3000", "http://localhost:80"]
    CORS(app, origins=cors_origins)
    
    # Initialize SocketIO with CORS configuration
    socketio = SocketIO(
        app,
        cors_allowed_origins=cors_origins,
        async_mode='threading',
        ping_timeout=60,
        ping_interval=25,
    )
    
    security = SecurityConfig()
    security.init_app(app)
    
    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(aws_bp, url_prefix="/api/v1/resources")
    app.register_blueprint(activity_bp, url_prefix="/api/v1")
    app.register_blueprint(ai_bp, url_prefix="/api/v1/ai")
    
    @app.before_request
    def before_request():
        g.correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
        g.start_time = datetime.utcnow()
        g.user_id = None
        g.roles = []
        g.permissions = []
    
    @app.after_request
    def after_request(response):
        response.headers["X-Correlation-ID"] = g.get("correlation_id", "")
        if hasattr(g, "start_time"):
            duration = (datetime.utcnow() - g.start_time).total_seconds() * 1000
            response.headers["X-Response-Time-MS"] = str(int(duration))
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        return response
    
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify(APIResponse(success=False, error="Bad Request", message=str(error), status=400).to_dict()), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify(APIResponse(success=False, error="Unauthorized", message="Authentication required", status=401).to_dict()), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        return jsonify(APIResponse(success=False, error="Forbidden", message="Permission denied", status=403).to_dict()), 403
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify(APIResponse(success=False, error="Not Found", message="Resource not found", status=404).to_dict()), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Internal error: {str(error)}")
        return jsonify(APIResponse(success=False, error="Internal Server Error", message="Unexpected error", status=500).to_dict()), 500
    
    @app.route("/health", methods=["GET"])
    def health_check():
        return jsonify({"status": "healthy", "timestamp": datetime.utcnow().isoformat(), "version": "2.0.0"}), 200
    
    @app.route("/api/v1/info", methods=["GET"])
    def api_info():
        return jsonify({"success": True, "message": "ConsoleSensei Cloud Ops API v1", "endpoints": {"health": "/health", "auth": "/api/v1/auth/login, /api/v1/auth/refresh", "resources": "/api/v1/resources/ec2, /rds, /lambda, /s3"}, "version": "2.0.0"}), 200
    
    @app.route("/api/v1/scan", methods=["POST"])
    def legacy_scan():
        return jsonify({"success": False, "error": "Legacy endpoint deprecated", "message": "Use new endpoints"}), 301
    
    # ========================================================================
    # WEBSOCKET EVENT HANDLERS
    # ========================================================================
    
    @socketio.on('connect')
    def handle_connect(auth):
        """Handle WebSocket connection."""
        user_id = g.get('user_id', f'anonymous-{uuid.uuid4()}')
        connection_manager = get_connection_manager()
        
        try:
            connection_id = connection_manager.connect(user_id, request.sid)
            logger.info(f"WebSocket connected: user={user_id}, connection={connection_id}")
            emit('connection_established', {'connection_id': connection_id, 'user_id': user_id})
        except Exception as e:
            logger.error(f"WebSocket connection error: {str(e)}")
            disconnect()
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle WebSocket disconnection."""
        user_id = g.get('user_id', 'unknown')
        connection_manager = get_connection_manager()
        connection_manager.disconnect(user_id, request.sid)
        logger.info(f"WebSocket disconnected: user={user_id}")
    
    @socketio.on('subscribe_resource_updates')
    def handle_subscribe_resources(data):
        """Subscribe to resource update events."""
        user_id = g.get('user_id', 'unknown')
        room = f"resources-{user_id}"
        join_room(room)
        emit('subscribed', {'channel': 'resource_updates'})
        logger.info(f"User {user_id} subscribed to resource updates")
    
    @socketio.on('subscribe_cost_updates')
    def handle_subscribe_costs(data):
        """Subscribe to cost update events."""
        user_id = g.get('user_id', 'unknown')
        room = f"costs-{user_id}"
        join_room(room)
        emit('subscribed', {'channel': 'cost_updates'})
        logger.info(f"User {user_id} subscribed to cost updates")
    
    @socketio.on('subscribe_anomalies')
    def handle_subscribe_anomalies(data):
        """Subscribe to anomaly detection events."""
        user_id = g.get('user_id', 'unknown')
        room = f"anomalies-{user_id}"
        join_room(room)
        emit('subscribed', {'channel': 'anomaly_alerts'})
        logger.info(f"User {user_id} subscribed to anomaly alerts")
    
    @socketio.on('subscribe_security')
    def handle_subscribe_security(data):
        """Subscribe to security finding events."""
        user_id = g.get('user_id', 'unknown')
        room = f"security-{user_id}"
        join_room(room)
        emit('subscribed', {'channel': 'security_alerts'})
        logger.info(f"User {user_id} subscribed to security alerts")
    
    @socketio.on('ping')
    def handle_ping():
        """Respond to ping for connection health check."""
        emit('pong', {'timestamp': datetime.utcnow().isoformat()})
    
    return app, socketio


if __name__ == "__main__":
    app, socketio = create_app("development")
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)