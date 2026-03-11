import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  Bot,
  DollarSign,
  TrendingUp,
  Activity,
  ChevronUp,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

// Demo data
const MONTHLY_TREND = [
  { month: 'Aug', api_calls: 1240, tokens: 3450000, cost: 18.25 },
  { month: 'Sep', api_calls: 1580, tokens: 4120000, cost: 22.80 },
  { month: 'Oct', api_calls: 2100, tokens: 5890000, cost: 31.40 },
  { month: 'Nov', api_calls: 2450, tokens: 6780000, cost: 37.90 },
  { month: 'Dec', api_calls: 2890, tokens: 7920000, cost: 45.10 },
  { month: 'Jan', api_calls: 3210, tokens: 9340000, cost: 52.60 },
];

const MODEL_BREAKDOWN = [
  { model: 'claude-3-5-sonnet', calls: 2100, input_tokens: 5200000, output_tokens: 2100000, cost: 45.30, color: '#6366f1', colorClass: 'bg-indigo-500' },
  { model: 'claude-3-5-haiku', calls: 890, input_tokens: 1500000, output_tokens: 540000, cost: 3.36, color: '#22c55e', colorClass: 'bg-green-500' },
  { model: 'claude-3-opus', calls: 220, input_tokens: 480000, output_tokens: 220000, cost: 23.70, color: '#f59e0b', colorClass: 'bg-amber-500' },
];

const TOKEN_CHART_DATA = MODEL_BREAKDOWN.map((m) => ({
  name: m.model.replace('claude-', '').replace('-20241022', ''),
  input: Math.round(m.input_tokens / 1000),
  output: Math.round(m.output_tokens / 1000),
}));

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function AIUsagePage() {
  const [trendMetric, setTrendMetric] = useState<'cost' | 'api_calls' | 'tokens'>('cost');

  const current = MONTHLY_TREND[MONTHLY_TREND.length - 1];
  const prev = MONTHLY_TREND[MONTHLY_TREND.length - 2];
  const totalTokens = MODEL_BREAKDOWN.reduce((s, m) => s + m.input_tokens + m.output_tokens, 0);
  const totalCalls = MODEL_BREAKDOWN.reduce((s, m) => s + m.calls, 0);
  const totalCost = MODEL_BREAKDOWN.reduce((s, m) => s + m.cost, 0);
  const forecast = totalCost * 1.08;
  const callsGrowth = ((current.api_calls - prev.api_calls) / prev.api_calls * 100).toFixed(1);
  const costGrowth = ((current.cost - prev.cost) / prev.cost * 100).toFixed(1);

  const SUMMARY_CARDS = [
    { label: 'Total API Calls', value: totalCalls.toLocaleString(), sub: `+${callsGrowth}% vs last month`, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Tokens Used', value: formatTokens(totalTokens), sub: `${formatTokens(Math.round(totalTokens * 0.72))} input · ${formatTokens(Math.round(totalTokens * 0.28))} output`, icon: Bot, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Estimated Cost', value: `$${totalCost.toFixed(2)}`, sub: `+${costGrowth}% vs last month`, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Monthly Forecast', value: `$${forecast.toFixed(2)}`, sub: '8% growth projected', icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">AI API Usage</h1>
          <p className="text-muted-foreground">Monitor Claude AI API consumption and costs</p>
        </div>
        <div className="flex gap-2 items-center">
          <Badge variant="outline" className="gap-1">
            <Bot className="w-3 h-3" />
            Anthropic Claude
          </Badge>
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>
        </div>
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
                  <div className={`p-2 rounded-xl ${card.bg}`}>
                    <Icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                </div>
                <p className="text-3xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Trend Chart */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Monthly Usage Trend</CardTitle>
            <Tabs value={trendMetric} onValueChange={(v) => setTrendMetric(v as typeof trendMetric)}>
              <TabsList className="h-8">
                <TabsTrigger value="cost" className="text-xs h-6">Cost</TabsTrigger>
                <TabsTrigger value="api_calls" className="text-xs h-6">API Calls</TabsTrigger>
                <TabsTrigger value="tokens" className="text-xs h-6">Tokens</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={MONTHLY_TREND}>
              <defs>
                <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
              <YAxis
                stroke="var(--color-muted-foreground)"
                tickFormatter={trendMetric === 'cost' ? (v) => `$${v}` : trendMetric === 'tokens' ? (v) => formatTokens(v) : String}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                formatter={(value: number) =>
                  trendMetric === 'cost' ? [`$${value}`, 'Cost']
                    : trendMetric === 'tokens' ? [formatTokens(value), 'Tokens']
                    : [value.toLocaleString(), 'API Calls']
                }
              />
              <Area type="monotone" dataKey={trendMetric} stroke="#8b5cf6" fillOpacity={1} fill="url(#aiGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Model Breakdown */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Usage by Model</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {MODEL_BREAKDOWN.map((model) => {
                const pct = Math.round((model.cost / totalCost) * 100);
                return (
                  <div key={model.model} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${model.colorClass}`} />
                        <span className="text-sm font-medium">{model.model}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">{model.calls.toLocaleString()} calls</span>
                        <span className="font-medium">${model.cost.toFixed(2)}</span>
                        <Badge variant="outline" className="text-xs">{pct}%</Badge>
                      </div>
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${model.colorClass}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Token Distribution (thousands)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={TOKEN_CHART_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}K`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                  formatter={(v: number) => [`${v.toLocaleString()}K tokens`]}
                />
                <Legend />
                <Bar dataKey="input" name="Input Tokens" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="output" name="Output Tokens" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Credit Balance */}
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-500/10">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium">Anthropic API Credit Balance</p>
                <p className="text-xs text-muted-foreground">Expires June 30, 2025</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-green-500">$150.00</span>
              <div className="flex items-center gap-1 text-xs text-green-500">
                <ChevronUp className="w-3 h-3" />
                <span>Credits remaining</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
