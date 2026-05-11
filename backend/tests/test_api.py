"""Backend tests for ConsoleSensei Cloud Ops API"""

import pytest
import json
from api import app, logger


@pytest.fixture
def client():
    """Flask test client"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


class TestHealthEndpoints:
    """Test health check endpoints"""
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get('/health')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'healthy'
        assert 'timestamp' in data
    
    def test_api_info(self, client):
        """Test API info endpoint"""
        response = client.get('/api/v1/info')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] == True
        assert 'endpoints' in data['data']


class TestLegacyEndpoints:
    """Test legacy endpoint migration"""
    
    def test_legacy_scan_endpoint(self, client):
        """Test legacy scan endpoint returns redirect"""
        response = client.post('/api/v1/scan')
        assert response.status_code == 301
        data = json.loads(response.data)
        assert 'new_endpoints' in data


class TestErrorHandling:
    """Test error handling"""
    
    def test_404_not_found(self, client):
        """Test 404 error handling"""
        response = client.get('/api/v1/nonexistent')
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] == False
    
    def test_method_not_allowed(self, client):
        """Test method not allowed"""
        response = client.get('/api/v1/auth/login')  # Should be POST
        # Will either be 405 or 404 depending on blueprint routing
        assert response.status_code in [404, 405]


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
