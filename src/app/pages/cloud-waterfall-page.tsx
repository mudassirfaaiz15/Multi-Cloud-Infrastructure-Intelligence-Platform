import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { DollarSign, TrendingUp, Cloud } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

const WATERFALL_DATA = [
  { name: 'AWS EC2',      value: 2140, provider: 'AWS',    color: '#f59e0b' },
  { name: 'GCP BigQuery', value: 890,  provider: 'GCP',    color: '#3b82f6' },
  { name: 'AWS RDS',      value: 640,  provider: 'AWS',    color: '#f97316' },
  { name: 'Claude AI',    value: 312,  provider: 'Claude', color: '#8b5cf6' },
  { name: 'AWS S3',       value: 295,  provider: 'AWS',    color: '#fbbf24' },
  { name: 'GCP Compute',  value: 270,  provider: 'GCP',    color: '#60a5fa' },
  { name: 'AWS Other',    value: 1039, provider: 'AWS',    color: '#fb923c' },
];

const MONTHLY_TREND = [
  { month: 'Oct', aws: 3820, gcp: 820,  claude: 140 },
  { month: 'Nov', aws: 4050, gcp: 890,  claude: 195 },
  { month: 'Dec', aws: 3990, gcp: 960,  claude: 240 },
  { month: 'Jan', aws: 4210, gcp: 1020, claude: 280 },
  { month: 'Feb', aws: 4380, gcp: 1090, claude: 295 },
  { month: 'Mar', aws: 4114, gcp: 1160, claude: 312 },
];

const PROVIDER_BADGE: Record<string, string> = {
  AWS:    'bg-amber-500/10 text-amber-500 border-amber-500/20',
  GCP:    'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Claude: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2.5 shadow-xl text-xs min-w-32">
      <p className="font-semibold mb-1.5">{label}</p>
      {payload.map((p: any) => <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>${p.value?.toLocaleString()}</strong></p>)}
      <p className="border-t border-border mt-1.5 pt-1.5 font-bold">Total: ${total.toLocaleString()}</p>
    </div>
  );
};

export function CloudWaterfallPage() {
  const awsTotal   = WATERFALL_DATA.filter(d => d.provider === 'AWS').reduce((s, d) => s + d.value, 0);
  const gcpTotal   = WATERFALL_DATA.filter(d => d.provider === 'GCP').reduce((s, d) => s + d.value, 0);
  const aiTotal    = WATERFALL_DATA.filter(d => d.provider === 'Claude').reduce((s, d) => s + d.value, 0);
  const grandTotal = awsTotal + gcpTotal + aiTotal;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Multi-Cloud Cost Breakdown</h1>
        <p className="text-muted-foreground">Unified spend view across AWS, GCP, and AI services</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Spend', value: grandTotal, color: 'text-foreground',  bg: 'bg-muted',         icon: DollarSign },
          { label: 'AWS',         value: awsTotal,   color: 'text-amber-500',   bg: 'bg-amber-500/10',  icon: Cloud      },
          { label: 'GCP',         value: gcpTotal,   color: 'text-blue-500',    bg: 'bg-blue-500/10',   icon: Cloud      },
          { label: 'Claude AI',   value: aiTotal,    color: 'text-violet-500',  bg: 'bg-violet-500/10', icon: TrendingUp },
        ].map(c => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <div className={`p-2 rounded-xl ${c.bg}`}><Icon className={`w-4 h-4 ${c.color}`} /></div>
                </div>
                <p className={`text-2xl font-bold ${c.color}`}>${c.value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{Math.round((c.value / grandTotal) * 100)}% of total</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service waterfall */}
        <Card className="border-border">
          <CardHeader><CardTitle className="text-base">Cost by Service</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={WATERFALL_DATA} layout="vertical" margin={{ left: 10, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `$${v}`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={90} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Cost" radius={[0, 4, 4, 0]}>
                  {WATERFALL_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
                  <LabelList dataKey="value" position="right" formatter={(v: number) => `$${v.toLocaleString()}`}
                    style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Trend stacked bar */}
        <Card className="border-border">
          <CardHeader><CardTitle className="text-base">6-Month Provider Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={MONTHLY_TREND} margin={{ top: 4, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="aws"    name="AWS"    stackId="a" fill="#f59e0b" />
                <Bar dataKey="gcp"    name="GCP"    stackId="a" fill="#3b82f6" />
                <Bar dataKey="claude" name="Claude" stackId="a" fill="#8b5cf6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed table */}
      <Card className="border-border">
        <CardHeader><CardTitle className="text-base">Detailed Service Costs</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Service','Provider','Monthly Cost','% of Total','Trend'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...WATERFALL_DATA].sort((a, b) => b.value - a.value).map(d => (
                <tr key={d.name} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3"><Badge className={PROVIDER_BADGE[d.provider]}>{d.provider}</Badge></td>
                  <td className="px-4 py-3 font-semibold">${d.value.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-1.5 max-w-20">
                        <div className="h-1.5 rounded-full" style={{ width: `${(d.value / grandTotal) * 100}%`, backgroundColor: d.color }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{Math.round((d.value / grandTotal) * 100)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-green-500">+{Math.round(3 + Math.abs(d.value % 13))}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
