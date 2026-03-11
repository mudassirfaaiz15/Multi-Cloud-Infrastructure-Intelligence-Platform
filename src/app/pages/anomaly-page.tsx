import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  RefreshCw,
  Loader2,
  TrendingUp,
  DollarSign,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Anomaly {
  anomaly_id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  provider: string;
  resource_type: string;
  current_value: number;
  expected_value: number;
  deviation_pct: number;
  description: string;
  ai_explanation: string | null;
  recommendation: string;
  detected_at: string;
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const DEMO_ANOMALIES: Anomaly[] = [
  {
    anomaly_id: 'demo-001',
    title: 'EC2 Cost Spike — us-east-1',
    severity: 'critical',
    category: 'cost',
    provider: 'AWS',
    resource_type: 'EC2',
    current_value: 4820.50,
    expected_value: 2340.00,
    deviation_pct: 106.0,
    description: 'Your EC2 spend in us-east-1 doubled overnight, likely due to auto-scaling during a traffic surge.',
    ai_explanation: 'Your EC2 costs spiked 106% above normal, reaching $4,820 vs the expected $2,340. This pattern is typically caused by auto-scaling groups launching additional instances during a traffic surge or a runaway batch job. Recommended action: review your Auto Scaling policies and set a maximum instance cap.',
    recommendation: 'Review Auto Scaling policies. Set max capacity limits and add SNS billing alerts.',
    detected_at: new Date().toISOString(),
  },
  {
    anomaly_id: 'demo-002',
    title: 'Unusual S3 Data Transfer Charges',
    severity: 'high',
    category: 'cost',
    provider: 'AWS',
    resource_type: 'S3',
    current_value: 340.20,
    expected_value: 48.00,
    deviation_pct: 608.7,
    description: 'S3 egress costs jumped from $48 to $340 — possible misconfigured public bucket or data exfiltration.',
    ai_explanation: 'S3 data transfer costs are 608% above normal. This typically indicates a public-facing bucket being accessed by external clients at high volume, a misconfigured CloudFront origin, or potentially unauthorized data access. Immediately audit your S3 bucket policies and enable S3 Access Analyzer.',
    recommendation: 'Audit S3 bucket policies. Enable S3 Access Analyzer and block public access.',
    detected_at: new Date().toISOString(),
  },
  {
    anomaly_id: 'demo-003',
    title: 'GCP BigQuery Query Cost Anomaly',
    severity: 'high',
    category: 'cost',
    provider: 'GCP',
    resource_type: 'BigQuery',
    current_value: 890.00,
    expected_value: 120.00,
    deviation_pct: 641.7,
    description: 'A series of unoptimized BigQuery queries scanned 12TB of data instead of the expected 1.5TB.',
    ai_explanation: 'BigQuery costs jumped 641% due to inefficient full-table scans. A query is likely missing a WHERE clause partition filter, causing it to scan the entire table. Use INFORMATION_SCHEMA.JOBS to find the offending queries and add proper partition filters.',
    recommendation: 'Add partition filters to BigQuery queries. Enable cost controls with maximum bytes billed.',
    detected_at: new Date().toISOString(),
  },
  {
    anomaly_id: 'demo-004',
    title: 'Claude API — Token Usage Spike',
    severity: 'medium',
    category: 'usage',
    provider: 'Anthropic',
    resource_type: 'API',
    current_value: 9340000,
    expected_value: 4500000,
    deviation_pct: 107.6,
    description: 'Claude API token consumption is 107% above normal — possibly due to a prompt engineering regression.',
    ai_explanation: 'Token usage doubled, suggesting prompts are now much longer than expected. A common cause is accidentally including large context objects or chat history in API calls. Review your system prompts and trim any unnecessarily long context.',
    recommendation: 'Audit prompt templates. Consider caching common context and implementing token budgets.',
    detected_at: new Date().toISOString(),
  },
  {
    anomaly_id: 'demo-005',
    title: 'RDS — Sustained High CPU',
    severity: 'medium',
    category: 'performance',
    provider: 'AWS',
    resource_type: 'RDS',
    current_value: 94.3,
    expected_value: 35.0,
    deviation_pct: 169.4,
    description: 'RDS instance db.t3.medium has been at 94% CPU for 3+ hours — slow queries likely the cause.',
    ai_explanation: 'Your RDS instance has sustained 94% CPU utilization for over 3 hours. This is typically caused by missing database indexes, N+1 query patterns, or a lock contention issue. Run SHOW PROCESSLIST and EXPLAIN on your top queries to identify the bottleneck.',
    recommendation: 'Enable Performance Insights. Run SHOW PROCESSLIST to identify locking queries.',
    detected_at: new Date().toISOString(),
  },
  {
    anomaly_id: 'demo-006',
    title: 'Idle NAT Gateway Charges',
    severity: 'low',
    category: 'cost',
    provider: 'AWS',
    resource_type: 'NAT Gateway',
    current_value: 87.60,
    expected_value: 32.40,
    deviation_pct: 170.4,
    description: 'Three NAT gateways in dev/staging accounts are processing minimal traffic but incurring hourly fees.',
    ai_explanation: 'NAT Gateway costs tripled because three gateways in your dev/staging environment are running with near-zero traffic utilization. Each gateway costs ~$32/month regardless of usage. Consider deleting unused gateways in non-production environments or using VPC Endpoints instead.',
    recommendation: 'Delete idle NAT gateways in dev/staging. Use VPC Endpoints for AWS service access.',
    detected_at: new Date().toISOString(),
  },
];

// ─── Config ───────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', icon: AlertCircle, colorClass: 'text-red-500', bgClass: 'bg-red-500/10', borderClass: 'border-red-500/30', badgeClass: 'bg-red-500/10 text-red-500 border-red-500/20' },
  high: { label: 'High', icon: AlertTriangle, colorClass: 'text-orange-500', bgClass: 'bg-orange-500/10', borderClass: 'border-orange-500/30', badgeClass: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  medium: { label: 'Medium', icon: Zap, colorClass: 'text-amber-500', bgClass: 'bg-amber-500/10', borderClass: 'border-amber-500/30', badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  low: { label: 'Low', icon: Info, colorClass: 'text-blue-500', bgClass: 'bg-blue-500/10', borderClass: 'border-blue-500/30', badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
};

const PROVIDER_COLORS: Record<string, string> = {
  AWS: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  GCP: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Anthropic: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function AnomalyCard({ anomaly }: { anomaly: Anomaly }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SEVERITY_CONFIG[anomaly.severity];
  const Icon = cfg.icon;
  const costImpact = Math.abs(anomaly.current_value - anomaly.expected_value);

  return (
    <Card className={`border ${cfg.borderClass}`}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          {/* Severity icon */}
          <div className={`p-2 rounded-xl ${cfg.bgClass} shrink-0 mt-0.5`}>
            <Icon className={`w-4 h-4 ${cfg.colorClass}`} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm">{anomaly.title}</h3>
              <Badge className={cfg.badgeClass}>{cfg.label}</Badge>
              <Badge className={PROVIDER_COLORS[anomaly.provider] ?? 'bg-muted text-muted-foreground'}>
                {anomaly.provider}
              </Badge>
              <Badge variant="outline" className="text-xs">{anomaly.resource_type}</Badge>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground mb-3">{anomaly.description}</p>

            {/* Metrics row */}
            <div className="flex flex-wrap gap-4 mb-3">
              <div>
                <p className="text-xs text-muted-foreground">Current</p>
                <p className={`text-sm font-bold ${cfg.colorClass}`}>
                  {anomaly.category === 'cost'
                    ? `$${anomaly.current_value.toLocaleString()}`
                    : anomaly.resource_type === 'API'
                    ? `${(anomaly.current_value / 1_000_000).toFixed(1)}M tokens`
                    : `${anomaly.current_value}%`}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expected</p>
                <p className="text-sm font-medium text-muted-foreground">
                  {anomaly.category === 'cost'
                    ? `$${anomaly.expected_value.toLocaleString()}`
                    : anomaly.resource_type === 'API'
                    ? `${(anomaly.expected_value / 1_000_000).toFixed(1)}M tokens`
                    : `${anomaly.expected_value}%`}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Deviation</p>
                <p className={`text-sm font-bold ${cfg.colorClass}`}>+{anomaly.deviation_pct.toFixed(1)}%</p>
              </div>
              {anomaly.category === 'cost' && (
                <div>
                  <p className="text-xs text-muted-foreground">Cost Impact</p>
                  <p className="text-sm font-bold text-red-500">+${costImpact.toFixed(2)}</p>
                </div>
              )}
            </div>

            {/* AI Explanation toggle */}
            {anomaly.ai_explanation && (
              <div className="mb-3">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {expanded ? 'Hide' : 'Show'} AI Analysis
                </button>
                {expanded && (
                  <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-xs leading-relaxed text-foreground">{anomaly.ai_explanation}</p>
                  </div>
                )}
              </div>
            )}

            {/* Recommendation */}
            <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 border border-border">
              <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Action: </span>{anomaly.recommendation}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AnomalyPage() {
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [scanning, setScanning] = useState(false);
  const [anomalies] = useState<Anomaly[]>(DEMO_ANOMALIES);

  const filtered = filter === 'all' ? anomalies : anomalies.filter(a => a.severity === filter);

  const counts = {
    all: anomalies.length,
    critical: anomalies.filter(a => a.severity === 'critical').length,
    high: anomalies.filter(a => a.severity === 'high').length,
    medium: anomalies.filter(a => a.severity === 'medium').length,
    low: anomalies.filter(a => a.severity === 'low').length,
  };

  const totalImpact = anomalies
    .filter(a => a.category === 'cost')
    .reduce((s, a) => s + Math.abs(a.current_value - a.expected_value), 0);

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => setScanning(false), 2000);
  };

  const SUMMARY_CARDS = [
    { label: 'Total Anomalies', value: counts.all.toString(), icon: AlertTriangle, colorClass: 'text-orange-500', bgClass: 'bg-orange-500/10' },
    { label: 'Critical Issues', value: counts.critical.toString(), icon: AlertCircle, colorClass: 'text-red-500', bgClass: 'bg-red-500/10' },
    { label: 'Cost Impact', value: `$${totalImpact.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: DollarSign, colorClass: 'text-primary', bgClass: 'bg-primary/10' },
    { label: 'AI Analyzed', value: `${anomalies.filter(a => a.ai_explanation).length}/${counts.all}`, icon: TrendingUp, colorClass: 'text-violet-500', bgClass: 'bg-violet-500/10' },
  ];

  const FILTER_BUTTONS: Array<{ key: typeof filter; label: string; colorClass: string }> = [
    { key: 'all', label: `All (${counts.all})`, colorClass: '' },
    { key: 'critical', label: `Critical (${counts.critical})`, colorClass: 'text-red-500' },
    { key: 'high', label: `High (${counts.high})`, colorClass: 'text-orange-500' },
    { key: 'medium', label: `Medium (${counts.medium})`, colorClass: 'text-amber-500' },
    { key: 'low', label: `Low (${counts.low})`, colorClass: 'text-blue-500' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Anomaly Detection</h1>
          <p className="text-muted-foreground">AI-powered detection of unusual cost and usage patterns</p>
        </div>
        <Button onClick={handleScan} disabled={scanning} className="gap-2">
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {scanning ? 'Scanning...' : 'Run Scan'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {SUMMARY_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <div className={`p-2 rounded-xl ${card.bgClass}`}>
                    <Icon className={`w-4 h-4 ${card.colorClass}`} />
                  </div>
                </div>
                <p className="text-3xl font-bold">{card.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter bar */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base mr-2">Filter by Severity</CardTitle>
            {FILTER_BUTTONS.map(({ key, label, colorClass }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  filter === key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                } ${colorClass}`}
              >
                {label}
              </button>
            ))}
          </div>
        </CardHeader>
      </Card>

      {/* Anomaly list */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-12 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="font-medium">No anomalies found</p>
              <p className="text-sm text-muted-foreground">Your cloud environment looks healthy.</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map(anomaly => <AnomalyCard key={anomaly.anomaly_id} anomaly={anomaly} />)
        )}
      </div>
    </div>
  );
}
