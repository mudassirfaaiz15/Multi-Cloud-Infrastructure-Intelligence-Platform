import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { TrendingUp, AlertTriangle, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, ReferenceLine,
} from 'recharts';

const BUDGET = 5000;

const DATA = [
  { day: 'Mar 1',  actual: 148, forecast: 148 },
  { day: 'Mar 2',  actual: 162, forecast: 162 },
  { day: 'Mar 3',  actual: 155, forecast: 155 },
  { day: 'Mar 4',  actual: 171, forecast: 171 },
  { day: 'Mar 5',  actual: 168, forecast: 168 },
  { day: 'Mar 6',  actual: 142, forecast: 142 },
  { day: 'Mar 7',  actual: 138, forecast: 138 },
  { day: 'Mar 8',  actual: 175, forecast: 175 },
  { day: 'Mar 9',  actual: 183, forecast: 183 },
  { day: 'Mar 10', actual: 221, forecast: 221, anomaly: true },
  { day: 'Mar 11', actual: 195, forecast: 195 },
  { day: 'Mar 12', actual: 172, forecast: 172 },
  // Forecast only
  { day: 'Mar 13', forecast: 185 },
  { day: 'Mar 14', forecast: 188 },
  { day: 'Mar 15', forecast: 185 },
  { day: 'Mar 16', forecast: 182 },
  { day: 'Mar 17', forecast: 178 },
  { day: 'Mar 18', forecast: 175 },
  { day: 'Mar 19', forecast: 172 },
  { day: 'Mar 20', forecast: 170 },
  { day: 'Mar 21', forecast: 168 },
  { day: 'Mar 22', forecast: 165 },
  { day: 'Mar 23', forecast: 163 },
  { day: 'Mar 24', forecast: 160 },
  { day: 'Mar 25', forecast: 158 },
  { day: 'Mar 26', forecast: 156 },
  { day: 'Mar 27', forecast: 155 },
  { day: 'Mar 28', forecast: 153 },
  { day: 'Mar 29', forecast: 152 },
  { day: 'Mar 30', forecast: 150 },
  { day: 'Mar 31', forecast: 148 },
];

const SERVICES = [
  { name: 'EC2 Compute', budget: 2000, actual: 2140, change: +7   },
  { name: 'RDS',         budget: 700,  actual: 640,  change: -8.6 },
  { name: 'S3 Storage',  budget: 350,  actual: 295,  change: -15.7 },
  { name: 'BigQuery',    budget: 200,  actual: 890,  change: +345 },
  { name: 'CloudFront',  budget: 200,  actual: 198,  change: -1   },
  { name: 'Lambda',      budget: 50,   actual: 12,   change: -76  },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <p className="font-semibold mb-1.5">{label}</p>
      {payload.map((p: any) => (
        // eslint-disable-next-line react/forbid-dom-props
        <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>${p.value?.toLocaleString()}</strong></p>
      ))}
    </div>
  );
};

export function BudgetActualsPage() {
  const [period, setPeriod] = useState<'mtd' | '3m' | '6m'>('mtd');
  const actualSpend   = DATA.filter(d => d.actual).reduce((s, d) => s + (d.actual || 0), 0);
  const forecastTotal = DATA.reduce((s, d) => s + (d.forecast || 0), 0);
  const overBudget    = forecastTotal > BUDGET;
  const pct           = Math.round((actualSpend / BUDGET) * 100);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Budget vs Actual</h1>
          <p className="text-muted-foreground">Daily spend tracking against monthly budget with AI forecast</p>
        </div>
        <div className="flex gap-1.5">
          {(['mtd','3m','6m'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${period === p ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>
              {p === 'mtd' ? 'This Month' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">Month-to-Date Spend</p>
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <p className="text-3xl font-bold">${actualSpend.toLocaleString()}</p>
            <div className="w-full bg-muted rounded-full h-2 mt-3">
              {/* eslint-disable-next-line react/forbid-dom-props */}
              <div className={`${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-primary'} h-2 rounded-full transition-all`}
                style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{pct}% of ${BUDGET.toLocaleString()} budget</p>
          </CardContent>
        </Card>
        <Card className={`border-border ${overBudget ? 'border-red-500/30' : 'border-green-500/30'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">Month-End Forecast</p>
              {overBudget ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <TrendingUp className="w-4 h-4 text-green-500" />}
            </div>
            <p className={`text-3xl font-bold ${overBudget ? 'text-red-500' : 'text-green-500'}`}>${forecastTotal.toLocaleString()}</p>
            <p className={`text-xs mt-2 ${overBudget ? 'text-red-500' : 'text-green-500'}`}>
              {overBudget ? `$${(forecastTotal - BUDGET).toLocaleString()} over budget` : 'On track'}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">Budget Remaining</p>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold">${(BUDGET - actualSpend).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-2">19 days left in March</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Daily Spend Timeline</CardTitle>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-4 border-t-2 border-primary inline-block" />Actual</span>
              <span className="flex items-center gap-1"><span className="w-4 border-t-2 border-dashed border-muted-foreground inline-block" />Budget/day</span>
              <span className="flex items-center gap-1"><span className="w-4 border-t-2 border-violet-500 inline-block" />Forecast</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={DATA} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0"   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={161} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 3"
                label={{ value: 'Budget/day', position: 'right', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
              <Area type="monotone" dataKey="actual"   name="Actual"   stroke="hsl(var(--primary))" fill="url(#grad)" strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="6 3" dot={false} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Service breakdown */}
      <Card className="border-border">
        <CardHeader><CardTitle className="text-base">Service Budget Breakdown</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Service','Budget','Actual','Variance','Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SERVICES.map(s => {
                const over = s.actual > s.budget;
                return (
                  <tr key={s.name} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">${s.budget.toLocaleString()}</td>
                    <td className={`px-4 py-3 font-semibold ${over ? 'text-red-500' : 'text-green-500'}`}>${s.actual.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs font-medium ${over ? 'text-red-500' : 'text-green-500'}`}>
                        {over ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {Math.abs(s.change)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={over ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}>
                        {over ? 'Over' : 'Under'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
