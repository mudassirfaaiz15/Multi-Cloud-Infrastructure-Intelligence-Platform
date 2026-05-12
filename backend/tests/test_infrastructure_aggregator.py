"""Tests for infrastructure aggregator service."""

import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from db_models import Base, Resource, CostSnapshot, SecurityFinding, Anomaly
from services.infrastructure_aggregator import InfrastructureAggregator


@pytest.fixture
def db_session():
    """Create in-memory SQLite database for testing."""
    engine = create_engine('sqlite:///:memory:')
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


@pytest.fixture
def aggregator(db_session):
    """Create aggregator instance."""
    return InfrastructureAggregator(db_session)


class TestResourceSummary:
    """Test resource summary aggregation."""

    def test_get_resource_summary(self, db_session, aggregator):
        """Test getting resource summary."""
        # Create test resources
        db_session.add(Resource(
            resource_id='ec2-001',
            resource_type='EC2',
            name='Instance 1',
            region='us-east-1',
            status='running',
            account_id='default'
        ))
        db_session.add(Resource(
            resource_id='ec2-002',
            resource_type='EC2',
            name='Instance 2',
            region='us-east-1',
            status='stopped',
            account_id='default'
        ))
        db_session.add(Resource(
            resource_id='rds-001',
            resource_type='RDS',
            name='Database',
            region='us-east-1',
            status='available',
            account_id='default'
        ))
        db_session.commit()
        
        summary = aggregator.get_resource_summary('default')
        
        assert summary['ec2']['count'] == 2
        assert summary['ec2']['running'] == 1
        assert summary['ec2']['stopped'] == 1
        assert summary['rds']['count'] == 1
        assert summary['total'] == 3

    def test_empty_resource_summary(self, db_session, aggregator):
        """Test resource summary with no resources."""
        summary = aggregator.get_resource_summary('default')
        
        assert summary['total'] == 0
        assert summary['ec2']['count'] == 0
        assert summary['rds']['count'] == 0


class TestCostSummary:
    """Test cost summary aggregation."""

    def test_get_cost_summary(self, db_session, aggregator):
        """Test getting cost summary."""
        now = datetime.utcnow()
        
        # Create cost snapshots
        db_session.add(CostSnapshot(
            account_id='default',
            service='EC2',
            cost=100,
            snapshot_date=now - timedelta(days=30)
        ))
        db_session.add(CostSnapshot(
            account_id='default',
            service='EC2',
            cost=150,
            snapshot_date=now
        ))
        db_session.add(CostSnapshot(
            account_id='default',
            service='RDS',
            cost=50,
            snapshot_date=now
        ))
        db_session.commit()
        
        summary = aggregator.get_cost_summary('default', months=2)
        
        assert summary['current_month'] > 0
        assert summary['trend'] in ['increasing', 'decreasing', 'stable']
        assert len(summary['top_services']) > 0

    def test_empty_cost_summary(self, db_session, aggregator):
        """Test cost summary with no data."""
        summary = aggregator.get_cost_summary('default')
        
        assert summary['current_month'] == 0
        assert summary['previous_month'] == 0
        assert summary['trend'] == 'stable'


class TestSecuritySummary:
    """Test security summary aggregation."""

    def test_get_security_summary(self, db_session, aggregator):
        """Test getting security summary."""
        # Create security findings
        db_session.add(SecurityFinding(
            account_id='default',
            resource_id='ec2-001',
            severity='CRITICAL',
            title='Critical Issue',
            description='',
            status='OPEN'
        ))
        db_session.add(SecurityFinding(
            account_id='default',
            resource_id='ec2-002',
            severity='HIGH',
            title='High Issue',
            description='',
            status='OPEN'
        ))
        db_session.add(SecurityFinding(
            account_id='default',
            resource_id='ec2-003',
            severity='HIGH',
            title='High Issue 2',
            description='',
            status='RESOLVED'
        ))
        db_session.commit()
        
        summary = aggregator.get_security_summary('default')
        
        assert summary['total_findings'] == 3
        assert summary['critical'] == 1
        assert summary['high'] == 2
        assert summary['unresolved'] == 2

    def test_empty_security_summary(self, db_session, aggregator):
        """Test security summary with no findings."""
        summary = aggregator.get_security_summary('default')
        
        assert summary['total_findings'] == 0
        assert summary['critical'] == 0
        assert summary['compliance_score'] == 100


class TestAnomalySummary:
    """Test anomaly summary aggregation."""

    def test_get_anomaly_summary(self, db_session, aggregator):
        """Test getting anomaly summary."""
        now = datetime.utcnow()
        
        # Create anomalies
        db_session.add(Anomaly(
            account_id='default',
            anomaly_type='COST_SPIKE',
            severity='HIGH',
            description='Cost increased',
            status='OPEN',
            detected_at=now - timedelta(hours=12)
        ))
        db_session.add(Anomaly(
            account_id='default',
            anomaly_type='SECURITY_RISK',
            severity='CRITICAL',
            description='Security risk detected',
            status='OPEN',
            detected_at=now - timedelta(hours=6)
        ))
        db_session.commit()
        
        summary = aggregator.get_anomaly_summary('default', hours=24)
        
        assert summary['total_anomalies'] == 2
        assert summary['critical'] == 1
        assert summary['high'] == 1

    def test_empty_anomaly_summary(self, db_session, aggregator):
        """Test anomaly summary with no anomalies."""
        summary = aggregator.get_anomaly_summary('default')
        
        assert summary['total_anomalies'] == 0
        assert summary['critical'] == 0


class TestContextString:
    """Test context string building."""

    def test_build_context_string(self, db_session, aggregator):
        """Test building context string."""
        # Create test data
        db_session.add(Resource(
            resource_id='ec2-001',
            resource_type='EC2',
            name='Instance',
            region='us-east-1',
            status='running',
            account_id='default'
        ))
        db_session.add(CostSnapshot(
            account_id='default',
            service='EC2',
            cost=100,
            snapshot_date=datetime.utcnow()
        ))
        db_session.commit()
        
        context = aggregator.build_context_string(
            'default',
            include_metrics=True,
            include_costs=True,
            include_security=False
        )
        
        assert 'AWS Infrastructure Summary' in context
        assert 'Current Spending' in context
        assert 'EC2' in context

    def test_context_string_with_error_handling(self, db_session, aggregator):
        """Test context string handles errors gracefully."""
        # Don't add any data - should handle gracefully
        context = aggregator.build_context_string('nonexistent-account')
        
        assert isinstance(context, str)
        assert len(context) > 0


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
