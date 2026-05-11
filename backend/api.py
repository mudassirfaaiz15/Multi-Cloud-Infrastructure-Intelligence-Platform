"""
REST API Layer - Flask implementation
Provides endpoints for AWS resource scanning and management
"""

import os
import json
import logging
from typing import Dict, Any, Tuple
from functools import wraps
from datetime import datetime

from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt

from aws_resource_scanner import AWSResourceScanner, ScanResult
from resource_manager import ResourceActionExecutor, ActionType

# Multi-cloud service imports
try:
    from services.gcp_scanner import GCPResourceScanner
    from services.ai_usage_monitor import AIUsageMonitor
    from services.cost_engine import MultiCloudCostEngine
    from services.cost_forecasting import CostForecastingEngine
    from services.optimization_engine import ResourceOptimizationEngine
    from services.anomaly_detector import AnomalyDetector
    from services.nl_query_engine import NLQueryEngine
except ImportError as _e:
    logger_placeholder = logging.getLogger(__name__)
    logger_placeholder.warning(f"Some multi-cloud services could not be imported: {_e}")


# ============================================================================
# CONFIGURATION
# ============================================================================

app = Flask(__name__)
CORS(app)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['JWT_ALGORITHM'] = 'HS256'

logger = logging.getLogger(__name__)


# ============================================================================
# AUTHENTICATION & SECURITY
# ============================================================================

def require_api_key(f):
    """Decorator to require valid API key or JWT token"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None

        # Check for token in header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Invalid authorization header'}), 401

        if not token:
            # Check for API key
            api_key = request.headers.get('X-API-Key')
            if not api_key:
                return jsonify({'error': 'Missing authentication'}), 401

            # Validate API key (implement your validation logic)
            if not validate_api_key(api_key):
                return jsonify({'error': 'Invalid API key'}), 401
        else:
            # Validate JWT token
            try:
                jwt.decode(token, app.config['SECRET_KEY'], algorithms=[app.config['JWT_ALGORITHM']])
            except jwt.InvalidTokenError:
                return jsonify({'error': 'Invalid token'}), 401

        return f(*args, **kwargs)

    return decorated_function


def validate_api_key(api_key: str) -> bool:
    """
    Validate API key
    Implement your API key validation logic here
    """
    valid_keys = os.environ.get('VALID_API_KEYS', '').split(',')
    return api_key in valid_keys


def extract_credentials_from_request() -> Tuple[str, str]:
    """Extract AWS credentials from request"""
    data = request.get_json() or {}

    access_key = data.get('access_key_id') or request.headers.get('X-AWS-Access-Key')
    secret_key = data.get('secret_access_key') or request.headers.get('X-AWS-Secret-Key')

    if not access_key or not secret_key:
        raise ValueError("AWS credentials missing from request")

    return access_key, secret_key


# ============================================================================
# ENDPOINTS
# ============================================================================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'AWS Resource Tracker',
        'version': '1.0.0',
    }), 200


@app.route('/api/v1/scan', methods=['POST'])
@require_api_key
def scan_resources():
    """
    Scan AWS resources across all regions
    
    Request body:
    {
        "access_key_id": "YOUR_ACCESS_KEY",
        "secret_access_key": "YOUR_SECRET_KEY",
        "max_workers": 5  (optional, default 5)
    }
    
    Response:
    {
        "success": true,
        "timestamp": "2024-01-01T12:00:00",
        "regions_scanned": [...],
        "resources": [...],
        "summary": {...},
        "cost_summary": {...},
        "errors": [...]
    }
    """
    try:
        # Extract credentials
        access_key, secret_key = extract_credentials_from_request()

        # Get optional parameters
        data = request.get_json() or {}
        max_workers = int(data.get('max_workers', 5))

        # Initialize scanner
        scanner = AWSResourceScanner(access_key, secret_key)

        # Perform scan
        result = scanner.scan(max_workers=max_workers)

        # Cleanup
        scanner.cleanup()

        # Return result
        return jsonify({
            'success': True,
            'data': result.to_dict(),
        }), 200

    except ValueError as e:
        logger.warning(f"Invalid request: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
        }), 400

    except Exception as e:
        logger.error(f"Scan error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error during scan',
            'details': str(e) if os.environ.get('DEBUG') else None,
        }), 500


@app.route('/api/v1/resources', methods=['GET'])
@require_api_key
def get_resources():
    """
    Get scanned resources (requires previous scan result in cache)
    
    Query parameters:
    - resource_type: Filter by resource type
    - region: Filter by region
    - state: Filter by state
    """
    try:
        # This would typically retrieve from cache/database
        # For now, returning instruction to use /scan endpoint
        return jsonify({
            'message': 'Please use POST /api/v1/scan to scan resources',
            'docs': '/api/v1/docs',
        }), 200

    except Exception as e:
        logger.error(f"Error retrieving resources: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve resources',
        }), 500


@app.route('/api/v1/resources/filter', methods=['POST'])
@require_api_key
def filter_resources():
    """
    Filter resources from scan result
    
    Request body:
    {
        "resources": [...],  // Result from /scan endpoint
        "filters": {
            "resource_type": "EC2_Instance",
            "region": "us-east-1",
            "state": "running",
            "tags": {"Environment": "production"}
        }
    }
    """
    try:
        data = request.get_json() or {}
        resources = data.get('resources', [])
        filters = data.get('filters', {})

        filtered = resources

        # Apply filters
        if 'resource_type' in filters:
            filtered = [r for r in filtered if r.get('resource_type') == filters['resource_type']]

        if 'region' in filters:
            filtered = [r for r in filtered if r.get('region') == filters['region']]

        if 'state' in filters:
            filtered = [r for r in filtered if r.get('state') == filters['state']]

        if 'tags' in filters:
            tag_filters = filters['tags']
            filtered = [
                r for r in filtered
                if all(r.get('tags', {}).get(k) == v for k, v in tag_filters.items())
            ]

        return jsonify({
            'success': True,
            'total': len(filtered),
            'resources': filtered,
        }), 200

    except Exception as e:
        logger.error(f"Filtering error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to filter resources',
        }), 500


@app.route('/api/v1/resources/action', methods=['POST'])
@require_api_key
def perform_resource_action():
    """
    Perform action on resource (stop/delete)
    
    Request body:
    {
        "access_key_id": "YOUR_ACCESS_KEY",
        "secret_access_key": "YOUR_SECRET_KEY",
        "resource_id": "i-1234567890abcdef0",
        "resource_type": "EC2_Instance",
        "region": "us-east-1",
        "action": "stop"  // or "delete"
    }
    
    Response:
    {
        "success": true,
        "resource_id": "...",
        "action": "stop",
        "message": "...",
        "verification_status": "verified"
    }
    """
    try:
        # Extract credentials
        access_key, secret_key = extract_credentials_from_request()

        data = request.get_json() or {}
        resource_id = data.get('resource_id')
        resource_type = data.get('resource_type')
        region = data.get('region')
        action_str = data.get('action', '').lower()

        # Validate request
        if not all([resource_id, resource_type, region, action_str]):
            return jsonify({
                'success': False,
                'error': 'Missing required fields: resource_id, resource_type, region, action',
            }), 400

        # Convert action string to enum
        try:
            action = ActionType[action_str.upper()]
        except KeyError:
            return jsonify({
                'success': False,
                'error': f'Invalid action. Supported: {", ".join([a.value for a in ActionType])}',
            }), 400

        # Import session manager here to avoid circular imports
        from aws_resource_scanner import AWSSessionManager

        # Initialize session and executor
        session_manager = AWSSessionManager(access_key, secret_key)
        executor = ResourceActionExecutor(session_manager)

        # Execute action
        result = executor.execute_action(resource_type, resource_id, region, action)

        # Cleanup
        session_manager.cleanup()

        # Return result
        return jsonify({
            'success': result.success,
            'resource_id': result.resource_id,
            'resource_type': result.resource_type,
            'action': result.action,
            'message': result.message,
            'verification_status': result.verification_status,
            'error': result.error,
        }), 200 if result.success else 400

    except ValueError as e:
        logger.warning(f"Invalid request: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
        }), 400

    except Exception as e:
        logger.error(f"Action execution error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'details': str(e) if os.environ.get('DEBUG') else None,
        }), 500


@app.route('/api/v1/resources/bulk-action', methods=['POST'])
@require_api_key
def perform_bulk_action():
    """
    Perform action on multiple resources
    
    Request body:
    {
        "access_key_id": "YOUR_ACCESS_KEY",
        "secret_access_key": "YOUR_SECRET_KEY",
        "actions": [
            {
                "resource_id": "i-xxx",
                "resource_type": "EC2_Instance",
                "region": "us-east-1",
                "action": "stop"
            },
            ...
        ]
    }
    """
    try:
        from aws_resource_scanner import AWSSessionManager

        # Extract credentials
        access_key, secret_key = extract_credentials_from_request()

        data = request.get_json() or {}
        actions_list = data.get('actions', [])

        if not actions_list:
            return jsonify({
                'success': False,
                'error': 'No actions provided',
            }), 400

        # Initialize session and executor
        session_manager = AWSSessionManager(access_key, secret_key)
        executor = ResourceActionExecutor(session_manager)

        results = []
        for action_data in actions_list:
            try:
                resource_id = action_data.get('resource_id')
                resource_type = action_data.get('resource_type')
                region = action_data.get('region')
                action_str = action_data.get('action', '').lower()

                action = ActionType[action_str.upper()]

                result = executor.execute_action(resource_type, resource_id, region, action)
                results.append({
                    'resource_id': result.resource_id,
                    'success': result.success,
                    'message': result.message,
                })
            except Exception as e:
                logger.error(f"Error in bulk action: {str(e)}")
                results.append({
                    'resource_id': action_data.get('resource_id'),
                    'success': False,
                    'message': str(e),
                })

        # Cleanup
        session_manager.cleanup()

        return jsonify({
            'success': True,
            'total_actions': len(results),
            'successful': sum(1 for r in results if r['success']),
            'failed': sum(1 for r in results if not r['success']),
            'results': results,
        }), 200

    except ValueError as e:
        logger.warning(f"Invalid request: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
        }), 400

    except Exception as e:
        logger.error(f"Bulk action error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
        }), 500


# ============================================================================
# MULTI-CLOUD ENDPOINTS
# ============================================================================

@app.route('/api/v1/gcp/scan', methods=['POST'])
@require_api_key
def scan_gcp_resources():
    """
    Scan Google Cloud Platform resources.

    Request body:
    {
        "service_account_json": {...},  // GCP service account JSON object
        "project_id": "my-gcp-project"
    }
    """
    try:
        data = request.get_json() or {}
        service_account_info = data.get('service_account_json')
        project_id = data.get('project_id')

        scanner = GCPResourceScanner(
            service_account_info=service_account_info,
            project_id=project_id,
        )
        result = scanner.scan()
        return jsonify(result), 200

    except Exception as e:
        logger.error(f'GCP scan error: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/v1/ai/usage', methods=['POST'])
@require_api_key
def get_ai_usage():
    """
    Get Claude AI API usage statistics.

    Request body:
    {
        "api_key": "sk-ant-...",
        "days": 30  // optional
    }
    """
    try:
        data = request.get_json() or {}
        api_key = data.get('api_key')
        days = int(data.get('days', 30))

        monitor = AIUsageMonitor(api_key=api_key)
        result = monitor.get_usage_stats(days=days)
        return jsonify(result), 200

    except Exception as e:
        logger.error(f'AI usage error: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/v1/costs/multi-cloud', methods=['POST'])
@require_api_key
def get_multi_cloud_costs():
    """
    Get aggregated costs from all configured cloud providers.

    Request body:
    {
        "aws_access_key": "...",
        "aws_secret_key": "...",
        "aws_region": "us-east-1",
        "gcp_service_account": {...},
        "gcp_project_id": "...",
        "anthropic_api_key": "..."
    }
    """
    try:
        data = request.get_json() or {}
        engine = MultiCloudCostEngine(
            aws_access_key=data.get('aws_access_key'),
            aws_secret_key=data.get('aws_secret_key'),
            aws_region=data.get('aws_region', 'us-east-1'),
            gcp_service_account=data.get('gcp_service_account'),
            gcp_project_id=data.get('gcp_project_id'),
            anthropic_api_key=data.get('anthropic_api_key'),
        )
        result = engine.get_aggregated_costs()
        return jsonify(result), 200

    except Exception as e:
        logger.error(f'Multi-cloud cost error: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/v1/costs/forecast', methods=['POST'])
@require_api_key
def forecast_costs():
    """
    Forecast future cloud costs using linear regression.

    Request body:
    {
        "historical_costs": [
            {"month": "Jan", "cost": 3200},
            {"month": "Feb", "cost": 3450},
            ...
        ],
        "forecast_months": 12  // 3, 6, or 12
    }
    """
    try:
        data = request.get_json() or {}
        historical = data.get('historical_costs', [])
        months = int(data.get('forecast_months', 12))

        engine = CostForecastingEngine()
        result = engine.forecast(historical, forecast_months=months)
        return jsonify(result), 200

    except Exception as e:
        logger.error(f'Cost forecast error: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/v1/optimization/recommendations', methods=['POST'])
@require_api_key
def get_optimization_recommendations():
    """
    Get cross-cloud resource optimization recommendations.

    Request body (all optional - will use demo data if not provided):
    {
        "aws_resources": [...],
        "gcp_resources": [...],
        "ai_usage": {...}
    }
    """
    try:
        data = request.get_json() or {}
        engine = ResourceOptimizationEngine()
        result = engine.analyze(
            aws_resources=data.get('aws_resources'),
            gcp_resources=data.get('gcp_resources'),
            ai_usage=data.get('ai_usage'),
        )
        return jsonify(result), 200

    except Exception as e:
        logger.error(f'Optimization error: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/v1/credits/status', methods=['POST'])
@require_api_key
def get_credits_status():
    """
    Get cloud credit balances and free tier usage.
    Returns demo data - real implementations query provider billing APIs.
    """
    try:
        return jsonify({
            'success': True,
            'credits': [
                {
                    'provider': 'aws',
                    'credit_type': 'AWS Free Tier',
                    'balance_usd': None,
                    'free_tier_usage': [
                        {'service': 'EC2', 'used': '750 hours', 'limit': '750 hours/month', 'pct': 92},
                        {'service': 'S3', 'used': '4.2 GB', 'limit': '5 GB', 'pct': 84},
                        {'service': 'Lambda', 'used': '850K requests', 'limit': '1M requests', 'pct': 85},
                    ],
                },
                {
                    'provider': 'gcp',
                    'credit_type': 'Google Cloud Credits',
                    'balance_usd': 285.50,
                    'expiry': '2025-06-30',
                    'free_tier_usage': [
                        {'service': 'Cloud Functions', 'used': '1.2M invocations', 'limit': '2M invocations', 'pct': 60},
                        {'service': 'Cloud Storage', 'used': '3.8 GB', 'limit': '5 GB', 'pct': 76},
                    ],
                },
                {
                    'provider': 'claude',
                    'credit_type': 'Anthropic API Credits',
                    'balance_usd': 150.00,
                    'expiry': '2025-06-30',
                },
            ],
            'timestamp': datetime.utcnow().isoformat(),
        }), 200

    except Exception as e:
        logger.error(f'Credits status error: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/v1/docs', methods=['GET'])
def api_documentation():
    """API documentation"""
    return jsonify({
        'service': 'AWS Resource Tracker API',
        'version': '1.0.0',
        'endpoints': {
            'health': {
                'method': 'GET',
                'path': '/health',
                'description': 'Health check',
            },
            'scan': {
                'method': 'POST',
                'path': '/api/v1/scan',
                'description': 'Scan AWS resources',
                'requires_auth': True,
            },
            'filter': {
                'method': 'POST',
                'path': '/api/v1/resources/filter',
                'description': 'Filter scanned resources',
                'requires_auth': True,
            },
            'action': {
                'method': 'POST',
                'path': '/api/v1/resources/action',
                'description': 'Perform action on resource',
                'requires_auth': True,
            },
            'bulk_action': {
                'method': 'POST',
                'path': '/api/v1/resources/bulk-action',
                'description': 'Perform action on multiple resources',
                'requires_auth': True,
            },
        },
        'authentication': {
            'api_key': 'X-API-Key header',
            'jwt': 'Authorization: Bearer <token>',
        },
    }), 200


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'success': False,
        'error': 'Endpoint not found',
        'docs': '/api/v1/docs',
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({
        'success': False,
        'error': 'Internal server error',
    }), 500


# ============================================================================
# AI ANOMALY DETECTION
# ============================================================================

@app.route('/api/v1/anomalies/detect', methods=['POST'])
@require_auth
def detect_anomalies():
    """Detect cost and usage anomalies using statistical analysis + Claude AI."""
    try:
        data = request.get_json() or {}
        anthropic_key = data.get('anthropic_api_key') or os.environ.get('ANTHROPIC_API_KEY')
        cost_history = data.get('cost_history')    # optional real data
        resource_metrics = data.get('resource_metrics')  # optional real data
        use_ai = data.get('use_ai_explanations', True)

        detector = AnomalyDetector(anthropic_api_key=anthropic_key)
        result = detector.detect(
            cost_history=cost_history,
            resource_metrics=resource_metrics,
            use_ai_explanations=use_ai,
        )
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        logger.error(f"Anomaly detection error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================================================
# NATURAL LANGUAGE CLOUD QUERY
# ============================================================================

@app.route('/api/v1/query/natural-language', methods=['POST'])
@require_auth
def natural_language_query():
    """Execute a natural language cloud query powered by Claude AI."""
    try:
        data = request.get_json() or {}
        question = data.get('question', '').strip()
        if not question:
            return jsonify({'success': False, 'error': 'question is required'}), 400

        anthropic_key = data.get('anthropic_api_key') or os.environ.get('ANTHROPIC_API_KEY')
        credentials = data.get('credentials', {})

        engine = NLQueryEngine(anthropic_api_key=anthropic_key)
        result = engine.query(question=question, credentials=credentials)
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        logger.error(f"NL query error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================================================
# AI ASSISTANT ENDPOINTS
# ============================================================================

@app.route('/api/v1/ai/chat', methods=['POST'])
@require_api_key
def ai_chat():
    """
    AI-powered cloud analytics chat endpoint
    
    Request body:
    {
        "question": "What is my biggest cost driver?",
        "context": {
            "costs": {...},
            "security_findings": [...],
            "resources": {...}
        }
    }
    """
    try:
        from services.ai_usage_monitor import AIQueryEngine
        
        data = request.get_json() or {}
        question = data.get('question', '').strip()
        context = data.get('context', {})
        
        if not question:
            return jsonify({'success': False, 'error': 'question is required'}), 400
        
        anthropic_key = os.environ.get('ANTHROPIC_API_KEY')
        engine = AIQueryEngine(api_key=anthropic_key)
        result = engine.query(question, context=context)
        
        return jsonify({
            'success': result.get('success', True),
            'data': result
        }), 200
        
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/v1/ai/usage', methods=['GET'])
@require_api_key
def ai_usage_stats():
    """
    Get AI API usage statistics
    
    Query parameters:
    - days: Number of days to look back (default: 30)
    """
    try:
        from services.ai_usage_monitor import AIUsageMonitor
        
        days = int(request.args.get('days', 30))
        anthropic_key = os.environ.get('ANTHROPIC_API_KEY')
        
        monitor = AIUsageMonitor(api_key=anthropic_key)
        stats = monitor.get_usage_stats(days=days)
        
        return jsonify({
            'success': True,
            'data': stats
        }), 200
        
    except Exception as e:
        logger.error(f"AI usage stats error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ============================================================================
# APPLICATION INITIALIZATION
# ============================================================================

def create_app():
    """Application factory"""
    return app


if __name__ == '__main__':
    # Configuration
    debug = os.environ.get('FLASK_ENV') == 'development'
    port = int(os.environ.get('PORT', 5000))

    # Run server
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug,
    )
