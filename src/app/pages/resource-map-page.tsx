import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { MapPin, DollarSign, Cloud, Globe } from 'lucide-react';

interface Region {
  id: string;
  name: string;
  provider: 'AWS' | 'GCP' | 'Azure';
  cx: number; // SVG x coordinate
  cy: number; // SVG y coordinate
  resources: number;
  cost: number;
  status: 'healthy' | 'warning' | 'critical';
}

const REGIONS: Region[] = [
  { id: 'us-east-1', name: 'US East (N. Virginia)', provider: 'AWS', cx: 230, cy: 185, resources: 142, cost: 2840, status: 'warning' },
  { id: 'us-west-2', name: 'US West (Oregon)', provider: 'AWS', cx: 110, cy: 175, resources: 67, cost: 1120, status: 'healthy' },
  { id: 'eu-west-1', name: 'Europe (Ireland)', provider: 'AWS', cx: 460, cy: 140, resources: 34, cost: 540, status: 'healthy' },
  { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)', provider: 'AWS', cx: 770, cy: 250, resources: 18, cost: 245, status: 'healthy' },
  { id: 'us-central1', name: 'US Central (Iowa)', provider: 'GCP', cx: 185, cy: 185, resources: 28, cost: 310, status: 'critical' },
  { id: 'europe-west1', name: 'Europe (Belgium)', provider: 'GCP', cx: 480, cy: 148, resources: 12, cost: 121, status: 'healthy' },
  { id: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)', provider: 'AWS', cx: 830, cy: 180, resources: 8, cost: 98, status: 'healthy' },
];

const STATUS_COLORS = {
  healthy: { fill: '#22c55e', ring: '#22c55e40', pulse: false },
  warning: { fill: '#f59e0b', ring: '#f59e0b40', pulse: true },
  critical: { fill: '#ef4444', ring: '#ef444440', pulse: true },
};

const PROVIDER_BADGE = {
  AWS: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  GCP: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Azure: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
};

export function ResourceMapPage() {
  const [selected, setSelected] = useState<Region | null>(null);

  const totalResources = REGIONS.reduce((s, r) => s + r.resources, 0);
  const totalCost = REGIONS.reduce((s, r) => s + r.cost, 0);
  const issues = REGIONS.filter(r => r.status !== 'healthy').length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Resource Map</h1>
        <p className="text-muted-foreground">Global view of your cloud infrastructure across all regions</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Resources', value: totalResources.toString(), icon: Cloud, col: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Monthly Spend', value: `$${totalCost.toLocaleString()}`, icon: DollarSign, col: 'text-green-500', bg: 'bg-green-500/10' },
          { label: 'Active Regions', value: REGIONS.length.toString(), icon: Globe, col: 'text-blue-500', bg: 'bg-blue-500/10' },
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

      {/* World Map SVG */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Infrastructure Regions</CardTitle>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {[{ col: '#22c55e', label: 'Healthy' }, { col: '#f59e0b', label: 'Warning' }, { col: '#ef4444', label: 'Critical' }].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.col }} />
                  <span>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative bg-muted/30 rounded-xl overflow-hidden">
            <svg viewBox="0 0 960 500" className="w-full h-auto">
              {/* Simple world map silhouette paths - continents */}
              <rect width="960" height="500" fill="transparent" />
              {/* North America */}
              <path d="M80,80 L260,60 L290,120 L270,200 L250,240 L210,260 L180,240 L160,200 L120,180 L80,160 Z" fill="currentColor" className="text-muted opacity-20" />
              {/* South America */}
              <path d="M200,270 L260,260 L280,300 L290,380 L260,440 L220,440 L190,400 L180,340 L190,300 Z" fill="currentColor" className="text-muted opacity-20" />
              {/* Europe */}
              <path d="M420,60 L520,50 L540,100 L510,140 L460,150 L430,130 L410,100 Z" fill="currentColor" className="text-muted opacity-20" />
              {/* Africa */}
              <path d="M430,160 L510,150 L530,200 L530,320 L490,380 L450,380 L420,320 L410,220 Z" fill="currentColor" className="text-muted opacity-20" />
              {/* Asia */}
              <path d="M540,40 L860,40 L880,100 L860,200 L800,240 L720,230 L660,200 L600,220 L560,180 L540,140 Z" fill="currentColor" className="text-muted opacity-20" />
              {/* Australia */}
              <path d="M760,300 L880,290 L900,360 L860,400 L800,400 L760,360 Z" fill="currentColor" className="text-muted opacity-20" />

              {/* Region dots */}
              {REGIONS.map(region => {
                const sc = STATUS_COLORS[region.status];
                const isSelected = selected?.id === region.id;
                const size = Math.max(8, Math.min(20, region.resources / 10));
                return (
                  <g key={region.id} onClick={() => setSelected(selected?.id === region.id ? null : region)} className="cursor-pointer">
                    {/* Pulse ring */}
                    {sc.pulse && (
                      <circle cx={region.cx} cy={region.cy} r={size + 8} fill={sc.ring}>
                        <animate attributeName="r" values={`${size + 4};${size + 14};${size + 4}`} dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}
                    {/* Selected ring */}
                    {isSelected && <circle cx={region.cx} cy={region.cy} r={size + 10} fill="none" stroke={sc.fill} strokeWidth="2" strokeDasharray="4 2" />}
                    {/* Main dot */}
                    <circle cx={region.cx} cy={region.cy} r={size} fill={sc.fill} opacity="0.9" />
                    {/* Provider indicator */}
                    <circle cx={region.cx} cy={region.cy} r={size / 2} fill="white" opacity="0.3" />
                    {/* Label */}
                    <text x={region.cx} y={region.cy + size + 14} textAnchor="middle" fontSize="9" fill="currentColor" className="text-muted-foreground select-none">
                      {region.id.split('-').slice(0, 2).join('-')}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Selected region tooltip */}
            {selected && (
              <div className="absolute bottom-4 left-4 bg-card border border-border rounded-xl p-4 shadow-2xl min-w-56 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-sm">{selected.name}</p>
                  <Badge className={PROVIDER_BADGE[selected.provider]}>{selected.provider}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Resources', value: selected.resources },
                    { label: 'Monthly Cost', value: `$${selected.cost.toLocaleString()}` },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-bold">{value}</p>
                    </div>
                  ))}
                </div>
                <div className={`mt-3 px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5 ${
                  selected.status === 'healthy' ? 'bg-green-500/10 text-green-500' :
                  selected.status === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                  'bg-red-500/10 text-red-500'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    selected.status === 'healthy' ? 'bg-green-500' :
                    selected.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                  }`} />
                  {selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Regions table */}
      <Card className="border-border">
        <CardHeader><CardTitle className="text-base">Region Breakdown</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['Region', 'Provider', 'Resources', 'Monthly Cost', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...REGIONS].sort((a, b) => b.cost - a.cost).map(r => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setSelected(selected?.id === r.id ? null : r)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-medium">{r.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge className={PROVIDER_BADGE[r.provider]}>{r.provider}</Badge></td>
                    <td className="px-4 py-3">{r.resources}</td>
                    <td className="px-4 py-3 font-medium">${r.cost.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[r.status].fill === '#22c55e' ? 'bg-green-500/10 text-green-500' : STATUS_COLORS[r.status].fill === '#f59e0b' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
