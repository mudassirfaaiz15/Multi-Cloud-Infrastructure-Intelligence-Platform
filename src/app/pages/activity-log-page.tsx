import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
    Activity,
    Filter,
    Download,
    RefreshCw,
    Shield,
    DollarSign,
    User,
    Cloud,
    Settings,
    Clock,
    CheckCircle2,
    AlertTriangle,
    Info,
    XCircle,
} from 'lucide-react';
import { getActivityLog, type ActivityEvent } from '@/lib/api/activity';
import { logger } from '@/lib/utils/logger';

// Fallback demo data
const DEMO_ACTIVITY_DATA: ActivityEvent[] = [
    {
        id: 'act-1',
        type: 'security',
        action: 'Security Scan Completed',
        description: 'Automated security scan found 2 new critical issues',
        user: 'System',
        userEmail: 'system@consolesensei.cloud',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        severity: 'warning',
    },
    {
        id: 'act-2',
        type: 'account',
        action: 'Account Synced',
        description: 'Production account synced successfully - 156 resources discovered',
        user: 'John Doe',
        userEmail: 'john@example.com',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        severity: 'success',
    },
    {
        id: 'act-3',
        type: 'cost',
        action: 'Budget Alert Triggered',
        description: 'Monthly spending exceeded 80% of budget ($2,400 / $3,000)',
        user: 'System',
        userEmail: 'system@consolesensei.cloud',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        severity: 'warning',
    },
    {
        id: 'act-4',
        type: 'resource',
        action: 'EC2 Instance Launched',
        description: 'New production instance i-0a1b2c3d4e5f6g7h8 in us-east-1',
        user: 'Jane Smith',
        userEmail: 'jane@example.com',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        severity: 'info',
    },
    {
        id: 'act-5',
        type: 'compliance',
        action: 'Compliance Check Failed',
        description: 'CIS AWS Foundations: 3 new violations detected',
        user: 'System',
        userEmail: 'system@consolesensei.cloud',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        severity: 'error',
    },
];

interface ActivityTypeConfig {
    icon: typeof Activity;
    color: string;
}

const ACTIVITY_TYPE_CONFIG: Record<string, ActivityTypeConfig> = {
    security: { icon: Shield, color: 'text-red-500' },
    cost: { icon: DollarSign, color: 'text-green-500' },
    account: { icon: Cloud, color: 'text-blue-500' },
    resource: { icon: Settings, color: 'text-purple-500' },
    compliance: { icon: CheckCircle2, color: 'text-orange-500' },
    user: { icon: User, color: 'text-slate-500' },
};

const SEVERITY_BADGE_CONFIG = {
    success: { bg: 'bg-green-500/10', text: 'text-green-700', icon: CheckCircle2 },
    warning: { bg: 'bg-amber-500/10', text: 'text-amber-700', icon: AlertTriangle },
    error: { bg: 'bg-red-500/10', text: 'text-red-700', icon: XCircle },
    info: { bg: 'bg-blue-500/10', text: 'text-blue-700', icon: Info },
};

export function ActivityLogPage() {
    const [activeType, setActiveType] = useState<string | null>(null);
    const [activities, setActivities] = useState<ActivityEvent[]>(DEMO_ACTIVITY_DATA);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadActivities = async () => {
            try {
                const data = await getActivityLog();
                setActivities(data || DEMO_ACTIVITY_DATA);
            } catch (error) {
                logger.error(`Failed to load activities: ${error}`);
                setActivities(DEMO_ACTIVITY_DATA);
            } finally {
                setLoading(false);
            }
        };


