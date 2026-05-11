"""
Additional AWS Services Routes: CloudTrail, Security Hub, Activity Logs

Provides REST endpoints for:
- CloudTrail event logging
- Security Hub findings
- Activity and audit trails
"""

import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta

import boto3
from flask import Blueprint, request, jsonify, g
from botocore.exceptions import ClientError

from models import CloudTrailEventDTO, SecurityHubFindingDTO, PermissionType
from middleware import require_jwt, require_permission, audit_log

logger = logging.getLogger(__name__)

# Create blueprint for activity/security endpoints
activity_bp = Blueprint('activity', __name__, url_prefix='/api/v1/activity')
security_bp = Blueprint('security', __name__, url_prefix='/api/v1/security')


def get_aws_client(service: str, region: str = 'us-east-1'):
    """Get boto3 AWS client"""
    try:
        return boto3.client(service, region_name=region)
    except Exception as e:
        logger.error(f"Failed to create {service} client: {str(e)}")
        return None


# ============================================================================
# CLOUDTRAIL EVENTS ENDPOINT
# ============================================================================

@activity_bp.route('/cloudtrail', methods=['GET'])
@require_jwt
@require_permission(PermissionType.AUDIT_READ.value)
@audit_log('ACTIVITY_VIEW', 'cloudtrail_events')
def get_cloudtrail_events():
    """
    Get CloudTrail events for the past N days
    
    Query Parameters:
        - days: Number of days to look back (default: 7, max: 90)
        - event_source: Filter by event source (e.g., 'ec2.amazonaws.com')
        - username: Filter by username
        - event_name: Filter by event name (e.g., 'RunInstances')
        - page: Page number
        - page_size: Items per page
    
    Returns:
        PaginatedResponse with CloudTrailEventDTO objects
    """
    try:
        days = int(request.args.get('days', 7))
        event_source = request.args.get('event_source')
        username = request.args.get('username')
        event_name = request.args.get('event_name')
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 50))
        
        # Validate input
        if days < 1 or days > 90:
            return jsonify({
                'success': False,
                'error': 'days parameter must be between 1 and 90'
            }), 400
        
        cloudtrail = get_aws_client('cloudtrail', 'us-east-1')
        if not cloudtrail:
            return jsonify({
                'success': False,
                'error': 'Failed to connect to CloudTrail service',
            }), 503
        
        # Build lookup attributes filter
        lookup_attributes = []
        if event_source:
            lookup_attributes.append({
                'AttributeKey': 'EventSource',
                'AttributeValue': event_source,
            })
        if username:
            lookup_attributes.append({
                'AttributeKey': 'Username',
                'AttributeValue': username,
            })
        if event_name:
            lookup_attributes.append({
                'AttributeKey': 'EventName',
                'AttributeValue': event_name,
            })
        
        # Fetch events
        all_events = []
        start_time = datetime.utcnow() - timedelta(days=days)
        end_time = datetime.utcnow()
        
        try:
            response = cloudtrail.lookup_events(
                LookupAttributes=lookup_attributes if lookup_attributes else None,
                StartTime=start_time,
                EndTime=end_time,
                MaxItems=min(page_size * 5, 50),  # CloudTrail API limit
            )
            
            for event in response.get('Events', []):
                try:
                    import json as json_lib
                    cloud_trail_event = json_lib.loads(event['CloudTrailEvent'])
                    
                    all_events.append(CloudTrailEventDTO(
                        event_id=event['EventID'],
                        event_name=event['EventName'],
                        event_time=event['EventTime'],
                        username=event.get('Username', 'N/A'),
                        source_ip_address=cloud_trail_event.get('sourceIPAddress', 'N/A'),
                        user_agent=cloud_trail_event.get('userAgent', 'N/A'),
                        aws_region=cloud_trail_event.get('awsRegion', 'N/A'),
                        event_source=event.get('EventSource', 'N/A'),
                        resources=event.get('Resources', []),
                        error_code=cloud_trail_event.get('errorCode'),
                        error_message=cloud_trail_event.get('errorMessage'),
                        request_parameters=cloud_trail_event.get('requestParameters', {}),
                        response_elements=cloud_trail_event.get('responseElements', {}),
                    ))
                except Exception as e:
                    logger.warning(f"Could not parse CloudTrail event: {str(e)}")
        except ClientError as e:
            logger.error(f"CloudTrail lookup failed: {str(e)}")
            return jsonify({
                'success': False,
                'error': 'Failed to retrieve CloudTrail events',
            }), 500
        
        # Paginate
        total_count = len(all_events)
        total_pages = (total_count + page_size - 1) // page_size
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        return jsonify({
            'success': True,
            'data': {
                'items': [e.to_dict() for e in all_events[start_idx:end_idx]],
                'total_count': total_count,
                'page': page,
                'page_size': page_size,
                'total_pages': total_pages,
            },
        }), 200
    
    except Exception as e:
        logger.error(f"Error in get_cloudtrail_events: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
        }), 500


# ============================================================================
# SECURITY HUB FINDINGS ENDPOINT
# ============================================================================

@security_bp.route('/findings', methods=['GET'])
@require_jwt
@require_permission(PermissionType.SECURITY_READ.value)
@audit_log('SECURITY_VIEW', 'securityhub_findings')
def get_security_findings():
    """
    Get AWS Security Hub findings
    
    Query Parameters:
        - severity: Filter by severity (CRITICAL|HIGH|MEDIUM|LOW|INFORMATIONAL)
        - status: Filter by status (NEW|NOTIFIED|SUPPRESSED|RESOLVED)
        - resource_type: Filter by resource type
        - region: AWS region
        - page: Page number
        - page_size: Items per page
    
    Returns:
        PaginatedResponse with SecurityHubFindingDTO objects
    """
    try:
        severity = request.args.get('severity', 'HIGH')
        status = request.args.get('status', 'NEW')
        resource_type = request.args.get('resource_type')
        region = request.args.get('region', 'us-east-1')
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 50))
        
        securityhub = get_aws_client('securityhub', region)
        if not securityhub:
            return jsonify({
                'success': False,
                'error': 'Failed to connect to Security Hub service',
            }), 503
        
        # Build filters
        filters = {
            'SeverityLabel': [{'Value': severity, 'Comparison': 'EQUALS'}],
            'RecordState': [{'Value': 'ACTIVE', 'Comparison': 'EQUALS'}],
        }
        
        if status:
            filters['WorkflowStatus'] = [{'Value': status, 'Comparison': 'EQUALS'}]
        if resource_type:
            filters['ResourceType'] = [{'Value': resource_type, 'Comparison': 'EQUALS'}]
        
        # Fetch findings
        all_findings = []
        next_token = None
        
        try:
            while True:
                params = {'Filters': filters, 'MaxResults': min(page_size, 100)}
                if next_token:
                    params['NextToken'] = next_token
                
                response = securityhub.get_findings(**params)
                
                for finding in response.get('Findings', []):
                    first_observed = finding.get('FirstObservedAt')
                    last_observed = finding.get('LastObservedAt')
                    
                    if isinstance(first_observed, str):
                        first_observed = datetime.fromisoformat(first_observed.replace('Z', '+00:00')).replace(tzinfo=None)
                    if isinstance(last_observed, str):
                        last_observed = datetime.fromisoformat(last_observed.replace('Z', '+00:00')).replace(tzinfo=None)
                    
                    all_findings.append(SecurityHubFindingDTO(
                        finding_id=finding['Id'],
                        title=finding['Title'],
                        description=finding['Description'],
                        severity=finding['Severity']['Label'],
                        compliance_status=finding.get('Compliance', {}).get('Status', 'UNKNOWN'),
                        resource_type=finding['Resources'][0]['Type'] if finding.get('Resources') else 'UNKNOWN',
                        resource_id=finding['Resources'][0]['Id'] if finding.get('Resources') else 'UNKNOWN',
                        aws_region=finding['AwsAccountId'],
                        first_observed_at=first_observed,
                        last_observed_at=last_observed,
                        status='active',
                    ))
                
                next_token = response.get('NextToken')
                if not next_token or len(all_findings) >= page_size * 10:
                    break
        
        except ClientError as e:
            logger.error(f"Security Hub findings retrieval failed: {str(e)}")
            return jsonify({
                'success': False,
                'error': 'Failed to retrieve Security Hub findings',
            }), 500
        
        # Paginate
        total_count = len(all_findings)
        total_pages = (total_count + page_size - 1) // page_size
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        return jsonify({
            'success': True,
            'data': {
                'items': [f.to_dict() for f in all_findings[start_idx:end_idx]],
                'total_count': total_count,
                'page': page,
                'page_size': page_size,
                'total_pages': total_pages,
            },
        }), 200
    
    except Exception as e:
        logger.error(f"Error in get_security_findings: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
        }), 500
