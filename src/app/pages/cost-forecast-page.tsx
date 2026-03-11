import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  TrendingUp,
  DollarSign,
  BarChart2,
  Cloud,
  Bot,
  CreditCard,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Historical data
const HISTORICAL = [
  { month: 'Aug', aws: 3200, gcp: 280, claude: 18.25, total: 3498.25 },
  { month: 'Sep', aws: 3450, gcp: 310, claude: 22.80, total: 3782.80 },
  { month: 'Oct', aws: 3100, gcp: 295, claude: 31.40, total: 3426.40 },
  { month: 'Nov', aws: 3680, gcp: 340, claude: 37.90, total: 4057.90 },
  { month: 'Dec', aws: 3890, gcp: 382, claude: 45.10, total: 4317.10 },
  { month: 'Jan', aws: 3660, gcp: 432, claude: 52.60, total: 4144.60 },
];

// Simple linear regression for forecast
function linearRegress(data: number[]): { slope: number; intercept: number } {
  const n = data.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const meanX = n / 2 - 0.5;
  const meanY = data.reduce((a, b) => a + b, 0) / n;
  const num = x.reduce((s, xi, i) => s + (xi - meanX) * (data[i] - meanY), 0);
  const den = x.reduce((s, xi) => s + (xi - meanX) ** 2, 0);
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: meanY - slope * meanX };
}

const MONTHS_AHEAD = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];

function buildForecast(historical: typeof HISTORICAL, months: number) {
  const totals = historical.map((d) => d.total);
  const { slope, intercept } = linearRegress(totals);
  const n = totals.length;

  return MONTHS_AHEAD.slice(0, months).map((month, i) => {
    const predicted = Math.max(0, slope * (n + i) + intercept);
    const margin = predicted * 0.06;
    return {
      month,
      predicted: Math.round(predicted),
      lower: Math.round(predicted - margin),
      upper: Math.round(predicted + margin),
      isForecast: true,
    };
  });
}

// Provider cost breakdown (current month)
const PROVIDER_COSTS = [
  { provider: 'AWS', cost: 3660, color: '#f59e0b', colorClass: 'bg-amber-500', icon: Cloud, pct: 88 },
  { provider: 'GCP', cost: 432, color: '#3b82f6', colorClass: 'bg-blue-500', icon: Cloud, pct: 10 },
  { provider: 'Claude AI', cost: 52.60, color: '#8b5cf6', colorClass: 'bg-violet-500', icon: Bot, pct: 2 },
];

// Credit status
const CREDITS = [
  { provider: 'GCP Credits', balance: 285.50, expiry: 'Jun 30, 2025', colorClass: 'bg-blue-500', textClass: 'text-blue-500' },
  { provider: 'Claude AI Credits', balance: 150.00, expiry: 'Jun 30, 2025', colorClass: 'bg-violet-500', textClass: 'text-violet-500' },
  { provider: 'AWS Free Tier', balance: null, expiry: null, colorClass: 'bg-amber-500', textClass: 'text-amber-500' },
];

export function CostForecastPage() {
  const [horizon, setHorizon] = useState<'3' | '6' | '12'>('6');

  const forecastData = buildForecast(HISTORICAL, Number(horizon));
  const combined = [
    ...HISTORICAL.map((d) => ({ month: d.month, actual: d.total, predicted: null })),
    ...forecastData.map((d) => ({ month: d.month, actual: null, predicted: d.predicted })),
  ];

  const lastMonth = HISTORICAL[HISTORICAL.length - 1];
  const forecasted = forecastData[0]?.predicted ?? 0;
  const totalForecastPeriod = forecastData.reduce((s, d) => s + d.predicted, 0);
  const totalProviderCost = PROVIDER_COSTS.reduce((s, p) => s + p.cost, 0);

  const { slope } = linearRegress(HISTORICAL.map((d) => d.total));
  const trendPct = ((slope / lastMonth.total) * 100).toFixed(1);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Cost Forecast</h1>
          <p className="text-muted-foreground">Predictive cost analysis across all cloud providers</p>
        </div>
        <div className="flex gap-2 items-center">
          <Tabs value={horizon} onValueChange={(v) => setHorizon(v as typeof horizon)}>
            <TabsList>
              <TabsTrigger value="3">3 Months</TabsTrigger>
              <TabsTrigger value="6">6 Months</TabsTrigger>
              <TabsTrigger value="12">12 Months</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">Current Monthly</p>
              <div className="p-2 rounded-xl bg-primary/10"><DollarSign className="w-4 h-4 text-primary" /></div>
            </div>
            <p className="text-3xl font-bold">${lastMonth.total.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground mt-1">All providers combined</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">Next Month Forecast</p>
              <div className="p-2 rounded-xl bg-amber-500/10"><TrendingUp className="w-4 h-4 text-amber-500" /></div>
            </div>
            <p className="text-3xl font-bold">${forecasted.toLocaleString()}</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-amber-500">
              <TrendingUp className="w-3 h-3" />
              <span>+{trendPct}% monthly trend</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">{horizon}-Month Total</p>
              <div className="p-2 rounded-xl bg-blue-500/10"><BarChart2 className="w-4 h-4 text-blue-500" /></div>
            </div>
            <p className="text-3xl font-bold">${totalForecastPeriod.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Forecasted spend</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">Cloud Credits</p>
              <div className="p-2 rounded-xl bg-green-500/10"><CreditCard className="w-4 h-4 text-green-500" /></div>
            </div>
            <p className="text-3xl font-bold text-green-500">$435</p>
            <p className="text-xs text-muted-foreground mt-1">GCP + Claude AI credits</p>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Chart */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Total Cloud Spending Forecast</CardTitle>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-primary inline-block" /> Actual</span>
              <span className="flex items-center gap-1"><span className="w-4 h-0.5 border-t-2 border-dashed border-amber-500 inline-block" /> Forecast</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={combined}>
              <defs>
                <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                formatter={(v: number, name: string) => [`$${v?.toLocaleString() ?? 'N/A'}`, name === 'actual' ? 'Actual' : 'Forecast']}
              />
              <Area type="monotone" dataKey="actual" name="actual" stroke="#6366f1" fill="url(#actualGrad)" connectNulls={false} />
              <Area type="monotone" dataKey="predicted" name="predicted" stroke="#f59e0b" strokeDasharray="5 5" fill="url(#forecastGrad)" connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Provider Breakdown + Predictions Table */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Cost by Provider (Current Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {PROVIDER_COSTS.map(({ provider, cost, colorClass, pct }) => (
                <div key={provider} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${colorClass}`} />
                      <span className="text-sm font-medium">{provider}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">${cost.toFixed(2)}</span>
                      <Badge variant="outline" className="text-xs">{pct}%</Badge>
                    </div>
                  </div>
                  <div className="h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${colorClass}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="font-medium">Total</span>
                <span className="text-xl font-bold">${totalProviderCost.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Month-by-Month Predictions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {forecastData.slice(0, 6).map((p) => (
                <div key={p.month} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm font-medium w-12">{p.month}</span>
                  <div className="flex-1 mx-3">
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{
                          '--bar-width': `${Math.min(100, (p.predicted / (forecastData[forecastData.length - 1]?.predicted || 1)) * 100)}%`,
                          width: 'var(--bar-width)',
                        } as React.CSSProperties}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-sm">${p.predicted.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground ml-2">±{Math.round((p.upper - p.lower) / 2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credit Monitoring */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Credit & Quota Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {CREDITS.map(({ provider, balance, expiry, colorClass, textClass }) => (
              <div key={provider} className="p-4 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-3 h-3 rounded-full ${colorClass}`} />
                  <span className="font-medium text-sm">{provider}</span>
                </div>
                {balance !== null ? (
                  <>
                    <p className={`text-2xl font-bold ${textClass}`}>${balance.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Expires {expiry}</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-muted-foreground">Free Tier Active</p>
                    <div className="mt-2 space-y-1.5">
                      {[{ service: 'EC2', pct: 92 }, { service: 'S3', pct: 84 }].map((item) => (
                        <div key={item.service} className="flex items-center gap-2">
                          <span className="text-xs w-8">{item.service}</span>
                          <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-amber-500"
                              style={{ width: `${item.pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{item.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
