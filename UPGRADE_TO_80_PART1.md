# Production Readiness Upgrade to 80+ Score - Part 1

## TASK 1: Remove All Mock Data from Frontend

### File: src/services/aws-service.ts

**REPLACE ALL MOCK DATA WITH REAL API CALLS**

```typescript
// REMOVE: All MOCK_RESOURCES, MOCK_ALERTS, MOCK_ACTIVITIES, MOCK_COST_DATA arrays
// REMOVE: All hardcoded demo data
// REMOVE: All fake delays

// ADD: Real API integration with retry logic
import { apiClient } from '@/lib/api-client';
import { logger } from '@/lib/utils/logger';

async function retryWithExponentialBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelayMs: number = 1000
): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            if (attempt < maxRetries - 1) {
                const delayMs = initialDelayMs * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }
    throw lastError || new Error('Max retries exceeded');
}

export const awsService = {
    async getResources(region: string = 'us-east-1'): Promise<Resource[]> {
        return retryWithExponentialBackoff(async () => {
            const res = await apiClient.get('/api/aws/resources', {
                params: { region, max_results: 100 },
                timeout: 10000,
            });
            return res.data.resources.map(mapBackendResource);
        });
    },

    async getResourcesByType(type: string, region: string = 'us-east-1'): Promise<Resource[]> {
        return retryWithExponentialBackoff(async () => {
            const res = await apiClient.get(`/api/aws/${type}/instances`, {
                params: { region, max_results: 100 },
                timeout: 10000,
            });
            const key = type === 'ec2' ? 'instances' : type === 's3' ? 'buckets' : 'resources';
            return res.data[key].map(mapBackendResource);
        });
    },

    async getAlerts(): Promise<Alert[]> {
        return retryWithExponentialBackoff(async () => {
            const res = await apiClient.get('/api/alerts', {
                params: { status: 'open', max_results: 50 },
                timeout: 5000,
            });
            return res.data.alerts.map(mapBackendAlert);
        });
    },

    async getActivities(limit: number = 10, region: string = 'us-east-1'): Promise<Activity[]> {
        return retryWithExponentialBackoff(async () => {
            const res = await apiClient.get('/api/aws/cloudtrail/events', {
                params: { region, max_results: limit },
                timeout: 10000,
            });
            return res.data.events.map(mapBackendActivity);
        });
    },

    async getCostData(months: number = 6): Promise<CostData[]> {
        return retryWithExponentialBackoff(async () => {
            const res = await apiClient.get('/api/costs/summary', {
                params: { months },
                timeout: 10000,
            });
            return res.data.cost_data.map((item: any) => ({
                month: item.month,
                cost: parseFloat(item.cost_usd),
            }));
        });
    },

    async getCurrentMonthCost(): Promise<number> {
        return retryWithExponentialBackoff(async () => {
            const res = await apiClient.get('/api/costs/current-month', {
                timeout: 5000,
            });
            return parseFloat(res.data.cost_usd);
        });
    },

    async getHygieneScore(): Promise<HygieneScore> {
        return retryWithExponentialBackoff(async () => {
            const res = await apiClient.get('/api/hygiene-score', {
                timeout: 10000,
            });
            return {
                overall: res.data.overall,
                security: res.data.security,
                costEfficiency: res.data.cost_efficiency,
                bestPractices: res.data.best_practices || 0,
                criticalIssues: res.data.critical_issues || 0,
                recommendations: res.data.recommendations || [],
            };
        });
    },

    async runScan(region: string = 'us-east-1'): Promise<{ success: boolean; resourcesScanned: number }> {
        return retryWithExponentialBackoff(async () => {
            const res = await apiClient.post('/api/scan', { region }, {
                timeout: 30000,
            });
            return {
                success: res.data.success,
                resourcesScanned: res.data.resources_scanned,
            };
        });
    },

    async connectAccount(accessKeyId: string, secretAccessKey: string, region: string) {
        return retryWithExponentialBackoff(async () => {
            const res = await apiClient.post('/api/aws/connect', {
                access_key_id: accessKeyId,
                secret_access_key: secretAccessKey,
                region,
            }, { timeout: 15000 });
            return {
                success: res.data.success,
                accountId: res.data.account_id,
            };
        });
    },

    async dismissAlert(alertId: string): Promise<void> {
        return retryWithExponentialBackoff(async () => {
            await apiClient.post(`/api/alerts/${alertId}/dismiss`, {}, {
                timeout: 5000,
            });
        });
    },

    async disconnectAccount(): Promise<void> {
        return retryWithExponentialBackoff(async () => {
            await apiClient.post('/api/aws/disconnect', {}, {
                timeout: 5000,
            });
        });
    },
};

// Helper functions for mapping backend responses
function mapBackendResource(resource: any): Resource {
    const statusMap: Record<string, ResourceStatus> = {
        'running': 'safe', 'stopped': 'warning', 'terminated': 'critical',
        'available': 'safe', 'creating': 'warning', 'deleting': 'critical',
        'failed': 'critical',
    };
    return {
        id: resource.id,
        name: resource.resource_name,
        value: resource.metadata?.count?.toString() || '1',
        status: statusMap[resource.status] || 'warning',
        description: resource.metadata?.description || resource.status,
        type: resource.resource_type,
        region: resource.region,
    };
}

function mapBackendAlert(alert: any): Alert {
    const typeMap: Record<string, AlertType> = {
        'critical': 'critical', 'high': 'critical', 'medium': 'warning',
        'low': 'info', 'info': 'info',
    };
    return {
        id: alert.id,
        type: typeMap[alert.severity] || 'info',
        title: alert.title,
        description: alert.description,
        time: new Date(alert.created_at).toLocaleString(),
        timestamp: alert.created_at,
    };
}

function mapBackendActivity(activity: any): Activity {
    return {
        id: activity.id,
        action: activity.action,
        resource: activity.resource_id,
        time: new Date(activity.created_at).toLocaleString(),
        user: activity.user_id || 'system',
        timestamp: activity.created_at,
        eventType: activity.action,
    };
}
```

### File: src/lib/aws/security-hub-service.ts

**REPLACE MOCK FINDINGS WITH REAL API CALLS**

```typescript
import { apiClient } from '@/lib/api-client';
import { logger } from '@/lib/utils/logger';

export interface SecurityFinding {
    id: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    status: string;
    resourceType: string;
    description: string;
    remediation?: string;
}

export async function getSecurityFindings(region?: string): Promise<SecurityFinding[]> {
    try {
        logger.info(`Fetching Security Hub findings from ${region || 'all regions'}`);
        
        const response = await apiClient.get('/api/aws/security-hub/findings', {
            params: { region: region || 'us-east-1', max_results: 100 },
            timeout: 10000,
        });
        
        return response.data.findings.map((finding: any) => ({
            id: finding.id,
            title: finding.title,
            severity: finding.severity.toLowerCase(),
            status: finding.status,
            resourceType: finding.resource_type,
            description: finding.description,
            remediation: finding.remediation,
        }));
    } catch (error) {
        logger.error(`Error fetching Security Hub findings: ${error}`);
        throw error;
    }
}

export async function getComplianceStatus(region?: string): Promise<{ compliant: number; nonCompliant: number }> {
    try {
        const response = await apiClient.get('/api/aws/security-hub/compliance', {
            params: { region: region || 'us-east-1' },
            timeout: 10000,
        });
        
        return {
            compliant: response.data.compliant_count,
            nonCompliant: response.data.non_compliant_count,
        };
    } catch (error) {
        logger.error(`Error getting compliance status: ${error}`);
        throw error;
    }
}

export async function getSeverityDistribution(region?: string): Promise<Record<string, number>> {
    try {
        const findings = await getSecurityFindings(region);
        const distribution: Record<string, number> = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
        };
        
        findings.forEach(finding => {
            distribution[finding.severity]++;
        });
        
        return distribution;
    } catch (error) {
        logger.error(`Error calculating severity distribution: ${error}`);
        throw error;
    }
}
```

## TASK 2: Activate WebSocket Architecture

### File: backend/routes/websocket_routes.py

```python
from flask import request
from flask_socketio import emit, join_room, leave_room
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

def register_websocket_routes(socketio, app):
    """Register all WebSocket routes"""
    
    @socketio.on('connect')
    def handle_connect():
        """Handle WebSocket connection"""
        user_id = request.args.get('user_id')
        if not user_id:
            logger.warning('WebSocket connection without user_id')
            return False
        
        join_room(f'user:{user_id}')
        logger.info(f'User {user_id} connected via WebSocket')
        emit('connected', {
            'status': 'connected',
            'timestamp': datetime.utcnow().isoformat(),
        })
        return True
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle WebSocket disconnection"""
        logger.info('WebSocket client disconnected')
    
    @socketio.on('subscribe_resource_updates')
    def handle_subscribe_resources(data):
        """Subscribe to real-time resource updates"""
        user_id = request.args.get('user_id')
        resource_type = data.get('resource_type')
        join_room(f'resources:{resource_type}')
        emit('subscribed', {
            'resource_type': resource_type,
            'timestamp': datetime.utcnow().isoformat(),
        })
    
    @socketio.on('subscribe_alerts')
    def handle_subscribe_alerts(data):
        """Subscribe to real-time alerts"""
        user_id = request.args.get('user_id')
        join_room(f'alerts:{user_id}')
        emit('subscribed', {
            'channel': 'alerts',
            'timestamp': datetime.utcnow().isoformat(),
        })
    
    @socketio.on('subscribe_cloudtrail')
    def handle_subscribe_cloudtrail(data):
        """Subscribe to live CloudTrail events"""
        user_id = request.args.get('user_id')
        region = data.get('region', 'us-east-1')
        join_room(f'cloudtrail:{region}')
        emit('subscribed', {
            'channel': 'cloudtrail',
            'region': region,
            'timestamp': datetime.utcnow().isoformat(),
        })
    
    @socketio.on('ping')
    def handle_ping():
        """Handle heartbeat ping"""
        emit('pong', {
            'timestamp': datetime.utcnow().isoformat(),
        })
    
    return socketio
```

### File: src/lib/websocket-client.ts

```typescript
import io, { Socket } from 'socket.io-client';
import { logger } from '@/lib/utils/logger';

class WebSocketClient {
    private socket: Socket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private heartbeatInterval: NodeJS.Timeout | null = null;

    connect(userId: string, serverUrl: string = process.env.REACT_APP_API_URL || 'http://localhost:5000'): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.socket = io(serverUrl, {
                    query: { user_id: userId },
                    reconnection: true,
                    reconnectionDelay: this.reconnectDelay,
                    reconnectionDelayMax: 5000,
                    reconnectionAttempts: this.maxReconnectAttempts,
                });

                this.socket.on('connect', () => {
                    logger.info('WebSocket connected');
                    this.reconnectAttempts = 0;
                    this.startHeartbeat();
                    resolve();
                });

                this.socket.on('disconnect', () => {
                    logger.warn('WebSocket disconnected');
                    this.stopHeartbeat();
                });

                this.socket.on('error', (error) => {
                    logger.error(`WebSocket error: ${error}`);
                    reject(error);
                });

                this.socket.on('connect_error', (error) => {
                    logger.error(`WebSocket connection error: ${error}`);
                    this.reconnectAttempts++;
                });
            } catch (error) {
                logger.error(`Failed to connect WebSocket: ${error}`);
                reject(error);
            }
        });
    }

    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            if (this.socket?.connected) {
                this.socket.emit('ping');
            }
        }, 30000);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    subscribeToResourceUpdates(resourceType: string, callback: (data: any) => void): void {
        if (!this.socket) return;
        
        this.socket.emit('subscribe_resource_updates', { resource_type: resourceType });
        this.socket.on(`resource_update:${resourceType}`, callback);
    }

    subscribeToAlerts(callback: (data: any) => void): void {
        if (!this.socket) return;
        
        this.socket.emit('subscribe_alerts', {});
        this.socket.on('alert', callback);
    }

    subscribeToCloudTrail(region: string, callback: (data: any) => void): void {
        if (!this.socket) return;
        
        this.socket.emit('subscribe_cloudtrail', { region });
        this.socket.on(`cloudtrail:${region}`, callback);
    }

    disconnect(): void {
        this.stopHeartbeat();
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    isConnected(): boolean {
        return this.socket?.connected || false;
    }
}

export const wsClient = new WebSocketClient();
```

## TASK 3: Database Persistence Implementation

### Backend: backend/repositories/resource_repository.py

```python
from sqlalchemy.orm import Session
from db_models import Resource, CloudAccount
from typing import List, Optional
from datetime import datetime

class ResourceRepository:
    """Repository for resource persistence"""
    
    @staticmethod
    def create_resource(db: Session, cloud_account_id: str, resource_data: dict) -> Resource:
        """Create and persist a new resource"""
        resource = Resource(
            cloud_account_id=cloud_account_id,
            resource_id=resource_data['id'],
            resource_type=resource_data['type'],
            resource_name=resource_data['name'],
            region=resource_data['region'],
            status=resource_data['status'],
            metadata=resource_data.get('metadata', {}),
            tags=resource_data.get('tags', {}),
            estimated_monthly_cost=resource_data.get('cost', 0.0),
        )
        db.add(resource)
        db.commit()
        db.refresh(resource)
        return resource
    
    @staticmethod
    def get_resources_by_account(db: Session, account_id: str, limit: int = 100) -> List[Resource]:
        """Get all resources for an account"""
        return db.query(Resource).filter(
            Resource.cloud_account_id == account_id
        ).limit(limit).all()
    
    @staticmethod
    def get_resources_by_type(db: Session, account_id: str, resource_type: str) -> List[Resource]:
        """Get resources by type"""
        return db.query(Resource).filter(
            Resource.cloud_account_id == account_id,
            Resource.resource_type == resource_type
        ).all()
    
    @staticmethod
    def update_resource_status(db: Session, resource_id: str, status: str) -> Resource:
        """Update resource status"""
        resource = db.query(Resource).filter(Resource.id == resource_id).first()
        if resource:
            resource.status = status
            resource.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(resource)
        return resource
    
    @staticmethod
    def delete_resource(db: Session, resource_id: str) -> bool:
        """Delete a resource"""
        resource = db.query(Resource).filter(Resource.id == resource_id).first()
        if resource:
            db.delete(resource)
            db.commit()
            return True
        return False
```

### Backend: backend/routes/resources_routes.py

```python
from flask import Blueprint, request, jsonify
from database import SessionLocal
from repositories.resource_repository import ResourceRepository
from middleware_v2 import require_auth
from datetime import datetime

resources_bp = Blueprint('resources', __name__, url_prefix='/api/resources')

@resources_bp.route('', methods=['GET'])
@require_auth
def list_resources():
    """List all resources for user's cloud account"""
    db = SessionLocal()
    try:
        account_id = request.args.get('account_id')
        limit = int(request.args.get('limit', 100))
        
        resources = ResourceRepository.get_resources_by_account(db, account_id, limit)
        
        return jsonify({
            'success': True,
            'count': len(resources),
            'resources': [
                {
                    'id': r.id,
                    'resource_id': r.resource_id,
                    'resource_type': r.resource_type,
                    'resource_name': r.resource_name,
                    'region': r.region,
                    'status': r.status,
                    'metadata': r.metadata,
                    'tags': r.tags,
                    'cost': r.estimated_monthly_cost,
                    'created_at': r.created_at.isoformat(),
                    'updated_at': r.updated_at.isoformat(),
                }
                for r in resources
            ],
            'timestamp': datetime.utcnow().isoformat(),
        }), 200
    finally:
        db.close()

@resources_bp.route('/by-type', methods=['GET'])
@require_auth
def get_resources_by_type():
    """Get resources filtered by type"""
    db = SessionLocal()
    try:
        account_id = request.args.get('account_id')
        resource_type = request.args.get('type')
        
        resources = ResourceRepository.get_resources_by_type(db, account_id, resource_type)
        
        return jsonify({
            'success': True,
            'count': len(resources),
            'type': resource_type,
            'resources': [
                {
                    'id': r.id,
                    'resource_id': r.resource_id,
                    'resource_name': r.resource_name,
                    'status': r.status,
                    'region': r.region,
                    'cost': r.estimated_monthly_cost,
                }
                for r in resources
            ],
        }), 200
    finally:
        db.close()
```

## TASK 4: Remove Hardcoded AI Context

### Backend: backend/services/infrastructure_context_builder.py

```python
from database import SessionLocal
from db_models import Resource, CostSnapshot, SecurityFinding, AuditLog
from services.aws_service import AWSServiceClient
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

class InfrastructureContextBuilder:
    """Builds dynamic infrastructure context for AI prompts"""
    
    @staticmethod
    def build_context(account_id: str, region: str = 'us-east-1') -> str:
        """Build real infrastructure context from database and AWS"""
        db = SessionLocal()
        try:
            # Fetch real resources from database
            resources = db.query(Resource).filter(
                Resource.cloud_account_id == account_id
            ).all()
            
            # Fetch real cost data
            costs = db.query(CostSnapshot).filter(
                CostSnapshot.cloud_account_id == account_id
            ).order_by(CostSnapshot.snapshot_date.desc()).limit(12).all()
            
            # Fetch real security findings
            findings = db.query(SecurityFinding).filter(
                SecurityFinding.resource_id.in_([r.id for r in resources])
            ).all()
            
            # Fetch recent activity
            activities = db.query(AuditLog).filter(
                AuditLog.user_id.in_([r.cloud_account_id for r in resources])
            ).order_by(AuditLog.created_at.desc()).limit(10).all()
            
            # Build context string
            context = f"""
CURRENT INFRASTRUCTURE SUMMARY:

Resources:
- Total Resources: {len(resources)}
- EC2 Instances: {len([r for r in resources if r.resource_type == 'ec2'])}
- RDS Databases: {len([r for r in resources if r.resource_type == 'rds'])}
- S3 Buckets: {len([r for r in resources if r.resource_type == 's3'])}
- Lambda Functions: {len([r for r in resources if r.resource_type == 'lambda'])}

Cost Analysis:
- Current Month Cost: ${costs[0].cost_usd if costs else 0:.2f}
- Average Monthly Cost: ${sum(c.cost_usd for c in costs) / len(costs) if costs else 0:.2f}
- Cost Trend: {((costs[0].cost_usd - costs[-1].cost_usd) / costs[-1].cost_usd * 100) if len(costs) > 1 else 0:.1f}%

Security Status:
- Total Findings: {len(findings)}
- Critical: {len([f for f in findings if f.severity == 'CRITICAL'])}
- High: {len([f for f in findings if f.severity == 'HIGH'])}
- Medium: {len([f for f in findings if f.severity == 'MEDIUM'])}

Recent Activity:
{chr(10).join([f"- {a.action} on {a.resource_type} at {a.created_at}" for a in activities[:5]])}

Region: {region}
"""
            return context
        finally:
            db.close()
```

### Backend: backend/routes/ai_routes_v2.py

```python
from flask import Blueprint, request, jsonify
from services.llm_provider import get_llm_router
from services.infrastructure_context_builder import InfrastructureContextBuilder
from middleware_v2 import require_auth
from database import SessionLocal
from db_models import AIConversation, AIMessage
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')

@ai_bp.route('/query', methods=['POST'])
@require_auth
def ai_query():
    """Query AI with real infrastructure context"""
    data = request.get_json()
    question = data.get('question')
    account_id = data.get('account_id')
    region = data.get('region', 'us-east-1')
    
    if not question or not account_id:
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        # Build REAL infrastructure context
        context = InfrastructureContextBuilder.build_context(account_id, region)
        
        # Get LLM router
        router = get_llm_router()
        
        # Create system prompt with real context
        system_prompt = f"""You are an AWS cloud operations expert. 
        
{context}

Provide specific, actionable recommendations based on the actual infrastructure above."""
        
        # Get response from LLM
        response = router.complete(
            prompt=question,
            provider='claude',
            system_prompt=system_prompt,
            max_tokens=2000
        )
        
        # Store in database
        db = SessionLocal()
        try:
            conversation = AIConversation(
                user_id=request.user_id,
                title=question[:100],
                ai_provider='claude',
                model='claude-3-5-sonnet-20241022',
                total_tokens_used=response.tokens_used,
                total_cost_usd=response.cost_usd,
            )
            db.add(conversation)
            db.flush()
            
            message = AIMessage(
                conversation_id=conversation.id,
                role='assistant',
                content=response.content,
                tokens_used=response.tokens_used,
                cost_usd=response.cost_usd,
            )
            db.add(message)
            db.commit()
        finally:
            db.close()
        
        return jsonify({
            'success': True,
            'response': response.content,
            'tokens_used': response.tokens_used,
            'cost_usd': response.cost_usd,
            'timestamp': datetime.utcnow().isoformat(),
        }), 200
    
    except Exception as e:
        logger.error(f'AI query error: {str(e)}')
        return jsonify({'error': str(e)}), 500
```

---

**Continue to Part 2 for remaining tasks...**
