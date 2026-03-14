import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { AlertTriangle, CheckCircle2, RefreshCw, Loader2, Shield } from 'lucide-react';
// @ts-expect-error Tag exists in runtime
import { Tag } from 'lucide-react';

const RESOURCES = [
  { id: 'r1', name: 'prod-api-server-1', type: 'EC2', provider: 'AWS', region: 'us-east-1', tags: { env: 'prod', owner: 'platform-team', project: 'api' }, missing: [] },
  { id: 'r2', name: 'prod-ml-training', type: 'EC2', provider: 'AWS', region: 'us-east-1', tags: { env: 'prod' }, missing: ['owner', 'project', 'cost-center'] },
  { id: 'r3', name: 'dev-bastion', type: 'EC2', provider: 'AWS', region: 'us-east-1', tags: {}, missing: ['env', 'owner', 'project', 'cost-center'] },
  { id: 'r4', name: 'prod-rds-primary', type: 'RDS', provider: 'AWS', region: 'us-east-1', tags: { env: 'prod', owner: 'db-team' }, missing: ['project'] },
  { id: 'r5', name: 'prod-data-lake', type: 'S3', provider: 'AWS', region: 'us-east-1', tags: { env: 'prod', owner: 'data-team', project: 'analytics', 'cost-center': 'eng-001' }, missing: [] },
  { id: 'r6', name: 'analytics-bq', type: 'BigQuery', provider: 'GCP', region: 'us-central1', tags: { env: 'prod' }, missing: ['owner', 'project'] },
  { id: 'r7', name: 'ml-training-vm-1', type: 'Compute Engine', provider: 'GCP', region: 'us-central1', tags: {}, missing: ['env', 'owner', 'project', 'cost-center'] },
  { id: 'r8', name: 'static-assets-cdn', type: 'S3', provider: 'AWS', region: 'us-east-1', tags: { env: 'prod', project: 'web' }, missing: ['owner'] },
];

const REQUIRED_TAGS = ['env', 'owner', 'project', 'cost-center'];

function complianceScore(resources: typeof RESOURCES) {
  const totalRequired = resources.length * REQUIRED_TAGS.length;
  const missing = resources.reduce((s, r) => s + r.missing.length, 0);
  return Math.round(((totalRequired - missing) / totalRequired) * 100);
}

function scoreColor(score: number) {
  if (score >= 80) return { text: 'text-green-500', bg: 'bg-green-500', label: 'Good' };
  if (score >= 60) return { text: 'text-amber-500', bg: 'bg-amber-500', label: 'Fair' };
  return { text: 'text-red-500', bg: 'bg-red-500', label: 'Poor' };
}

export function TaggingPage() {
  const [scanning, setScanning] = useState(false);
  const score = complianceScore(RESOURCES);
  const { text, bg, label } = scoreColor(score);
  const fullyTagged = RESOURCES.filter(r => r.missing.length === 0).length;
  const partiallyTagged = RESOURCES.filter(r => r.missing.length > 0 && Object.keys(r.tags).length > 0).length;
  const untagged = RESOURCES.filter(r => Object.keys(r.tags).length === 0).length;

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => setScanning(false), 2000);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Tagging Compliance</h1>
          <p className="text-muted-foreground">Ensure all resources have required tags for cost attribution</p>
        </div>
        <Button onClick={handleScan} disabled={scanning} className="gap-2">
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {scanning ? 'Scanning...' : 'Scan Resources'}
        </Button>
      </div>

      {/* Score overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Compliance Score', value: `${score}%`, status: label, icon: Shield, col: text, bg: text.replace('text-', 'bg-').replace('500', '500/10') },
          { label: 'Fully Tagged', value: fullyTagged.toString(), status: `of ${RESOURCES.length}`, icon: CheckCircle2, col: 'text-green-500', bg: 'bg-green-500/10' },
          { label: 'Partially Tagged', value: partiallyTagged.toString(), status: 'resources', icon: Tag, col: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Untagged', value: untagged.toString(), status: 'resources', icon: AlertTriangle, col: 'text-red-500', bg: 'bg-red-500/10' },
        ].map(c => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <div className={`p-2 rounded-xl ${c.bg}`}><Icon className={`w-4 h-4 ${c.col}`} /></div>
                </div>
                <p className={`text-3xl font-bold ${c.col}`}>{c.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.status}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Compliance gauge bar */}
      <Card className="border-border">
        <CardHeader><CardTitle className="text-base">Overall Compliance</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
              {/* eslint-disable-next-line react/forbid-dom-props */}
              <div className={`h-full ${bg} rounded-full transition-all duration-1000`} style={{ width: `${score}%` }} />
            </div>
            <span className={`text-lg font-bold ${text}`}>{score}%</span>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Required tags: <strong className="text-foreground">{REQUIRED_TAGS.join(', ')}</strong></span>
          </div>
        </CardContent>
      </Card>

      {/* Resource table */}
      <Card className="border-border">
        <CardHeader><CardTitle className="text-base">Resource Tag Status</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Resource</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Applied Tags</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Missing Tags</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {RESOURCES.map(r => {
                  const appliedTags = Object.keys(r.tags);
                  const status = r.missing.length === 0 ? 'compliant' : appliedTags.length === 0 ? 'untagged' : 'partial';
                  const statusConfig = {
                    compliant: { label: 'Compliant', class: 'bg-green-500/10 text-green-500' },
                    partial: { label: 'Partial', class: 'bg-amber-500/10 text-amber-500' },
                    untagged: { label: 'Untagged', class: 'bg-red-500/10 text-red-500' },
                  }[status];
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-sm">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.provider} · {r.region}</p>
                      </td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{r.type}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {appliedTags.length > 0 ? appliedTags.map(t => (
                            <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">{t}</span>
                          )) : <span className="text-xs text-muted-foreground">None</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {r.missing.length > 0 ? r.missing.map(t => (
                            <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-500 border border-red-500/20">{t}</span>
                          )) : <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.class}`}>{statusConfig.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
