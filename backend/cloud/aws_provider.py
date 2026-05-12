"""
AWS Provider Implementation
Production-grade AWS cloud provider for multi-cloud abstraction
"""

from typing import List, Dict, Any, Optional
from .provider_abstraction import BaseCloudProvider, CloudResource, ResourceType
import logging

logger = logging.getLogger(__name__)


class AWSProvider(BaseCloudProvider):
    """
    AWS Cloud Provider Implementation
    Implements BaseCloudProvider interface for AWS
    """
    
    def __init__(self, region: str = 'us-east-1', access_key: Optional[str] = None, secret_key: Optional[str] = None):
        """
        Initialize AWS provider
        
        Args:
            region: AWS region
            access_key: AWS access key ID
            secret_key: AWS secret access key
        """
        super().__init__('aws', region)
        self.access_key = access_key
        self.secret_key = secret_key
        self.boto3_client = None
    
    def authenticate(self) -> bool:
        """Authenticate with AWS"""
        try:
            logger.info(f"Authenticating with AWS region: {self.region}")
            
            import boto3
            
            if self.access_key and self.secret_key:
                self.boto3_client = boto3.client(
                    'ec2',
                    region_name=self.region,
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key
                )
            else:
                self.boto3_client = boto3.client('ec2', region_name=self.region)
            
            self._authenticated = True
            logger.info("AWS authentication successful")
            return True
        except ImportError:
            logger.error("boto3 not installed")
            return False
        except Exception as e:
            logger.error(f"AWS authentication failed: {e}")
            return False
    
    def list_compute_resources(self) -> List[CloudResource]:
        """List EC2 instances"""
        if not self._authenticated:
            logger.warning("AWS provider not authenticated")
            return []
        
        try:
            logger.info(f"Fetching EC2 instances from {self.region}")
            
            import boto3
            ec2 = boto3.resource('ec2', region_name=self.region)
            resources = []
            
            for instance in ec2.instances.all():
                resources.append(CloudResource(
                    id=instance.id,
                    name=instance.tags[0]['Value'] if instance.tags else instance.id,
                    type=ResourceType.COMPUTE,
                    status=instance.state['Name'],
                    region=self.region,
                    metadata={
                        'instance_type': instance.instance_type,
                        'launch_time': instance.launch_time.isoformat() if instance.launch_time else None,
                        'public_ip': instance.public_ip_address,
                        'private_ip': instance.private_ip_address,
                    }
                ))
            
            return resources
        except Exception as e:
            logger.error(f"Error fetching EC2 instances: {e}")
            return []
    
    def list_storage_resources(self) -> List[CloudResource]:
        """List S3 buckets"""
        if not self._authenticated:
            logger.warning("AWS provider not authenticated")
            return []
        
        try:
            logger.info(f"Fetching S3 buckets")
            
            import boto3
            s3 = boto3.client('s3')
            resources = []
            
            response = s3.list_buckets()
            for bucket in response.get('Buckets', []):
                resources.append(CloudResource(
                    id=bucket['Name'],
                    name=bucket['Name'],
                    type=ResourceType.STORAGE,
                    status='active',
                    region=self.region,
                    metadata={
                        'creation_date': bucket['CreationDate'].isoformat() if bucket.get('CreationDate') else None,
                    }
                ))
            
            return resources
        except Exception as e:
            logger.error(f"Error fetching S3 buckets: {e}")
            return []
    
    def list_database_resources(self) -> List[CloudResource]:
        """List RDS databases"""
        if not self._authenticated:
            logger.warning("AWS provider not authenticated")
            return []
        
        try:
            logger.info(f"Fetching RDS databases from {self.region}")
            
            import boto3
            rds = boto3.client('rds', region_name=self.region)
            resources = []
            
            response = rds.describe_db_instances()
            for db in response.get('DBInstances', []):
                resources.append(CloudResource(
                    id=db['DBInstanceIdentifier'],
                    name=db['DBInstanceIdentifier'],
                    type=ResourceType.DATABASE,
                    status=db['DBInstanceStatus'],
                    region=db.get('AvailabilityZone', self.region),
                    metadata={
                        'engine': db['Engine'],
                        'engine_version': db['EngineVersion'],
                        'allocated_storage': db['AllocatedStorage'],
                        'db_instance_class': db['DBInstanceClass'],
                    }
                ))
            
            return resources
        except Exception as e:
            logger.error(f"Error fetching RDS databases: {e}")
            return []
    
    def get_cost_data(self, days: int = 30) -> Dict[str, Any]:
        """Get cost data from AWS Cost Explorer"""
        if not self._authenticated:
            logger.warning("AWS provider not authenticated")
            return {}
        
        try:
            logger.info(f"Fetching cost data for last {days} days")
            
            import boto3
            from datetime import datetime, timedelta
            
            ce = boto3.client('ce', region_name=self.region)
            
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days)
            
            response = ce.get_cost_and_usage(
                TimePeriod={
                    'Start': start_date.isoformat(),
                    'End': end_date.isoformat(),
                },
                Granularity='DAILY',
                Metrics=['UnblendedCost'],
            )
            
            return {
                'provider': 'aws',
                'region': self.region,
                'period_days': days,
                'cost_data': response.get('ResultsByTime', []),
            }
        except Exception as e:
            logger.error(f"Error fetching cost data: {e}")
            return {}
    
    def get_security_findings(self) -> List[Dict[str, Any]]:
        """Get security findings from AWS Security Hub"""
        if not self._authenticated:
            logger.warning("AWS provider not authenticated")
            return []
        
        try:
            logger.info(f"Fetching security findings from {self.region}")
            
            import boto3
            
            securityhub = boto3.client('securityhub', region_name=self.region)
            
            response = securityhub.get_findings(
                Filters={
                    'RecordState': [{'Value': 'ACTIVE', 'Comparison': 'EQUALS'}],
                }
            )
            
            findings = []
            for finding in response.get('Findings', []):
                findings.append({
                    'id': finding['Id'],
                    'title': finding['Title'],
                    'severity': finding['Severity']['Label'],
                    'status': finding['RecordState'],
                    'resource_type': finding['Resources'][0]['Type'] if finding.get('Resources') else 'Unknown',
                    'description': finding.get('Description', ''),
                })
            
            return findings
        except Exception as e:
            logger.error(f"Error fetching security findings: {e}")
            return []
    
    def get_resource_count(self) -> Dict[str, int]:
        """Get count of resources by type"""
        try:
            compute = len(self.list_compute_resources())
            storage = len(self.list_storage_resources())
            database = len(self.list_database_resources())
            
            return {
                'compute': compute,
                'storage': storage,
                'database': database,
                'total': compute + storage + database,
            }
        except Exception as e:
            logger.error(f"Error getting resource count: {e}")
            return {'compute': 0, 'storage': 0, 'database': 0, 'total': 0}
