"""
Schema Validation Tests
Tests for Pydantic schema validation
"""

import pytest
from datetime import datetime
from pydantic import ValidationError
from backend.schemas import (
    UserSchema,
    CreateUserSchema,
    ResourceSchema,
    AlertSchema,
    CostDataSchema,
    SecurityScoreSchema,
    LoginSchema,
)


class TestUserSchema:
    """Test user schema validation"""
    
    def test_valid_user_schema(self):
        """Test valid user data"""
        user_data = {
            'id': '123',
            'email': 'user@example.com',
            'name': 'Test User',
            'role': 'viewer',
            'status': 'active',
            'created_at': datetime.now(),
        }
        user = UserSchema(**user_data)
        assert user.email == 'user@example.com'
    
    def test_invalid_email(self):
        """Test invalid email validation"""
        user_data = {
            'id': '123',
            'email': 'invalid-email',
            'name': 'Test User',
            'role': 'viewer',
            'status': 'active',
            'created_at': datetime.now(),
        }
        with pytest.raises(ValidationError):
            UserSchema(**user_data)
    
    def test_invalid_role(self):
        """Test invalid role validation"""
        user_data = {
            'id': '123',
            'email': 'user@example.com',
            'name': 'Test User',
            'role': 'invalid_role',
            'status': 'active',
            'created_at': datetime.now(),
        }
        with pytest.raises(ValidationError):
            UserSchema(**user_data)


class TestCreateUserSchema:
    """Test create user schema validation"""
    
    def test_valid_create_user(self):
        """Test valid user creation data"""
        user_data = {
            'email': 'newuser@example.com',
            'name': 'New User',
            'role': 'editor',
            'password': 'SecurePass123!',
        }
        user = CreateUserSchema(**user_data)
        assert user.email == 'newuser@example.com'
    
    def test_weak_password(self):
        """Test weak password validation"""
        user_data = {
            'email': 'newuser@example.com',
            'name': 'New User',
            'role': 'editor',
            'password': 'weak',
        }
        with pytest.raises(ValidationError):
            CreateUserSchema(**user_data)
    
    def test_password_without_uppercase(self):
        """Test password without uppercase"""
        user_data = {
            'email': 'newuser@example.com',
            'name': 'New User',
            'role': 'editor',
            'password': 'securepass123!',
        }
        with pytest.raises(ValidationError):
            CreateUserSchema(**user_data)
    
    def test_password_without_digit(self):
        """Test password without digit"""
        user_data = {
            'email': 'newuser@example.com',
            'name': 'New User',
            'role': 'editor',
            'password': 'SecurePass!',
        }
        with pytest.raises(ValidationError):
            CreateUserSchema(**user_data)
    
    def test_password_without_special_char(self):
        """Test password without special character"""
        user_data = {
            'email': 'newuser@example.com',
            'name': 'New User',
            'role': 'editor',
            'password': 'SecurePass123',
        }
        with pytest.raises(ValidationError):
            CreateUserSchema(**user_data)


class TestResourceSchema:
    """Test resource schema validation"""
    
    def test_valid_resource(self):
        """Test valid resource data"""
        resource_data = {
            'id': 'i-1234567890abcdef0',
            'name': 'test-instance',
            'type': 'ec2',
            'region': 'us-east-1',
            'status': 'safe',
            'value': '1',
            'description': 'Test instance',
        }
        resource = ResourceSchema(**resource_data)
        assert resource.name == 'test-instance'
    
    def test_invalid_status(self):
        """Test invalid status"""
        resource_data = {
            'id': 'i-1234567890abcdef0',
            'name': 'test-instance',
            'type': 'ec2',
            'region': 'us-east-1',
            'status': 'invalid_status',
            'value': '1',
            'description': 'Test instance',
        }
        with pytest.raises(ValidationError):
            ResourceSchema(**resource_data)


class TestCostDataSchema:
    """Test cost data schema validation"""
    
    def test_valid_cost_data(self):
        """Test valid cost data"""
        cost_data = {
            'month': '2024-01',
            'cost': 100.50,
        }
        cost = CostDataSchema(**cost_data)
        assert cost.cost == 100.50
    
    def test_cost_with_breakdown(self):
        """Test cost with breakdown"""
        cost_data = {
            'month': '2024-01',
            'cost': 100.50,
            'breakdown': {
                'compute': 50.00,
                'storage': 30.00,
                'database': 20.50,
            }
        }
        cost = CostDataSchema(**cost_data)
        assert cost.breakdown['compute'] == 50.00


class TestSecurityScoreSchema:
    """Test security score schema validation"""
    
    def test_valid_security_score(self):
        """Test valid security score"""
        score_data = {
            'overall': 85,
            'security': 90,
            'cost_efficiency': 75,
            'best_practices': 80,
            'critical_issues': 2,
            'recommendations': ['Fix IAM policies', 'Enable encryption'],
        }
        score = SecurityScoreSchema(**score_data)
        assert score.overall == 85
    
    def test_invalid_score_range(self):
        """Test invalid score range"""
        score_data = {
            'overall': 150,  # Invalid: > 100
            'security': 90,
            'cost_efficiency': 75,
            'best_practices': 80,
            'critical_issues': 2,
            'recommendations': [],
        }
        with pytest.raises(ValidationError):
            SecurityScoreSchema(**score_data)


class TestLoginSchema:
    """Test login schema validation"""
    
    def test_valid_login(self):
        """Test valid login data"""
        login_data = {
            'email': 'user@example.com',
            'password': 'password123',
        }
        login = LoginSchema(**login_data)
        assert login.email == 'user@example.com'
    
    def test_invalid_email_format(self):
        """Test invalid email format"""
        login_data = {
            'email': 'invalid-email',
            'password': 'password123',
        }
        with pytest.raises(ValidationError):
            LoginSchema(**login_data)
