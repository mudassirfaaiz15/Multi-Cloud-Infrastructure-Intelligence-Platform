"""
AWS Resources API Routes

Provides REST endpoints for AWS resource monitoring and management.
All routes require JWT authentication and proper RBAC permissions.

Architecture:
    GET  /api/v1/resources/ec2 → List EC2 instances across regions
    GET  /api/v1/resources/rds → List RDS databases
    GET  /api/v1/resources/lambda → List Lambda functions
    GET  /api/v1/resources/s3 → List S3 buckets
    GET  /api/v1/activity/cloudtrail → List CloudTrail events
    GET  /api/v1/security/findings → List Security Hub findings

Enterprise Patterns:
    - Real boto3 AWS SDK calls
    - Pagination support
    - Region filtering
    - Comprehensive error handling
    - Request validation
    - Response normalization
    - Cost calculation
    - Status classification (safe/warning/critical)
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

import boto3
from flask import Blueprint, request, jsonify, g
from botocore.exceptions import ClientError, BotoCoreError

from models import (
    EC2InstanceDTO, RDSInstanceDTO, LambdaFunctionDTO, S3BucketDTO,
    CloudTrailEventDTO, SecurityHubFindingDTO, APIResponse, PaginatedResponse,
    PermissionType
)
from middleware import require_jwt, require_permission, audit_log

logger = logging.getLogger(__name__)

# Create blueprint
aws_bp = Blueprint('aws_resources', __name__, url_prefix='/api/v1/resources')

# ============================================================================
# AWS CLIENT FACTORY
# ============================================================================

def get_aws_client(service: str, region: str = 'us-east-1') -> Optional[Any]:
    """
    Get boto3 client for AWS service
    
    Args:
        service: AWS service name (ec2, rds, lambda, s3, cloudtrail, securityhub)
        region: AWS region
    
    Returns:
        boto3 client or None if error
    
    Enterprise Pattern: Centralized client creation with error handling
    """
    try:
        # In production, use Supabase to retrieve encrypted AWS credentials
        # For now, use environment-based credentials (IAM role or .env)
        client = boto3.client(service, region_name=region)
        return client
    except ClientError as e:
        logger.error(f"Failed to create AWS client for {service}: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error creating AWS client: {str(e)}")
        return None


def classify_resource_status(
    cpu_utilization: Optional[float] = None,
    age_days: Optional[int] = None,
    cost_monthly: Optional[float] = None,
    error_count: Optional[int] = None,
) -> str:
    """
    Classify resource status as safe/warning/critical
    
    Enterprise Pattern: Intelligence-driven status classification
    """
    critical_thresholds = {
        'high_cpu': 90.0,  # >90% CPU = critical
        'very_old': 365,   # 1+ year old = critical
        'high_cost': 10000,  # >$10k/month = critical
        'errors': 100,     # >100 errors = critical
    }
    
    warning_thresholds = {
        'moderate_cpu': 70.0,
        'old': 180,
        'moderate_cost': 5000,
        'errors': 50,
    }
    
    critical_count = 0
    warning_count = 0
    
    if cpu_utilization is not None:
        if cpu_utilization >= critical_thresholds['high_cpu']:
            critical_count += 1
        elif cpu_utilization >= warning_thresholds['moderate_cpu']:
            warning_count += 1
    
    if age_days is not None:
        if age_days >= critical_thresholds['very_old']:
            critical_count += 1
        elif age_days >= warning_thresholds['old']:
            warning_count += 1
    
    if cost_monthly is not None:
        if cost_monthly >= critical_thresholds['high_cost']:
            critical_count += 1
        elif cost_monthly >= warning_thresholds['moderate_cost']:
            warning_count += 1
    
    if error_count is not None:
        if error_count >= critical_thresholds['errors']:
            critical_count += 1
        elif error_count >= warning_thresholds['errors']:
            warning_count += 1
    
    if critical_count >= 1:
        return 'critical'
    if warning_count >= 1:
        return 'warning'
    return 'safe'


# ============================================================================
# EC2 INSTANCES ENDPOINT
# ============================================================================

@aws_bp.route('/ec2', methods=['GET'])
@require_jwt
@require_permission(PermissionType.RESOURCE_READ.value)
@audit_log('RESOURCE_LIST', 'ec2_instance')
def list_ec2_instances():
    """
    List EC2 instances across all regions
    
    Query Parameters:
        - region: Filter by specific region (optional)
        - state: Filter by state - running|stopped|terminated (optional)
        - page: Page number (default: 1)
        - page_size: Items per page (default: 50)
    
    Returns:
        PaginatedResponse with EC2InstanceDTO objects
    """
    try:
        # Parse query parameters
        region_filter = request.args.get('region')
        state_filter = request.args.get('state', 'running')
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 50))
        
        if page < 1 or page_size < 1 or page_size > 100:
            return jsonify({
                'success': False,
                'error': 'Invalid pagination parameters'
            }), 400
        
        # Get all regions or specific region
        regions = [region_filter] if region_filter else [
            'us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'
        ]
        
        instances = []
        
        for region in regions:
            try:
                ec2_client = get_aws_client('ec2', region)
                if not ec2_client:
                    continue
                
                # Fetch instances
                response = ec2_client.describe_instances(
                    Filters=[
                        {'Name': 'instance-state-name', 'Values': [state_filter]},
                    ]
                )
                
                for reservation in response.get('Reservations', []):
                    for instance in reservation.get('Instances', []):
                        # Get instance tags for name
                        tags = {tag['Key']: tag['Value'] for tag in instance.get('Tags', [])}
                        
                        # Estimate cost (simplified - in production use Cost Explorer API)
                        instance_type = instance['InstanceType']
                        hourly_cost = estimate_ec2_hourly_cost(instance_type)
                        monthly_cost = hourly_cost * 730  # 730 hours per month average
                        
                        # Calculate age
                        launch_time = instance['LaunchTime']
                        age_days = (datetime.utcnow() - launch_time.replace(tzinfo=None)).days
                        
                        instances.append(EC2InstanceDTO(
                            instance_id=instance['InstanceId'],
                            instance_name=tags.get('Name', 'Unnamed'),
                            instance_type=instance_type,
                            state=instance['State']['Name'],
                            private_ip=instance.get('PrivateIpAddress'),
                            public_ip=instance.get('PublicIpAddress'),
                            region=region,
                            availability_zone=instance['Placement']['AvailabilityZone'],
                            launch_time=launch_time.replace(tzinfo=None),
                            tags=tags,
                            security_groups=[sg['GroupName'] for sg in instance.get('SecurityGroups', [])],
                            cost_per_month=monthly_cost,
                            status=classify_resource_status(
                                age_days=age_days,
                                cost_monthly=monthly_cost
                            ),
                        ))
            except ClientError as e:
                logger.error(f"Error fetching EC2 instances in {region}: {str(e)}")
                continue
        
        # Paginate
        total_count = len(instances)
        total_pages = (total_count + page_size - 1) // page_size
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        paginated_response = PaginatedResponse(
            items=[inst.to_dict() for inst in instances[start_idx:end_idx]],
            total_count=total_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
        
        return jsonify({
            'success': True,
            'data': paginated_response.to_dict(),
            'meta': {
                'timestamp': datetime.utcnow().isoformat(),
                'regions': regions,
            }
        }), 200
    
    except Exception as e:
        logger.error(f"Unexpected error in list_ec2_instances: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
        }), 500


# ============================================================================
# RDS INSTANCES ENDPOINT
# ============================================================================

@aws_bp.route('/rds', methods=['GET'])
@require_jwt
@require_permission(PermissionType.RESOURCE_READ.value)
@audit_log('RESOURCE_LIST', 'rds_instance')
def list_rds_instances():
    """
    List RDS database instances
    
    Query Parameters:
        - region: Filter by specific region
        - engine: Filter by engine type (mysql, postgres, aurora, etc.)
        - page: Page number
        - page_size: Items per page
    
    Returns:
        PaginatedResponse with RDSInstanceDTO objects
    """
    try:
        region_filter = request.args.get('region', 'us-east-1')
        engine_filter = request.args.get('engine')
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 50))
        
        rds_client = get_aws_client('rds', region_filter)
        if not rds_client:
            return jsonify({
                'success': False,
                'error': 'Failed to connect to AWS RDS service',
            }), 503
        
        # Fetch RDS instances
        response = rds_client.describe_db_instances()
        
        instances = []
        for db in response.get('DBInstances', []):
            if engine_filter and db['Engine'] != engine_filter:
                continue
            
            # Estimate monthly cost
            monthly_cost = estimate_rds_monthly_cost(
                db['DBInstanceClass'],
                db['AllocatedStorage'],
                db['Engine']
            )
            
            instances.append(RDSInstanceDTO(
                db_instance_identifier=db['DBInstanceIdentifier'],
                engine=db['Engine'],
                db_instance_class=db['DBInstanceClass'],
                engine_version=db['EngineVersion'],
                db_instance_status=db['DBInstanceStatus'],
                availability_zone=db['AvailabilityZone'],
                master_username=db['MasterUsername'],
                allocated_storage=db['AllocatedStorage'],
                storage_encrypted=db['StorageEncrypted'],
                port=db['Endpoint']['Port'],
                create_time=db['InstanceCreateTime'].replace(tzinfo=None),
                multi_az=db['MultiAZ'],
                region=region_filter,
                cost_per_month=monthly_cost,
                status=classify_resource_status(
                    age_days=(datetime.utcnow() - db['InstanceCreateTime'].replace(tzinfo=None)).days,
                    cost_monthly=monthly_cost,
                ),
            ))
        
        # Paginate
        total_count = len(instances)
        total_pages = (total_count + page_size - 1) // page_size
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        return jsonify({
            'success': True,
            'data': {
                'items': [inst.to_dict() for inst in instances[start_idx:end_idx]],
                'total_count': total_count,
                'page': page,
                'page_size': page_size,
                'total_pages': total_pages,
            },
        }), 200
    
    except Exception as e:
        logger.error(f"Error in list_rds_instances: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
        }), 500


# ============================================================================
# LAMBDA FUNCTIONS ENDPOINT
# ============================================================================

@aws_bp.route('/lambda', methods=['GET'])
@require_jwt
@require_permission(PermissionType.RESOURCE_READ.value)
@audit_log('RESOURCE_LIST', 'lambda_function')
def list_lambda_functions():
    """
    List Lambda functions in a region
    
    Query Parameters:
        - region: AWS region (default: us-east-1)
        - page: Page number
        - page_size: Items per page
    
    Returns:
        PaginatedResponse with LambdaFunctionDTO objects
    """
    try:
        region = request.args.get('region', 'us-east-1')
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 50))
        
        lambda_client = get_aws_client('lambda', region)
        if not lambda_client:
            return jsonify({
                'success': False,
                'error': 'Failed to connect to AWS Lambda service',
            }), 503
        
        cloudwatch = get_aws_client('cloudwatch', region)
        
        # Fetch Lambda functions
        response = lambda_client.list_functions()
        
        functions = []
        for func in response.get('Functions', []):
            # Get invocation metrics from CloudWatch (last 30 days)
            invocations = 0
            errors = 0
            
            if cloudwatch:
                try:
                    # Get invocation count
                    inv_response = cloudwatch.get_metric_statistics(
                        Namespace='AWS/Lambda',
                        MetricName='Invocations',
                        Dimensions=[{'Name': 'FunctionName', 'Value': func['FunctionName']}],
                        StartTime=datetime.utcnow() - timedelta(days=30),
                        EndTime=datetime.utcnow(),
                        Period=86400,  # 1 day
                        Statistics=['Sum'],
                    )
                    invocations = sum(dp['Sum'] for dp in inv_response.get('Datapoints', []))
                    
                    # Get error count
                    err_response = cloudwatch.get_metric_statistics(
                        Namespace='AWS/Lambda',
                        MetricName='Errors',
                        Dimensions=[{'Name': 'FunctionName', 'Value': func['FunctionName']}],
                        StartTime=datetime.utcnow() - timedelta(days=30),
                        EndTime=datetime.utcnow(),
                        Period=86400,
                        Statistics=['Sum'],
                    )
                    errors = sum(dp['Sum'] for dp in err_response.get('Datapoints', []))
                except Exception as e:
                    logger.warning(f"Could not fetch metrics for {func['FunctionName']}: {str(e)}")
            
            # Estimate cost (simplified)
            monthly_cost = estimate_lambda_monthly_cost(invocations, func['MemorySize'])
            
            functions.append(LambdaFunctionDTO(
                function_name=func['FunctionName'],
                function_arn=func['FunctionArn'],
                runtime=func.get('Runtime', 'unknown'),
                handler=func.get('Handler', 'N/A'),
                code_size=func['CodeSize'],
                timeout=func['Timeout'],
                memory_size=func['MemorySize'],
                last_modified=datetime.fromisoformat(func['LastModified'].replace('Z', '+00:00')).replace(tzinfo=None),
                role_arn=func['Role'],
                region=region,
                cost_per_month=monthly_cost,
                invocations_last_30d=int(invocations),
                errors_last_30d=int(errors),
                status=classify_resource_status(
                    error_count=int(errors),
                    cost_monthly=monthly_cost,
                ),
            ))
        
        # Paginate
        total_count = len(functions)
        total_pages = (total_count + page_size - 1) // page_size
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        return jsonify({
            'success': True,
            'data': {
                'items': [func.to_dict() for func in functions[start_idx:end_idx]],
                'total_count': total_count,
                'page': page,
                'page_size': page_size,
                'total_pages': total_pages,
            },
        }), 200
    
    except Exception as e:
        logger.error(f"Error in list_lambda_functions: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
        }), 500


# ============================================================================
# S3 BUCKETS ENDPOINT
# ============================================================================

@aws_bp.route('/s3', methods=['GET'])
@require_jwt
@require_permission(PermissionType.RESOURCE_READ.value)
@audit_log('RESOURCE_LIST', 's3_bucket')
def list_s3_buckets():
    """
    List S3 buckets in the AWS account
    
    Note: S3 is global, so region parameter is ignored
    
    Returns:
        PaginatedResponse with S3BucketDTO objects
    """
    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 50))
        
        s3_client = get_aws_client('s3', 'us-east-1')  # S3 is global
        if not s3_client:
            return jsonify({
                'success': False,
                'error': 'Failed to connect to AWS S3 service',
            }), 503
        
        # List all buckets
        response = s3_client.list_buckets()
        
        buckets = []
        for bucket in response.get('Buckets', []):
            bucket_name = bucket['Name']
            
            try:
                # Get bucket location
                location = s3_client.get_bucket_location(Bucket=bucket_name)
                region = location['LocationConstraint'] or 'us-east-1'
                
                # Get bucket size and object count (simplified - normally done with S3 analytics)
                size_bytes = 0
                object_count = 0
                
                try:
                    # List objects to count and estimate size
                    paginator = s3_client.get_paginator('list_objects_v2')
                    pages = paginator.paginate(Bucket=bucket_name)
                    
                    for page_data in pages:
                        for obj in page_data.get('Contents', []):
                            object_count += 1
                            size_bytes += obj['Size']
                            if object_count >= 10000:  # Limit for performance
                                break
                except:
                    pass
                
                # Get encryption status
                try:
                    encryption = s3_client.get_bucket_encryption(Bucket=bucket_name)
                    encryption_enabled = True
                except s3_client.exceptions.ServerSideEncryptionConfigurationNotFoundError:
                    encryption_enabled = False
                except:
                    encryption_enabled = False
                
                # Get versioning status
                versioning = s3_client.get_bucket_versioning(Bucket=bucket_name)
                versioning_enabled = versioning.get('Status') == 'Enabled'
                
                # Get public access block
                try:
                    pab = s3_client.get_public_access_block(Bucket=bucket_name)
                    public_access_blocked = pab['PublicAccessBlockConfiguration']['BlockPublicAcls']
                except:
                    public_access_blocked = False
                
                # Estimate monthly cost
                monthly_cost = estimate_s3_monthly_cost(size_bytes, object_count)
                
                buckets.append(S3BucketDTO(
                    bucket_name=bucket_name,
                    region=region,
                    creation_date=bucket['CreationDate'].replace(tzinfo=None),
                    size_bytes=size_bytes,
                    object_count=object_count,
                    storage_class='STANDARD',  # Simplified
                    encryption_enabled=encryption_enabled,
                    versioning_enabled=versioning_enabled,
                    public_access_blocked=public_access_blocked,
                    cost_per_month=monthly_cost,
                    status=classify_resource_status(cost_monthly=monthly_cost),
                ))
            except Exception as e:
                logger.warning(f"Could not get details for bucket {bucket_name}: {str(e)}")
        
        # Paginate
        total_count = len(buckets)
        total_pages = (total_count + page_size - 1) // page_size
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        return jsonify({
            'success': True,
            'data': {
                'items': [b.to_dict() for b in buckets[start_idx:end_idx]],
                'total_count': total_count,
                'page': page,
                'page_size': page_size,
                'total_pages': total_pages,
            },
        }), 200
    
    except Exception as e:
        logger.error(f"Error in list_s3_buckets: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
        }), 500


# ============================================================================
# COST ESTIMATION HELPERS
# ============================================================================

def estimate_ec2_hourly_cost(instance_type: str) -> float:
    """Simplified EC2 cost estimation - replace with actual pricing API"""
    # On-demand pricing for us-east-1 (simplified rates)
    pricing = {
        't2.micro': 0.0116,
        't2.small': 0.0232,
        't2.medium': 0.0464,
        't3.micro': 0.0104,
        't3.small': 0.0208,
        't3.medium': 0.0416,
        'm5.large': 0.096,
        'm5.xlarge': 0.192,
        'm5.2xlarge': 0.384,
        'c5.large': 0.085,
        'c5.xlarge': 0.17,
        'p3.2xlarge': 3.06,
        'p3.8xlarge': 12.24,
    }
    return pricing.get(instance_type, 0.05)  # Default fallback


def estimate_rds_monthly_cost(
    db_instance_class: str,
    allocated_storage_gb: int,
    engine: str
) -> float:
    """Simplified RDS cost estimation"""
    # On-demand pricing per hour for us-east-1
    hourly_rates = {
        'db.t3.micro': 0.017,
        'db.t3.small': 0.034,
        'db.t3.medium': 0.068,
        'db.m5.large': 0.14,
        'db.m5.xlarge': 0.28,
        'db.r5.large': 0.28,
        'db.r5.xlarge': 0.56,
    }
    
    hourly = hourly_rates.get(db_instance_class, 0.05)
    storage_cost = allocated_storage_gb * 0.10  # $0.10 per GB per month
    
    return (hourly * 730) + storage_cost  # 730 hours per month


def estimate_lambda_monthly_cost(invocations: int, memory_mb: int) -> float:
    """Simplified Lambda cost estimation"""
    # Lambda pricing: $0.0000002 per request + compute time
    request_cost = invocations * 0.0000002
    
    # Assume average duration of 100ms per invocation
    duration_seconds = (invocations * 0.1) / 1000
    gb_seconds = (memory_mb / 1024) * duration_seconds
    compute_cost = gb_seconds * 0.0000166667  # $0.0000166667 per GB-second
    
    return request_cost + compute_cost


def estimate_s3_monthly_cost(size_bytes: int, object_count: int) -> float:
    """Simplified S3 cost estimation"""
    size_gb = size_bytes / (1024 ** 3)
    storage_cost = size_gb * 0.023  # $0.023 per GB per month
    request_cost = (object_count / 1000) * 0.0004  # $0.0004 per 1k requests
    return storage_cost + request_cost
