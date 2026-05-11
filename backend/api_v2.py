"""
Production-Grade Flask API Application
Integrates all services: AWS, LLM, Database, WebSocket, Real-time
"""

import logging
import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
from datetime import datetime

from config import get_config
from database import init_db, verify_connection, SessionLocal
from services.llm_provider import get_llm_router
from websocket_manager import get_connection_manager, get_event_broadcaster
from middleware import setup_middleware

# ============================================================================
# LOGGING SETUP
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# APPLICATION FACTORY
# ============================================================================

def create_app(config=None):
    """
    Application factory for Flask app
    
    Args:
        config: Configuration object (uses environment if None)
    
    Returns:
        Flask application instance
    """
    
    # Get configuration
    if config is None:
        config = get_config()
    
    # Create Flask app
    app = Flask(__name__)
    app.config.from_object(config)
    
    logger.info(f"Creating Flask app in {config.ENV} mode")
    
    # ────────────────────────────────────────────────────────────────────────
    # CORS SETUP
    # ────────────────────────────────────────────────────────────────────────
    
    CORS(app, resources={
        r"/api/*": {
            "origins": config.CORS_ORIGINS,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })
    logger.info(f"CORS configured for origins: {config.CORS_ORIGINS}")
    
    # ────────────────────────────────────────────────────────────────────────
    # WEBSOCKET SETUP
    # ────────────────────────────────────────────────────────────────────────
    
    socketio = SocketIO(
        app,
        cors_allowed_origins=config.CORS_ORIGINS,
        async_mode='threading',
        ping_timeout=config.WEBSOCKET_PING_TIMEOUT,
        ping_interval=config.WEBSOCKET_PING_INTERVAL,
    )
    logger.info("WebSocket configured")
    
    # ────────────────────────────────────────────────────────────────────────
    # DATABASE SETUP
    # ────────────────────────────────────────────────────────────────────────
    
    logger.info("Verifying database connection...")
    if not verify_connection():
        logger.error("Database connection failed!")
        raise RuntimeError("Cannot connect to database")
    
    logger.info("Initializing database tables...")
    if not init_db():
        logger.error("Database initialization failed!")
        raise RuntimeError("Cannot initialize database")
    
    logger.info("Database ready")
    
    # ────────────────────────────────────────────────────────────────────────
    # MIDDLEWARE SETUP
    # ────────────────────────────────────────────────────────────────────────
    
    setup_middleware(app)
    logger.info("Middleware configured")
    
    # ────────────────────────────────────────────────────────────────────────
    # SERVICE INITIALIZATION
    # ────────────────────────────────────────────────────────────────────────
    
    # Initialize LLM router
    try:
        llm_router = get_llm_router()
        providers = llm_router.get_available_providers()
        logger.info(f"LLM providers available: {providers}")
    except Exception as e:
        logger.warning(f"LLM router initialization warning: {str(e)}")
    
    # Initialize WebSocket manager
    try:
        connection_manager = get_connection_manager()
        event_broadcaster = get_event_broadcaster()
        logger.info("WebSocket manager initialized")
    except Exception as e:
        logger.warning(f"WebSocket manager initialization warning: {str(e)}")
    
    # ────────────────────────────────────────────────────────────────────────
    # ROUTE REGISTRATION
    # ────────────────────────────────────────────────────────────────────────
    
    # Health check
    @app.route("/health", methods=["GET"])
    def health_check():
        """Health check endpoint"""
        return jsonify({
            "status": "healthy",
            "service": "Console Sensei Cloud Ops API",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "2.0.0",
        }), 200
    
    # API info
    @app.route("/api/info", methods=["GET"])
    def api_info():
        """API information endpoint"""
        return jsonify({
            "name": "Console Sensei Cloud Ops API",
            "version": "2.0.0",
            "environment": config.ENV,
            "features": {
                "real_time_monitoring": config.FEATURE_REAL_TIME_MONITORING,
                "multi_llm": config.FEATURE_MULTI_LLM,
                "cost_forecasting": config.FEATURE_COST_FORECASTING,
                "anomaly_detection": config.FEATURE_ANOMALY_DETECTION,
                "security_hub": config.FEATURE_SECURITY_HUB,
                "cloudtrail": config.FEATURE_CLOUDTRAIL,
            },
            "timestamp": datetime.utcnow().isoformat(),
        }), 200
    
    # Register blueprints
    try:
        from routes.aws_resources_v2 import aws_bp
        app.register_blueprint(aws_bp)
        logger.info("AWS resources blueprint registered")
    except Exception as e:
        logger.error(f"Failed to register AWS blueprint: {str(e)}")
    
    # ────────────────────────────────────────────────────────────────────────
    # WEBSOCKET EVENTS
    # ────────────────────────────────────────────────────────────────────────
    
    @socketio.on('connect')
    def handle_connect(auth):
        """Handle WebSocket connection"""
        try:
            user_id = auth.get('user_id') if auth else None
            if not user_id:
                logger.warning("WebSocket connection without user_id")
                return False
            
            connection_manager = get_connection_manager()
            connection_id = connection_manager.connect(user_id, request.sid)
            logger.info(f"User {user_id} connected via WebSocket")
            
            return True
        except Exception as e:
            logger.error(f"WebSocket connection error: {str(e)}")
            return False
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle WebSocket disconnection"""
        try:
            connection_manager = get_connection_manager()
            # Find and disconnect user
            logger.info("WebSocket client disconnected")
        except Exception as e:
            logger.error(f"WebSocket disconnection error: {str(e)}")
    
    @socketio.on('ping')
    def handle_ping():
        """Handle ping message"""
        return {'status': 'pong', 'timestamp': datetime.utcnow().isoformat()}
    
    # ────────────────────────────────────────────────────────────────────────
    # ERROR HANDLERS
    # ────────────────────────────────────────────────────────────────────────
    
    @app.errorhandler(400)
    def bad_request(error):
        """Handle 400 errors"""
        return jsonify({
            "error": "Bad Request",
            "message": str(error),
            "timestamp": datetime.utcnow().isoformat(),
        }), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        """Handle 401 errors"""
        return jsonify({
            "error": "Unauthorized",
            "message": "Authentication required",
            "timestamp": datetime.utcnow().isoformat(),
        }), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        """Handle 403 errors"""
        return jsonify({
            "error": "Forbidden",
            "message": "Insufficient permissions",
            "timestamp": datetime.utcnow().isoformat(),
        }), 403
    
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 errors"""
        return jsonify({
            "error": "Not Found",
            "message": "Resource not found",
            "timestamp": datetime.utcnow().isoformat(),
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 errors"""
        logger.error(f"Internal server error: {str(error)}")
        return jsonify({
            "error": "Internal Server Error",
            "message": "An unexpected error occurred",
            "timestamp": datetime.utcnow().isoformat(),
        }), 500
    
    # ────────────────────────────────────────────────────────────────────────
    # SHUTDOWN HANDLERS
    # ────────────────────────────────────────────────────────────────────────
    
    @app.teardown_appcontext
    def shutdown_session(exception=None):
        """Clean up database session"""
        pass
    
    logger.info("Flask application created successfully")
    
    return app, socketio


# ============================================================================
# APPLICATION ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    # Create app
    app, socketio = create_app()
    
    # Run server
    logger.info("Starting Console Sensei Cloud Ops API Server...")
    socketio.run(
        app,
        host="0.0.0.0",
        port=5000,
        debug=app.config.get("DEBUG", False),
        use_reloader=False,
    )
