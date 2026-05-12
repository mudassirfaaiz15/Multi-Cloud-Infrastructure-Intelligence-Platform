"""Tests for repository pattern implementations."""

import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from db_models import Base, Resource, CostSnapshot, SecurityFinding, Anomaly, AuditLog
from repositories.resource_repository import ResourceRepository
from repositories.cost_snapshot_repository import CostSnapshotRepository
from repositories.security_finding_repository import SecurityFindingRepository
from repositories.anomaly_repository import AnomalyRepository
from repositories.audit_log_repository import AuditLogRepository


@pytest.fixture
def db_session():
    """Create in-memory SQLite database for testing."""
    engine = create_engine('sqlite:///:memory:')
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


class TestResourceRepository:
    """Test resource repository operations."""

    def test_create_resource(self, db_session):
        """Test creating a resource."""
        repo = ResourceRepository(db_session)
        resource = repo.create(
            resource_id='ec2-001',
            resource_type='EC2',
            name='Test Instance',
            region='us-east-1',
            status='running',
            account_id='default'
        )
        assert resource.id is not None
        assert resource.resource_id == 'ec2-001'
        assert resource.resource_type == 'EC2'

    def test_get_by_resource_id(self, db_session):
        """Test retrieving resource by ID."""
        repo = ResourceRepository(db_session)
        repo.create(
            resource_id='ec2-001',
            resource_type='EC2',
            name='Test Instance',
            region='us-east-1',
            status='running',
            account_id='default'
        )
        resource = repo.get_by_resource_id('ec2-001')
        assert resource is not None
        assert resource.resource_id == 'ec2-001'

    def test_get_by_type(self, db_session):
        """Test retrieving resources by type."""
        repo = ResourceRepository(db_session)
        repo.create(resource_id='ec2-001', resource_type='EC2', name='Instance 1', region='us-east-1', status='running', account_id='default')
        repo.create(resource_id='ec2-002', resource_type='EC2', name='Instance 2', region='us-east-1', status='running', account_id='default')
        repo.create(resource_id='rds-001', resource_type='RDS', name='Database', region='us-east-1', status='available', account_id='default')
        
        ec2_resources = repo.get_by_type('EC2')
        assert len(ec2_resources) == 2

    def test_upsert_resource(self, db_session):
        """Test upsert operation."""
        repo = ResourceRepository(db_session)
        
        # Create initial resource
        resource1 = repo.upsert(
            resource_id='ec2-001',
            resource_type='EC2',
            name='Instance 1',
            region='us-east-1',
            status='running',
            account_id='default'
        )
        
        # Upsert same resource with updated name
        resource2 = repo.upsert(
            resource_id='ec2-001',
            name='Instance 1 Updated'
        )
        
        assert resource1.id == resource2.id
        assert resource2.name == 'Instance 1 Updated'


class TestCostSnapshotRepository:
    """Test cost snapshot repository operations."""

    def test_create_cost_snapshot(self, db_session):
        """Test creating a cost snapshot."""
        repo = CostSnapshotRepository(db_session)
        snapshot = repo.create(
            account_id='default',
            service='EC2',
            cost=150.50,
            snapshot_date=datetime.utcnow()
        )
        assert snapshot.id is not None
        assert snapshot.cost == 150.50

    def test_get_by_date_range(self, db_session):
        """Test retrieving snapshots by date range."""
        repo = CostSnapshotRepository(db_session)
        
        now = datetime.utcnow()
        repo.create(account_id='default', service='EC2', cost=100, snapshot_date=now - timedelta(days=5))
        repo.create(account_id='default', service='EC2', cost=150, snapshot_date=now - timedelta(days=3))
        repo.create(account_id='default', service='EC2', cost=200, snapshot_date=now)
        
        snapshots = repo.get_by_date_range(
            'default',
            now - timedelta(days=4),
            now - timedelta(days=2)
        )
        assert len(snapshots) == 1
        assert snapshots[0].cost == 150

    def test_get_total_cost(self, db_session):
        """Test calculating total cost."""
        repo = CostSnapshotRepository(db_session)
        
        now = datetime.utcnow()
        repo.create(account_id='default', service='EC2', cost=100, snapshot_date=now - timedelta(days=5))
        repo.create(account_id='default', service='RDS', cost=50, snapshot_date=now - timedelta(days=5))
        repo.create(account_id='default', service='S3', cost=25, snapshot_date=now)
        
        total = repo.get_total_cost('default', now - timedelta(days=10), now)
        assert total == 175


class TestSecurityFindingRepository:
    """Test security finding repository operations."""

    def test_create_finding(self, db_session):
        """Test creating a security finding."""
        repo = SecurityFindingRepository(db_session)
        finding = repo.create(
            account_id='default',
            resource_id='ec2-001',
            severity='CRITICAL',
            title='Unencrypted data',
            description='S3 bucket has no encryption',
            status='OPEN'
        )
        assert finding.id is not None
        assert finding.severity == 'CRITICAL'

    def test_get_critical_findings(self, db_session):
        """Test retrieving critical findings."""
        repo = SecurityFindingRepository(db_session)
        
        repo.create(account_id='default', resource_id='ec2-001', severity='CRITICAL', title='Critical Issue', description='', status='OPEN')
        repo.create(account_id='default', resource_id='ec2-002', severity='HIGH', title='High Issue', description='', status='OPEN')
        repo.create(account_id='default', resource_id='ec2-003', severity='CRITICAL', title='Another Critical', description='', status='OPEN')
        
        critical = repo.get_critical_findings('default')
        assert len(critical) == 2

    def test_count_by_severity(self, db_session):
        """Test counting findings by severity."""
        repo = SecurityFindingRepository(db_session)
        
        repo.create(account_id='default', resource_id='ec2-001', severity='CRITICAL', title='', description='', status='OPEN')
        repo.create(account_id='default', resource_id='ec2-002', severity='HIGH', title='', description='', status='OPEN')
        repo.create(account_id='default', resource_id='ec2-003', severity='HIGH', title='', description='', status='OPEN')
        repo.create(account_id='default', resource_id='ec2-004', severity='MEDIUM', title='', description='', status='OPEN')
        
        counts = repo.count_by_severity('default')
        assert counts['CRITICAL'] == 1
        assert counts['HIGH'] == 2
        assert counts['MEDIUM'] == 1


class TestAnomalyRepository:
    """Test anomaly repository operations."""

    def test_create_anomaly(self, db_session):
        """Test creating an anomaly."""
        repo = AnomalyRepository(db_session)
        anomaly = repo.create(
            account_id='default',
            anomaly_type='COST_SPIKE',
            severity='HIGH',
            description='Cost increased 50%',
            status='OPEN'
        )
        assert anomaly.id is not None
        assert anomaly.anomaly_type == 'COST_SPIKE'

    def test_get_unresolved(self, db_session):
        """Test retrieving unresolved anomalies."""
        repo = AnomalyRepository(db_session)
        
        repo.create(account_id='default', anomaly_type='COST_SPIKE', severity='HIGH', description='', status='OPEN')
        repo.create(account_id='default', anomaly_type='SECURITY_RISK', severity='CRITICAL', description='', status='OPEN')
        repo.create(account_id='default', anomaly_type='COST_SPIKE', severity='MEDIUM', description='', status='RESOLVED')
        
        unresolved = repo.get_unresolved('default')
        assert len(unresolved) == 2

    def test_get_recent(self, db_session):
        """Test retrieving recent anomalies."""
        repo = AnomalyRepository(db_session)
        
        now = datetime.utcnow()
        repo.create(account_id='default', anomaly_type='COST_SPIKE', severity='HIGH', description='', status='OPEN', detected_at=now - timedelta(hours=25))
        repo.create(account_id='default', anomaly_type='SECURITY_RISK', severity='CRITICAL', description='', status='OPEN', detected_at=now - timedelta(hours=12))
        repo.create(account_id='default', anomaly_type='COST_SPIKE', severity='MEDIUM', description='', status='OPEN', detected_at=now - timedelta(hours=1))
        
        recent = repo.get_recent('default', hours=24)
        assert len(recent) == 2


class TestAuditLogRepository:
    """Test audit log repository operations."""

    def test_log_action(self, db_session):
        """Test logging an action."""
        repo = AuditLogRepository(db_session)
        log = repo.log_action(
            user_id='user-001',
            action='RESOURCE_CREATED',
            resource_id='ec2-001',
            details={'instance_type': 't2.micro'}
        )
        assert log.id is not None
        assert log.action == 'RESOURCE_CREATED'

    def test_get_by_user(self, db_session):
        """Test retrieving logs by user."""
        repo = AuditLogRepository(db_session)
        
        repo.log_action('user-001', 'RESOURCE_CREATED', 'ec2-001')
        repo.log_action('user-001', 'RESOURCE_DELETED', 'ec2-002')
        repo.log_action('user-002', 'RESOURCE_CREATED', 'rds-001')
        
        logs = repo.get_by_user('user-001')
        assert len(logs) == 2

    def test_get_by_action(self, db_session):
        """Test retrieving logs by action."""
        repo = AuditLogRepository(db_session)
        
        repo.log_action('user-001', 'RESOURCE_CREATED', 'ec2-001')
        repo.log_action('user-002', 'RESOURCE_CREATED', 'ec2-002')
        repo.log_action('user-001', 'RESOURCE_DELETED', 'ec2-003')
        
        logs = repo.get_by_action('RESOURCE_CREATED')
        assert len(logs) == 2


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
