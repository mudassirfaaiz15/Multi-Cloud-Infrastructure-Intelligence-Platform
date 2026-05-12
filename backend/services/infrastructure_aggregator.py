"""Infrastructure aggregation service for dynamic context building."""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from db_models import Resource, CostSnapshot, SecurityFinding, Anomaly
from repositories.resource_repository import ResourceRepository
from repositories.cost_snapshot_repository import CostSnapshotRepository
from repositories.security_finding_repository import SecurityFindingRepository
from repositories.anomaly_repository import AnomalyRepository

logger = logging.getLogger(__name__)


class InfrastructureAggregator:
    """Aggregates real infrastructure data for AI context."""

    def __init__(self, db_session: Session):
        self.db = db_session
        self.resource_repo = ResourceRepository(db_session)
        self.cost_repo = CostSnapshotRepository(db_session)
        self.security_repo = SecurityFindingRepository(db_session)
        self.anomaly_repo = AnomalyRepository(db_session)

    def get_resource_summary(self, account_id: str) -> Dict[str, Any]:
        """Get summary of resources by type."""
        resources = self.resource_repo.get_by_account(account_id, limit=1000)
        
        summary = {
            'ec2': {'count': 0, 'running': 0, 'stopped': 0},
            'rds': {'count': 0, 'active': 0},
            'lambda': {'count': 0},
            's3': {'count': 0, 'total_size_gb': 0},
            'ebs': {'count': 0, 'unattached': 0},
            'eip': {'count': 0, 'unattached': 0},
            'total': len(resources)
        }
        
        for resource in resources:
            resource_type = resource.resource_type.lower()
            
            if resource_type == 'ec2':
                summary['ec2']['count'] += 1
                if resource.status == 'running':
                    summary['ec2']['running'] += 1
                elif resource.status == 'stopped':
                    summary['ec2']['stopped'] += 1
            elif resource_type == 'rds':
                summary['rds']['count'] += 1
                if resource.status == 'available':
                    summary['rds']['active'] += 1
            elif resource_type == 'lambda':
                summary['lambda']['count'] += 1
            elif resource_type == 's3':
                summary['s3']['count'] += 1
                if hasattr(resource, 'metadata') and resource.metadata:
                    summary['s3']['total_size_gb'] += resource.metadata.get('size_gb', 0)
            elif resource_type == 'ebs':
                summary['ebs']['count'] += 1
                if resource.status == 'available':
                    summary['ebs']['unattached'] += 1
            elif resource_type == 'eip':
                summary['eip']['count'] += 1
                if resource.status == 'available':
                    summary['eip']['unattached'] += 1
        
        return summary

    def get_cost_summary(self, account_id: str, months: int = 6) -> Dict[str, Any]:
        """Get cost summary and trends."""
        snapshots = self.cost_repo.get_monthly_trend(account_id, months)
        
        if not snapshots:
            return {
                'current_month': 0,
                'previous_month': 0,
                'trend': 'stable',
                'monthly_average': 0,
                'top_services': []
            }
        
        # Calculate costs by month
        monthly_costs = {}
        service_costs = {}
        
        for snapshot in snapshots:
            month_key = snapshot.snapshot_date.strftime('%Y-%m')
            monthly_costs[month_key] = monthly_costs.get(month_key, 0) + snapshot.cost
            
            service = snapshot.service or 'Other'
            service_costs[service] = service_costs.get(service, 0) + snapshot.cost
        
        sorted_months = sorted(monthly_costs.items())
        current_month = sorted_months[-1][1] if sorted_months else 0
        previous_month = sorted_months[-2][1] if len(sorted_months) > 1 else 0
        
        # Calculate trend
        if previous_month == 0:
            trend = 'stable'
        elif current_month > previous_month * 1.1:
            trend = 'increasing'
        elif current_month < previous_month * 0.9:
            trend = 'decreasing'
        else:
            trend = 'stable'
        
        # Top services
        top_services = sorted(service_costs.items(), key=lambda x: x[1], reverse=True)[:3]
        
        return {
            'current_month': round(current_month, 2),
            'previous_month': round(previous_month, 2),
            'trend': trend,
            'monthly_average': round(sum(monthly_costs.values()) / len(monthly_costs), 2) if monthly_costs else 0,
            'top_services': [{'service': s[0], 'cost': round(s[1], 2)} for s in top_services]
        }

    def get_security_summary(self, account_id: str) -> Dict[str, Any]:
        """Get security findings summary."""
        findings = self.security_repo.get_by_account(account_id, limit=1000)
        
        severity_counts = {'CRITICAL': 0, 'HIGH': 0, 'MEDIUM': 0, 'LOW': 0}
        unresolved_count = 0
        
        for finding in findings:
            severity_counts[finding.severity] = severity_counts.get(finding.severity, 0) + 1
            if finding.status == 'OPEN':
                unresolved_count += 1
        
        return {
            'total_findings': len(findings),
            'critical': severity_counts['CRITICAL'],
            'high': severity_counts['HIGH'],
            'medium': severity_counts['MEDIUM'],
            'low': severity_counts['LOW'],
            'unresolved': unresolved_count,
            'compliance_score': max(0, 100 - (severity_counts['CRITICAL'] * 20 + severity_counts['HIGH'] * 10))
        }

    def get_anomaly_summary(self, account_id: str, hours: int = 24) -> Dict[str, Any]:
        """Get recent anomalies summary."""
        anomalies = self.anomaly_repo.get_recent(account_id, hours)
        
        type_counts = {}
        severity_counts = {'CRITICAL': 0, 'HIGH': 0, 'MEDIUM': 0, 'LOW': 0}
        
        for anomaly in anomalies:
            type_counts[anomaly.anomaly_type] = type_counts.get(anomaly.anomaly_type, 0) + 1
            severity_counts[anomaly.severity] = severity_counts.get(anomaly.severity, 0) + 1
        
        return {
            'total_anomalies': len(anomalies),
            'critical': severity_counts['CRITICAL'],
            'high': severity_counts['HIGH'],
            'medium': severity_counts['MEDIUM'],
            'low': severity_counts['LOW'],
            'types': type_counts,
            'recent_anomalies': [
                {
                    'type': a.anomaly_type,
                    'severity': a.severity,
                    'description': a.description,
                    'detected_at': a.detected_at.isoformat()
                }
                for a in anomalies[:5]
            ]
        }

    def build_context_string(self, account_id: str, include_metrics: bool = True, 
                            include_costs: bool = True, include_security: bool = True) -> str:
        """Build comprehensive infrastructure context string for AI."""
        context_parts = []
        
        try:
            if include_metrics:
                resources = self.get_resource_summary(account_id)
                context_parts.append(f"""AWS Infrastructure Summary:
- EC2 Instances: {resources['ec2']['running']} running, {resources['ec2']['stopped']} stopped ({resources['ec2']['count']} total)
- RDS Databases: {resources['rds']['active']} active ({resources['rds']['count']} total)
- Lambda Functions: {resources['lambda']['count']} deployed
- S3 Buckets: {resources['s3']['count']} buckets, {resources['s3']['total_size_gb']:.1f}GB storage
- EBS Volumes: {resources['ebs']['count']} total, {resources['ebs']['unattached']} unattached
- Elastic IPs: {resources['eip']['count']} total, {resources['eip']['unattached']} unattached
- Total Resources: {resources['total']}
""")
        except Exception as e:
            logger.error(f"Error building resource context: {str(e)}")
            context_parts.append("AWS Infrastructure: Unable to retrieve resource data")
        
        try:
            if include_costs:
                costs = self.get_cost_summary(account_id)
                top_services_str = ", ".join([f"{s['service']}: ${s['cost']}" for s in costs['top_services']])
                context_parts.append(f"""Current Spending:
- Current Month Cost: ${costs['current_month']}
- Previous Month Cost: ${costs['previous_month']}
- Trend: {costs['trend'].upper()}
- Monthly Average: ${costs['monthly_average']}
- Top Services: {top_services_str}
""")
        except Exception as e:
            logger.error(f"Error building cost context: {str(e)}")
            context_parts.append("Cost Data: Unable to retrieve cost information")
        
        try:
            if include_security:
                security = self.get_security_summary(account_id)
                context_parts.append(f"""Security Status:
- Total Findings: {security['total_findings']}
- Critical: {security['critical']}
- High: {security['high']}
- Medium: {security['medium']}
- Low: {security['low']}
- Unresolved: {security['unresolved']}
- Compliance Score: {security['compliance_score']}/100
""")
                
                # Add recent anomalies
                anomalies = self.get_anomaly_summary(account_id)
                if anomalies['total_anomalies'] > 0:
                    context_parts.append(f"""Recent Anomalies (24h):
- Total: {anomalies['total_anomalies']}
- Critical: {anomalies['critical']}
- High: {anomalies['high']}
""")
        except Exception as e:
            logger.error(f"Error building security context: {str(e)}")
            context_parts.append("Security Data: Unable to retrieve security information")
        
        return "\n".join(context_parts) if context_parts else "No infrastructure data available"


def get_aggregator(db_session: Session) -> InfrastructureAggregator:
    """Factory function to get aggregator instance."""
    return InfrastructureAggregator(db_session)
