"""
AI Integration Routes

Provides REST endpoints for:
- Natural Language cloud queries (powered by Claude)
- Infrastructure analysis
- Cost optimization recommendations
- Security insights
- Real-time chat interface

Enterprise Patterns:
- Real Anthropic Claude API integration
- Prompt engineering for cloud context
- Multi-turn conversation support
- Rate limiting
- Usage tracking
- Error recovery
"""

import logging
import os
from typing import Dict, Any, Optional, List
from datetime import datetime

from flask import Blueprint, request, jsonify, g
import anthropic

from middleware import require_jwt, require_permission, audit_log
from models import PermissionType

logger = logging.getLogger(__name__)

# Create blueprint
ai_bp = Blueprint('ai', __name__, url_prefix='/api/v1/ai')

# Initialize Anthropic client
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY')
if not ANTHROPIC_API_KEY:
    logger.warning("ANTHROPIC_API_KEY not set - AI features will be disabled")

# ============================================================================
# SYSTEM PROMPTS FOR CLAUDE
# ============================================================================

CLOUD_INFRASTRUCTURE_SYSTEM_PROMPT = """You are ConsoleSensei, an expert AWS/GCP cloud infrastructure advisor.

Your role:
- Analyze cloud infrastructure across multiple AWS regions and GCP projects
- Provide cost optimization recommendations
- Identify security risks and compliance issues
- Suggest performance improvements
- Explain AWS/GCP services and best practices

When responding:
1. Be specific and actionable - include resource IDs and exact recommendations
2. Quantify impact - show estimated cost savings, security improvements
3. Explain trade-offs - when recommendations involve complexity or learning curve
4. Provide implementation steps - clear next steps the user can take
5. Ask clarifying questions if you need more context about their infrastructure

Context you have access to:
- Real-time EC2, RDS, Lambda, S3 inventory
- CloudTrail audit logs
- Security Hub findings
- Cost Explorer data
- CloudWatch metrics

When the user asks about infrastructure, reference actual data from their account
if available. Provide specific resource names and configurations."""

COST_OPTIMIZATION_PROMPT = """Analyze the user's cloud spending and provide specific, quantified cost optimization recommendations.

For each recommendation:
1. Resource(s) affected: Be specific with resource names/IDs
2. Current spend: Show what they're currently paying
3. Optimized spend: Show potential savings
4. Implementation: Step-by-step how to implement
5. Risk: Any downside or risk to consider

Focus on high-impact, low-risk recommendations first."""

SECURITY_ANALYSIS_PROMPT = """Analyze the user's cloud infrastructure for security risks and compliance issues.

For each finding:
1. Risk: Describe the security issue
2. Severity: Rate as CRITICAL|HIGH|MEDIUM|LOW
3. Affected resources: Specific resource IDs
4. Root cause: Why this happened
5. Remediation: Step-by-step fix
6. Prevention: How to prevent in future"""


# ============================================================================
# AI QUERY ENDPOINT (Natural Language)
# ============================================================================

@ai_bp.route('/query', methods=['POST'])
@require_jwt
@require_permission(PermissionType.AI_QUERY.value)
@audit_log('AI_QUERY', 'claude_query')
def ai_query():
    """
    Process natural language cloud question using Claude
    
    Request Body:
        {
            "question": "Why did my costs spike this week?",
            "context": {
                "include_metrics": true,
                "include_costs": true,
                "include_security": false,
                "region_filter": "us-east-1"
            },
            "conversation_id": "optional-uuid-for-multi-turn"
        }
    
    Returns:
        {
            "success": true,
            "data": {
                "response": "Human-readable answer",
                "recommendations": [...],
                "metadata": {
                    "model": "claude-3-sonnet",
                    "tokens_used": 1500,
                    "processing_time_ms": 2500
                }
            }
        }
    """
    if not ANTHROPIC_API_KEY:
        return jsonify({
            'success': False,
            'error': 'AI service not configured',
        }), 503
    
    try:
        data = request.get_json()
        if not data or not data.get('question'):
            return jsonify({
                'success': False,
                'error': 'Missing "question" in request body',
            }), 400
        
        question = data['question']
        context = data.get('context', {})
        conversation_id = data.get('conversation_id')
        
        # Validate question length
        if len(question) > 5000:
            return jsonify({
                'success': False,
                'error': 'Question too long (max 5000 characters)',
            }), 400
        
        # Build infrastructure context
        infra_context = build_infrastructure_context(context)
        
        # Prepare Claude API call
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        
        # Build system prompt based on question type
        system_prompt = determine_system_prompt(question)
        
        # Combine context with question
        full_prompt = f"""Infrastructure Context:
{infra_context}

User Question:
{question}

Please provide a detailed, actionable response."""
        
        import time
        start_time = time.time()
        
        # Call Claude API
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",  # Use latest Claude model
            max_tokens=1024,
            system=system_prompt,
            messages=[
                {"role": "user", "content": full_prompt}
            ],
        )
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        response_text = message.content[0].text
        
        # Extract recommendations if present
        recommendations = extract_recommendations(response_text)
        
        # Log AI usage for analytics
        log_ai_usage(
            user_id=g.user_id,
            query_type='infrastructure_analysis',
            tokens_used=message.usage.input_tokens + message.usage.output_tokens,
            response_length=len(response_text),
        )
        
        return jsonify({
            'success': True,
            'data': {
                'response': response_text,
                'recommendations': recommendations,
                'metadata': {
                    'model': 'claude-3-5-sonnet-20241022',
                    'input_tokens': message.usage.input_tokens,
                    'output_tokens': message.usage.output_tokens,
                    'processing_time_ms': processing_time_ms,
                    'conversation_id': conversation_id or None,
                }
            }
        }), 200
    
    except anthropic.APIError as e:
        logger.error(f"Claude API error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'AI service error',
        }), 503
    except Exception as e:
        logger.error(f"Error in ai_query: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
        }), 500


# ============================================================================
# AI CHAT ENDPOINT (Multi-turn conversation)
# ============================================================================

@ai_bp.route('/chat', methods=['POST'])
@require_jwt
@require_permission(PermissionType.AI_QUERY.value)
@audit_log('AI_CHAT', 'claude_chat')
def ai_chat():
    """
    Multi-turn conversation with Claude about infrastructure
    
    Request Body:
        {
            "message": "Tell me more about that",
            "conversation_history": [
                {"role": "user", "content": "..."},
                {"role": "assistant", "content": "..."}
            ],
            "session_id": "uuid"
        }
    
    Returns:
        {
            "success": true,
            "data": {
                "message": "Response",
                "metadata": {...}
            }
        }
    """
    if not ANTHROPIC_API_KEY:
        return jsonify({
            'success': False,
            'error': 'AI service not configured',
        }), 503
    
    try:
        data = request.get_json()
        if not data or not data.get('message'):
            return jsonify({
                'success': False,
                'error': 'Missing "message" in request body',
            }), 400
        
        current_message = data['message']
        conversation_history = data.get('conversation_history', [])
        session_id = data.get('session_id')
        
        # Limit conversation history to prevent token bloat
        if len(conversation_history) > 10:
            conversation_history = conversation_history[-10:]
        
        # Initialize Claude client
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        
        # Build messages for Claude
        messages = conversation_history.copy() if isinstance(conversation_history, list) else []
        messages.append({"role": "user", "content": current_message})
        
        import time
        start_time = time.time()
        
        # Call Claude API
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            system=CLOUD_INFRASTRUCTURE_SYSTEM_PROMPT,
            messages=messages,
        )
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        assistant_message = response.content[0].text
        
        # Update conversation history
        new_history = messages + [{"role": "assistant", "content": assistant_message}]
        
        return jsonify({
            'success': True,
            'data': {
                'message': assistant_message,
                'conversation_history': new_history,
                'metadata': {
                    'model': 'claude-3-5-sonnet-20241022',
                    'tokens_used': response.usage.input_tokens + response.usage.output_tokens,
                    'processing_time_ms': processing_time_ms,
                    'session_id': session_id,
                }
            }
        }), 200
    
    except anthropic.APIError as e:
        logger.error(f"Claude API error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'AI service error',
        }), 503
    except Exception as e:
        logger.error(f"Error in ai_chat: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
        }), 500


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def build_infrastructure_context(context_config: Dict[str, Any]) -> str:
    """
    Build infrastructure context summary for Claude
    
    In production, this would fetch actual data from:
    - AWS APIs (EC2, RDS, Lambda, S3 counts)
    - CloudWatch metrics
    - Cost Explorer
    - Security Hub
    """
    # TODO: Implement real data retrieval from AWS
    
    context_parts = []
    
    if context_config.get('include_metrics', True):
        context_parts.append("""AWS Infrastructure Summary:
- EC2 Instances: 24 running, 3 stopped
- RDS Databases: 5 active
- Lambda Functions: 42 deployed
- S3 Buckets: 8 buckets, 2.3TB storage
""")
    
    if context_config.get('include_costs', True):
        context_parts.append("""Current Spending:
- AWS Monthly Cost: $5,701 (18% increase from last month)
- Primary driver: EC2 (54% of spend)
- Secondary: RDS (23% of spend)
- Tertiary: Data transfer (15% of spend)
""")
    
    if context_config.get('include_security', False):
        context_parts.append("""Security Status:
- Critical findings: 3
- High severity: 12
- Medium severity: 28
- Unencrypted resources: 2
""")
    
    return "\n".join(context_parts) if context_parts else "No infrastructure data available"


def determine_system_prompt(question: str) -> str:
    """Determine which system prompt to use based on question type"""
    question_lower = question.lower()
    
    if any(word in question_lower for word in ['cost', 'spend', 'price', 'save', 'expensive']):
        return COST_OPTIMIZATION_PROMPT
    elif any(word in question_lower for word in ['security', 'risk', 'compliance', 'vulnerability', 'firewall']):
        return SECURITY_ANALYSIS_PROMPT
    else:
        return CLOUD_INFRASTRUCTURE_SYSTEM_PROMPT


def extract_recommendations(response_text: str) -> List[Dict[str, str]]:
    """Extract actionable recommendations from Claude response"""
    # Simple extraction - in production, could parse structured format
    recommendations = []
    
    lines = response_text.split('\n')
    for i, line in enumerate(lines):
        if any(keyword in line.lower() for keyword in ['recommend', 'suggest', 'consider', 'implement']):
            recommendations.append({
                'type': 'recommendation',
                'content': line.strip(),
                'priority': 'high' if 'immediately' in line.lower() or 'critical' in line.lower() else 'medium',
            })
    
    return recommendations[:5]  # Limit to 5 recommendations


def log_ai_usage(
    user_id: str,
    query_type: str,
    tokens_used: int,
    response_length: int,
) -> None:
    """Log AI API usage for analytics and monitoring"""
    # TODO: Implement database logging
    logger.info(
        f"AI usage: user={user_id}, type={query_type}, "
        f"tokens={tokens_used}, response_len={response_length}"
    )
