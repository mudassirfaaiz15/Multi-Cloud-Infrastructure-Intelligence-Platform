import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { TrendingDown, Sparkles, CheckCircle2, ArrowRight, Filter } from 'lucide-react';

interface Saving {
  id: string;
  title: string;
  service: string;
  monthly: number;
  effort: 'Low' | 'Medium' | 'High';
  priority: 'Quick Win' | 'Recommended' | 'Planned';
  detail: string;
  applied?: boolean;
}

const SAVINGS: Saving[] = [
  { id: 's1', title: 'Rightsize 6 underutilized EC2 instances', service: 'EC2', monthly: 381, effort: 'Low',    priority: 'Quick Win',    detail: 'Average CPU <10% over 14 days. Downgrade from t3.xlarge → t3.medium.' },
  { id: 's2', title: 'Enable S3 Intelligent-Tiering',            service: 'S3',  monthly: 94,  effort: 'Low',    priority: 'Quick Win',    detail: 'Apply to all buckets >1 GB. Auto-moves infrequent data to cheaper tier.' },
  { id: 's3', title: 'Delete 7 unattached EBS volumes (142 GB)', service: 'EBS', monthly: 15,  effort: 'Low',    priority: 'Quick Win',    detail: 'Last snapshot >90 days ago. Safe to archive or delete.' },
  { id: 's4', title: 'Optimize BigQuery with partitioned tables', service: 'GCP', monthly: 310, effort: 'Medium', priority: 'Recommended',  detail: 'Partition queries by date to cut scanned bytes by ~55%.' },
  { id: 's5', title: 'Reserve EC2 capacity (1-year term)',        service: 'EC2', monthly: 520, effort: 'Medium', priority: 'Recommended',  detail: 'On-demand → Reserved saves ~35% on baseline compute.' },
  { id: 's6', title: 'Migrate dev RDS to Aurora Serverless v2',  service: 'RDS', monthly: 185, effort: 'High',   priority: 'Planned',      detail: 'Auto-scales to 0 ACU when idle — ideal for non-prod environments.' },
];

const EFFORT_CLS: Record<Saving['effort'], string> = {
  Low:    'bg-green-500/10 text-green-500 border-green-500/20',
  Medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  High:   'bg-red-500/10 text-red-500 border-red-500/20',
};
const PRIORITY_CLS: Record<Saving['priority'], string> = {
  'Quick Win':   'bg-primary/10 text-primary border-primary/20',
  'Recommended': 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  'Planned':     'bg-muted text-muted-foreground',
};

export function SavingsPage() {
  const [filter, setFilter] = useState<'All' | Saving['priority']>('All');
  const [applied, setApply] = useState<Set<string>>(new Set());

  const visible = SAVINGS.filter(s => filter === 'All' || s.priority === filter);
  const totalSavings = SAVINGS.reduce((s, r) => s + r.monthly, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Savings Recommendations</h1>
          <p className="text-muted-foreground">AI-identified optimization opportunities across your cloud estate</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
          <TrendingDown className="w-5 h-5 text-green-500" />
          <div>
            <p className="text-xs text-green-600 dark:text-green-400">Potential Monthly Savings</p>
            <p className="text-xl font-bold text-green-500">${totalSavings.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['Quick Win', 'Recommended', 'Planned'] as const).map(p => {
          const items = SAVINGS.filter(s => s.priority === p);
          const total = items.reduce((s, r) => s + r.monthly, 0);
          return (
            <Card key={p} className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <Badge className={PRIORITY_CLS[p]}>{p}</Badge>
                  <Sparkles className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">${total.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                <p className="text-xs text-muted-foreground mt-1">{items.length} recommendation{items.length !== 1 ? 's' : ''}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {(['All', 'Quick Win', 'Recommended', 'Planned'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filter === f ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* Recommendations list */}
      <div className="space-y-3">
        {visible.map(s => {
          const isApplied = applied.has(s.id);
          return (
            <Card key={s.id} className={`border-border transition-all ${isApplied ? 'opacity-60' : ''}`}>
              <CardContent className="pt-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {isApplied && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                      <p className={`font-semibold text-sm ${isApplied ? 'line-through text-muted-foreground' : ''}`}>{s.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{s.detail}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={EFFORT_CLS[s.effort]}>{s.effort} Effort</Badge>
                      <Badge className={PRIORITY_CLS[s.priority]}>{s.priority}</Badge>
                      <Badge variant="outline">{s.service}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="text-xl font-bold text-green-500">${s.monthly}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                    <Button
                      size="sm" variant={isApplied ? 'outline' : 'default'}
                      onClick={() => setApply(prev => {
                        const n = new Set(prev);
                        isApplied ? n.delete(s.id) : n.add(s.id);
                        return n;
                      })}
                      className="text-xs gap-1"
                    >
                      {isApplied ? 'Undo' : (<><ArrowRight className="w-3 h-3" />Apply</>)}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
