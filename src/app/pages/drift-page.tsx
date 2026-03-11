import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  GitCompare, AlertTriangle, CheckCircle, RefreshCw, Loader2,
  Plus, Minus, Edit3, ArrowRight,
} from 'lucide-react';

type ChangeType = 'added' | 'removed' | 'modified' | 'unchanged';

interface DriftItem {
  id: string;
  resource: string;
  type: string;
  provider: string;
  region: string;
  change: ChangeType;
  field: string;
  before: string;
  after: string;
  risk: 'high' | 'medium' | 'low' | 'none';
  detected: string;
}

const DRIFT_DATA: DriftItem[] = [
  { id: 'd1', resource: 'prod-api-server-1', type: 'EC2', provider: 'AWS', region: 'us-east-1', change: 'modified', field: 'instance_type', before: 't3.medium', after: 't3.large', risk: 'medium', detected: '2h ago' },
  { id: 'd2', resource: 'prod-ml-sg', type: 'Security Group', provider: 'AWS', region: 'us-east-1', change: 'modified', field: 'inbound_rule', before: '10.0.0.0/8 port 22', after: '0.0.0.0/0 port 22', risk: 'high', detected: '5h ago' },
  { id: 'd3', resource: 'i-0new123456789', type: 'EC2', provider: 'AWS', region: 'us-east-1', change: 'added', field: 'instance', before: '—', after: 'p3.8xlarge (running)', risk: 'high', detected: '8h ago' },
  { id: 'd4', resource: 'dev-nat-gateway-3', type: 'NAT Gateway', provider: 'AWS', region: 'us-east-1', change: 'removed', field: 'gateway', before: 'nat-0abc123 (active)', after: '—', risk: 'low', detected: '1d ago' },
  { id: 'd5', resource: 'prod-rds-primary', type: 'RDS', provider: 'AWS', region: 'us-east-1', change: 'modified', field: 'backup_retention', before: '7 days', after: '1 day', risk: 'high', detected: '2d ago' },
  { id: 'd6', resource: 'static-assets-cdn', type: 'S3 Bucket', provider: 'AWS', region: 'us-east-1', change: 'modified', field: 'public_access', before: 'blocked', after: 'allowed', risk: 'high', detected: '3d ago' },
  { id: 'd7', resource: 'lambda-data-processor', type: 'Lambda', provider: 'AWS', region: 'us-east-1', change: 'modified', field: 'memory_mb', before: '512', after: '2048', risk: 'medium', detected: '3d ago' },
  { id: 'd8', resource: 'analytics-bq', type: 'BigQuery', provider: 'GCP', region: 'us-central1', change: 'modified', field: 'max_slot_ms', before: '1000000', after: 'unlimited', risk: 'high', detected: '4d ago' },
];

const CHANGE_CONFIG: Record<ChangeType, { icon: typeof Plus; color: string; bg: string; label: string }> = {
  added: { icon: Plus, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Added' },
  removed: { icon: Minus, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Removed' },
  modified: { icon: Edit3, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Modified' },
  unchanged: { icon: CheckCircle, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Unchanged' },
};

const RISK_CONFIG = {
  high: 'bg-red-500/10 text-red-500 border-red-500/20',
  medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  none: 'bg-muted text-muted-foreground',
};

export function DriftPage() {
  const [filter, setFilter] = useState<'all' | ChangeType | 'high'>('all');
  const [scanning, setScanning] = useState(false);

  const filtered = DRIFT_DATA.filter(d => {
    if (filter === 'all') return true;
    if (filter === 'high') return d.risk === 'high';
    return d.change === filter;
  });

  const counts = {
    high: DRIFT_DATA.filter(d => d.risk === 'high').length,
    added: DRIFT_DATA.filter(d => d.change === 'added').length,
    removed: DRIFT_DATA.filter(d => d.change === 'removed').length,
    modified: DRIFT_DATA.filter(d => d.change === 'modified').length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Infrastructure Drift</h1>
          <p className="text-muted-foreground">Track changes from your last known good configuration</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Baseline: March 4, 2026</span>
          <Button onClick={() => { setScanning(true); setTimeout(() => setScanning(false), 2000); }} disabled={scanning} className="gap-2">
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {scanning ? 'Scanning...' : 'Detect Drift'}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'High Risk Changes', value: counts.high, icon: AlertTriangle, col: 'text-red-500', bg: 'bg-red-500/10' },
          { label: 'Resources Modified', value: counts.modified, icon: Edit3, col: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Resources Added', value: counts.added, icon: Plus, col: 'text-green-500', bg: 'bg-green-500/10' },
          { label: 'Resources Removed', value: counts.removed, icon: Minus, col: 'text-red-400', bg: 'bg-red-400/10' },
        ].map(c => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <div className={`p-2 rounded-xl ${c.bg}`}><Icon className={`w-4 h-4 ${c.col}`} /></div>
                </div>
                <p className="text-3xl font-bold">{c.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter + Table */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base mr-2">Drift Report</CardTitle>
            {([
              { key: 'all', label: `All (${DRIFT_DATA.length})` },
              { key: 'high', label: `High Risk (${counts.high})` },
              { key: 'modified', label: `Modified (${counts.modified})` },
              { key: 'added', label: `Added (${counts.added})` },
              { key: 'removed', label: `Removed (${counts.removed})` },
            ] as { key: typeof filter; label: string }[]).map(({ key, label }) => (
              <button key={key} onClick={() => setFilter(key)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filter === key ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                {label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['Change', 'Resource', 'Field', 'Before → After', 'Risk', 'Detected'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const cfg = CHANGE_CONFIG[d.change];
                  const Icon = cfg.icon;
                  return (
                    <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded-lg ${cfg.bg}`}><Icon className={`w-3 h-3 ${cfg.color}`} /></div>
                          <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-xs">{d.resource}</p>
                        <p className="text-xs text-muted-foreground">{d.type} · {d.provider} · {d.region}</p>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{d.field}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-xs">
                          <code className="bg-muted px-1.5 py-0.5 rounded text-red-400">{d.before}</code>
                          <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                          <code className="bg-muted px-1.5 py-0.5 rounded text-green-400">{d.after}</code>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={RISK_CONFIG[d.risk]}>{d.risk}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{d.detected}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* High risk callout */}
      {counts.high > 0 && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Action Required: {counts.high} High-Risk Changes</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Critical changes detected: an open SSH port (0.0.0.0/0), reduced RDS backup retention, a public S3 bucket, and an unlaunched EC2 instance.
                  Review these immediately to prevent security incidents or data loss.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
