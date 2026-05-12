import type { Resource, Alert, Activity, CostData, ResourceStatus, AlertType } from '@/types';
import { apiClient } from '@/lib/api-client';

export interface HygieneScore {
    overall: number;
    security: number;
    costEfficiency: number;
    bestPractices: number;
    criticalIssues: number;
    recommendations: string[];
}

/**
 * AWS Service - Real API Integration
 * All calls go to backend REST API endpoints
 */
export const awsService = {
    /**
     * Fetch all AWS resources from backend
     */
    async getResources(): Promise<Resource[]> {
        try {
            const response = await apiClient.get('/api/v1/resources');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching resources:', error);
            throw error;
        }
    },

    /**
     * Fetch resources by type from backend
     */
    async getResourcesByType(type: string): Promise<Resource[]> {
        try {
            const response = await apiClient.get(`/api/v1/resources?type=${type}`);
            return response.data || [];
        } catch (error) {
            console.error(`Error fetching ${type} resources:`, error);
            throw error;
        }
    },

    /**
     * Fetch alerts from backend
     */
    async getAlerts(): Promise<Alert[]> {
        try {
            const response = await apiClient.get('/api/v1/alerts');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching alerts:', error);
            throw error;
        }
    },

    /**
     * Dismiss an alert
     */
    async dismissAlert(alertId: string): Promise<void> {
        try {
            await apiClient.post(`/api/v1/alerts/${alertId}/dismiss`);
        } catch (error) {
            console.error('Error dismissing alert:', error);
            throw error;
        }
    },

    /**
     * Fetch activities (CloudTrail events) from backend
     */
    async getActivities(limit = 10): Promise<Activity[]> {
        try {
            const response = await apiClient.get(`/api/v1/activities?limit=${limit}`);
            return response.data || [];
        } catch (error) {
            console.error('Error fetching activities:', error);
            throw error;
        }
    },

    /**
     * Fetch cost data from backend
     */
    async getCostData(months = 6): Promise<CostData[]> {
        try {
            const response = await apiClient.get(`/api/v1/costs?months=${months}`);
            return response.data || [];
        } catch (error) {
            console.error('Error fetching cost data:', error);
            throw error;
        }
    },

    /**
     * Get current month cost from backend
     */
    async getCurrentMonthCost(): Promise<number> {
        try {
            const response = await apiClient.get('/api/v1/costs/current');
            return response.data?.cost || 0;
        } catch (error) {
            console.error('Error fetching current month cost:', error);
            throw error;
        }
    },

    /**
     * Get hygiene score from backend
     */
    async getHygieneScore(): Promise<HygieneScore> {
        try {
            const response = await apiClient.get('/api/v1/hygiene-score');
            return response.data || {
                overall: 0,
                security: 0,
                costEfficiency: 0,
                bestPractices: 0,
                criticalIssues: 0,
                recommendations: [],
            };
        } catch (error) {
            console.error('Error fetching hygiene score:', error);
            throw error;
        }
    },

    /**
     * Run a new scan
     */
    async runScan(): Promise<{ success: boolean; resourcesScanned: number }> {
        try {
            const response = await apiClient.post('/api/v1/scan');
            return response.data || { success: false, resourcesScanned: 0 };
        } catch (error) {
            console.error('Error running scan:', error);
            throw error;
        }
    },

    /**
     * Connect AWS account
     */
    async connectAccount(accessKeyId: string, secretAccessKey: string, region: string): Promise<{ success: boolean; accountId: string }> {
        try {
            const response = await apiClient.post('/api/v1/accounts/connect', {
                access_key_id: accessKeyId,
                secret_access_key: secretAccessKey,
                region,
            });
            return response.data || { success: false, accountId: '' };
        } catch (error) {
            console.error('Error connecting AWS account:', error);
            throw error;
        }
    },

    /**
     * Disconnect AWS account
     */
    async disconnectAccount(): Promise<void> {
        try {
            await apiClient.post('/api/v1/accounts/disconnect');
        } catch (error) {
            console.error('Error disconnecting AWS account:', error);
            throw error;
        }
    },
};
