import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Loader2,
  TrendingUp,
  Zap,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

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
  is_prediction?: boolean;
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
    detected_at: '2026-03-05T00:00:00Z',
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
    description: 'S3 egress costs jumped from $48 to $340 — possible misconfigured public bucket.',
    ai_explanation: 'S3 data transfer costs are 608% above normal. This typically indicates a public-facing bucket being accessed by external clients at high volume, or potentially unauthorized data access. Immediately audit your S3 bucket policies and enable S3 Access Analyzer.',
    recommendation: 'Audit S3 bucket policies. Enable S3 Access Analyzer and block public access.',
    detected_at: '2026-03-08T00:00:00Z',
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
    description: 'A series of unoptimized BigQuery queries scanned 12TB of data instead of 1.5TB.',
    ai_explanation: 'BigQuery costs jumped 641% due to inefficient full-table scans. A query is likely missing a WHERE clause partition filter, causing it to scan the entire table. Use INFORMATION_SCHEMA.JOBS to find the offending queries and add proper partition filters.',
    recommendation: 'Add partition filters to BigQuery queries. Enable cost controls with maximum bytes billed.',
    detected_at: '2026-03-12T00:00:00Z',
  },
  {
    anomaly_id: 'pred-004',
    title: 'Predicted Spanner Scaling Event',
    severity: 'medium',
    category: 'performance',
    provider: 'GCP',
    resource_type: 'Spanner',
    current_value: 1200.00,
    expected_value: 850.00,
    deviation_pct: 41.2,
    description: 'AI Forecasting detects a high probability of Spanner load maxing out next weekend.',
    ai_explanation: 'Based on the previous 3 months of usage patterns, your GCP Spanner database node utilization hits 95% on the third weekend of the month. To prevent downtime or throttle spikes next Friday, you should provision 1 extra node proactively.',
    recommendation: 'Proactively scale Spanner instances by +1 node by Thursday.',
    detected_at: '2026-03-17T00:00:00Z',
    is_prediction: true,
  },
  {
    anomaly_id: 'pred-005',
    title: 'Predicted S3 Storage Tier Cross',
    severity: 'critical',
    category: 'cost',
    provider: 'AWS',
    resource_type: 'S3 Standard',
    current_value: 4150.00,
    expected_value: 3000.00,
    deviation_pct: 38.3,
    description: 'Data growth trajectory will exceed standard tier budget limits by month-end.',
    ai_explanation: 'Log storage velocity in your central CloudTrail bucket is accelerating by 4TB/week. At this rate, standard S3 pricing will trigger a severe budget overrun by the 25th. Implementing a lifecycle policy to move >30 day old logs to Glacier will instantly flatten this trajectory.',
    recommendation: 'Implement S3 Lifecycle Policy shifting obj > 30 days to Glacier Deep Archive.',
    detected_at: '2026-03-24T00:00:00Z',
    is_prediction: true,
  },
];

// Generate visual timeline data
const generateTimelineData = () => {
  const data = [];
  const baseValue = 2000;
  // Starting from March 1st 2026
  for (let i = 1; i <= 28; i++) {
    const isFuture = i > 14; // March 14 is "Today"
    const dateStr = `Mar ${i.toString().padStart(2, '0')}`;
    const isoDate = `2026-03-${i.toString().padStart(2, '0')}T00:00:00Z`;

    // Baseline natural variance
    const expected = baseValue + (Math.sin(i * 0.5) * 200) + (i * 20);
    let actual = isFuture ? null : expected + (Math.random() * 100 - 50);
    let predicted = isFuture ? expected + (Math.random() * 100 - 50) : null;

    // Inject anomalies into the chart numbers
    const dailyAnomalies = DEMO_ANOMALIES.filter(a => a.detected_at.startsWith(isoDate.split('T')[0]));
    let anomalyRef = null;

    if (dailyAnomalies.length > 0) {
      const mainAnomaly = dailyAnomalies[0];
      anomalyRef = mainAnomaly;

      if (!isFuture) {
        actual = expected + mainAnomaly.current_value;
      } else {
        predicted = expected + mainAnomaly.current_value;
      }
    }

    data.push({
      date: dateStr,
      isoDate,
      expected: isFuture ? null : Math.round(expected),
      actual: actual ? Math.round(actual) : null,
      forecastBaseline: isFuture ? Math.round(expected) : null,
      predicted: predicted ? Math.round(predicted) : null,
      anomaly: anomalyRef,
    });
  }
  return data;
};

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

function AnomalyCard({ anomaly, isSelected, onClick }: { anomaly: Anomaly; isSelected: boolean; onClick: () => void }) {
  const [expanded, setExpanded] = useState(isSelected);
  const cfg = SEVERITY_CONFIG[anomaly.severity];
  const Icon = cfg.icon;

  // Auto-expand if selected from the chart
  useMemo(() => {
    if (isSelected) setExpanded(true);
  }, [isSelected]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card 
        className={`border transition-all duration-300 cursor-pointer ${
          isSelected ? `ring-2 ring-violet-500/50 ${cfg.bgClass}` : cfg.borderClass
        } hover:shadow-md`}
        onClick={onClick}
      >
        <CardContent className="pt-4">
          <div className="flex items-start gap-4">
            {/* Severity icon */}
            <div className={`p-3 rounded-xl ${anomaly.is_prediction ? 'bg-violet-500/10 text-violet-500' : cfg.bgClass} shrink-0 mt-0.5 shadow-sm`}>
              {anomaly.is_prediction ? <Sparkles className="w-5 h-5" /> : <Icon className={`w-5 h-5 ${cfg.colorClass}`} />}
            </div>

            <div className="flex-1 min-w-0">
              {/* Header row */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h3 className={`font-bold text-base ${anomaly.is_prediction ? 'text-violet-500' : ''}`}>{anomaly.title}</h3>
                {anomaly.is_prediction ? (
                  <Badge className="bg-violet-500/10 text-violet-600 border-violet-500/20">AI Prediction</Badge>
                ) : (
                  <Badge className={cfg.badgeClass}>{cfg.label}</Badge>
                )}
                <Badge className={PROVIDER_COLORS[anomaly.provider] ?? 'bg-muted text-muted-foreground'}>
                  {anomaly.provider}
                </Badge>
                <Badge variant="outline" className="text-xs">{anomaly.resource_type}</Badge>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(anomaly.detected_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground mb-4">{anomaly.description}</p>

              {/* AI Analysis Toggle */}
              {anomaly.ai_explanation && (
                <div className="mb-4">
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                    className={`flex items-center gap-1.5 text-xs font-medium hover:underline transition-colors ${anomaly.is_prediction ? 'text-violet-600' : 'text-primary'}`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {expanded ? 'Hide AI Analysis' : 'Show AI Engine Root-Cause Analysis'}
                    <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className={`mt-3 p-4 rounded-xl border ${anomaly.is_prediction ? 'bg-violet-500/5 border-violet-500/20' : 'bg-primary/5 border-primary/20'} relative overflow-hidden group`}>
                          <div className={`absolute top-0 left-0 w-1 h-full ${anomaly.is_prediction ? 'bg-violet-500' : 'bg-primary'}`} />
                          <p className="text-sm leading-relaxed text-foreground">
                            {anomaly.ai_explanation}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Action/Recommendation */}
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/50 border border-border">
                <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${anomaly.is_prediction ? 'text-violet-500' : 'text-green-500'}`} />
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground mr-1">Recommended Action:</span>
                  {anomaly.recommendation}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AnomalyPage() {
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low' | 'prediction'>('all');
  const [scanning, setScanning] = useState(false);
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);
  
  const anomalies = DEMO_ANOMALIES;
  const timelineData = useMemo(() => generateTimelineData(), []);

  const filtered = filter === 'all' ? anomalies 
    : filter === 'prediction' ? anomalies.filter(a => a.is_prediction)
    : anomalies.filter(a => a.severity === filter && !a.is_prediction);

  const counts = {
    all: anomalies.length,
    critical: anomalies.filter(a => a.severity === 'critical' && !a.is_prediction).length,
    prediction: anomalies.filter(a => a.is_prediction).length,
  };

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => setScanning(false), 2000);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent inline-block mb-1">AI Predictive Anomalies</h1>
          <p className="text-muted-foreground">Interactive cost forecasting and real-time root-cause analysis</p>
        </div>
        <Button onClick={handleScan} disabled={scanning} className="gap-2 bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90 text-white border-0 shadow-lg shadow-primary/20 transition-all">
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {scanning ? 'Running AI Models...' : 'Run Deep Analysis'}
        </Button>
      </div>

      {/* Interactive Timeline Chart */}
      <Card className="border-border overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <CardHeader className="pb-0 relative">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Cost Trajectory & Anomaly Events
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Dashed areas represent AI-modeled future forecasts. Click any glowing pulse to investigate.</p>
        </CardHeader>
        <CardContent className="pt-6 relative">
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={timelineData} margin={{ top: 20, right: 20, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} tickMargin={10} minTickGap={20} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ fontWeight: 'bold', color: 'var(--color-foreground)', marginBottom: '8px' }}
                formatter={(v: number, name: string) => [
                  `$${v?.toLocaleString() ?? 'N/A'}`, 
                  name === 'actual' ? 'Actual Cost' 
                  : name === 'predicted' ? 'Forecast Vector' 
                  : 'Expected Baseline'
                ]}
              />
              
              {/* Plot Expected Baseline */}
              <Line type="monotone" dataKey="expected" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={false} name="Expected Baseline" />
              <Line type="monotone" dataKey="forecastBaseline" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={false} opacity={0.5} />
              
              {/* Plot Actual Area */}
              <Area type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={3} fill="url(#actualGrad)" activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }} name="actual" connectNulls />
              
              {/* Plot Forecast Area */}
              <Area type="monotone" dataKey="predicted" stroke="#8b5cf6" strokeWidth={3} strokeDasharray="6 6" fill="url(#forecastGrad)" activeDot={{ r: 6, strokeWidth: 0, fill: '#8b5cf6' }} name="predicted" connectNulls />
              
              {/* Custom dots for Anomalies */}
              {timelineData.map((entry, index) => {
                if (entry.anomaly) {
                  const isPred = entry.anomaly.is_prediction;
                  const color = isPred ? '#8b5cf6' : '#ef4444';
                  const dataKey = isPred ? 'predicted' : 'actual';
                  return (
                    <ReferenceDot
                      key={`anomaly-${index}`}
                      x={entry.date}
                      y={entry[dataKey] as number}
                      r={6}
                      fill={color}
                      stroke="white"
                      strokeWidth={2}
                      className="cursor-pointer hover:stroke-4"
                      style={{ filter: 'url(#glow)' }}
                      onClick={() => {
                        setSelectedAnomalyId(entry.anomaly!.anomaly_id);
                        document.getElementById('anomaly-feed')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    />
                  );
                }
                return null;
              })}
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Filter Options */}
      <div className="flex flex-wrap items-center gap-2" id="anomaly-feed">
        <span className="text-sm font-medium mr-2 text-muted-foreground">Filter Events:</span>
        {[
          { key: 'all', label: `All Events (${counts.all})`, color: 'bg-muted text-foreground' },
          { key: 'prediction', label: `AI Predictions (${counts.prediction})`, color: 'bg-violet-500/10 text-violet-600 border border-violet-500/20' },
          { key: 'critical', label: `Historical Critical (${counts.critical})`, color: 'bg-red-500/10 text-red-600 border border-red-500/20' },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => { setFilter(key as any); setSelectedAnomalyId(null); }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
              filter === key ? `ring-2 ring-primary ring-offset-2 ring-offset-background ${color}` : 'bg-transparent border border-border text-muted-foreground hover:bg-muted/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Anomaly Feed */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filtered.map(anomaly => (
            <AnomalyCard 
              key={anomaly.anomaly_id} 
              anomaly={anomaly} 
              isSelected={selectedAnomalyId === anomaly.anomaly_id}
              onClick={() => setSelectedAnomalyId(anomaly.anomaly_id)}
            />
          ))}
          {filtered.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card className="border-border border-dashed bg-muted/20">
                <CardContent className="py-16 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold">No Events Found</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">Your cloud environment is operating exactly along expected baseline parameters. No anomalies detected in this filter.</p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

