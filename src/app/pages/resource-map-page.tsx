import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { DollarSign, Cloud, Globe } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Region {
  id: string;
  name: string;
  provider: 'AWS' | 'GCP' | 'Azure';
  cx: number;
  cy: number;
  resources: number;
  cost: number;
  status: 'healthy' | 'warning' | 'critical';
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const REGIONS: Region[] = [
  { id: 'us-east-1',      name: 'US East (N. Virginia)',      provider: 'AWS', cx: 230, cy: 185, resources: 142, cost: 2840, status: 'warning'  },
  { id: 'us-west-2',      name: 'US West (Oregon)',            provider: 'AWS', cx: 110, cy: 175, resources: 67,  cost: 1120, status: 'healthy'  },
  { id: 'eu-west-1',      name: 'Europe (Ireland)',            provider: 'AWS', cx: 460, cy: 140, resources: 34,  cost: 540,  status: 'healthy'  },
  { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)',    provider: 'AWS', cx: 760, cy: 255, resources: 18,  cost: 245,  status: 'healthy'  },
  { id: 'us-central1',    name: 'GCP US Central (Iowa)',       provider: 'GCP', cx: 185, cy: 185, resources: 28,  cost: 310,  status: 'critical' },
  { id: 'europe-west1',    name: 'GCP Europe (Belgium)',       provider: 'GCP', cx: 480, cy: 150, resources: 12,  cost: 121,  status: 'healthy'  },
  { id: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)',        provider: 'AWS', cx: 825, cy: 182, resources: 8,   cost: 98,   status: 'healthy'  },
];

const STATUS = {
  healthy:  { fill: '#22c55e', pulse: false },
  warning:  { fill: '#f59e0b', pulse: true  },
  critical: { fill: '#ef4444', pulse: true  },
} as const;

const PROVIDER_BADGE: Record<Region['provider'], string> = {
  AWS:   'bg-amber-500/10 text-amber-500 border-amber-500/20',
  GCP:   'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Azure: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
};

// ─── Continent Paths (equirectangular projection, viewBox 960×500) ─────────────

const CONTINENTS = [
  // North America
  { d: 'M 50 80 L 80 60 L 140 55 L 210 60 L 260 65 L 280 80 L 290 110 L 285 150 L 275 190 L 265 230 L 250 255 L 225 265 L 200 260 L 175 250 L 160 230 L 155 210 L 145 200 L 120 195 L 95 185 L 70 175 L 55 155 L 45 130 L 48 100 Z' },
  // South America
  { d: 'M 195 275 L 225 268 L 265 272 L 285 290 L 295 315 L 300 355 L 295 400 L 280 440 L 255 455 L 230 450 L 210 430 L 195 400 L 188 360 L 185 320 L 190 295 Z' },
  // Europe
  { d: 'M 415 60 L 460 55 L 505 58 L 535 70 L 545 90 L 535 115 L 515 135 L 490 148 L 462 152 L 435 142 L 415 125 L 408 105 L 410 80 Z' },
  // Africa
  { d: 'M 430 165 L 465 158 L 505 158 L 530 175 L 545 205 L 548 245 L 545 285 L 540 325 L 525 370 L 505 400 L 480 415 L 455 410 L 432 385 L 415 345 L 408 300 L 408 255 L 412 210 L 420 180 Z' },
  // Asia
  { d: 'M 545 42 L 640 38 L 730 36 L 820 42 L 875 55 L 895 80 L 890 110 L 875 145 L 850 175 L 820 200 L 790 215 L 750 222 L 700 218 L 655 210 L 610 220 L 570 215 L 548 190 L 542 155 L 540 115 L 542 75 Z' },
  // Australia
  { d: 'M 755 305 L 800 295 L 845 295 L 880 305 L 900 330 L 905 360 L 895 390 L 870 408 L 840 412 L 808 405 L 778 388 L 760 360 L 752 330 Z' },
];

// ─── World Map SVG ─────────────────────────────────────────────────────────────

function WorldMap({ regions, selected, onSelect }: {
  regions: Region[];
  selected: Region | null;
  onSelect: (r: Region | null) => void;
}) {
  return (
    <div className="w-full rounded-xl overflow-hidden border border-border" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}>
      <svg viewBox="0 0 960 460" className="w-full h-auto" aria-label="Global cloud infrastructure map">
        {/* Ocean grid lines */}
        {[100, 200, 300, 400].map(y => (
          <line key={`h${y}`} x1="0" y1={y} x2="960" y2={y} stroke="#334155" strokeWidth="0.5" />
        ))}
        {[160, 320, 480, 640, 800].map(x => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="460" stroke="#334155" strokeWidth="0.5" />
        ))}

        {/* Continent fills */}
        {CONTINENTS.map((c, i) => (
          <path key={i} d={c.d} fill="#1e3a5f" stroke="#2563eb" strokeWidth="0.8" strokeOpacity="0.4" />
        ))}

        {/* Region markers */}
        {regions.map(r => {
          const s = STATUS[r.status];
          const isSelected = selected?.id === r.id;
          // Size proportional to resource count
          const radius = Math.max(7, Math.min(18, r.resources / 9));

          return (
            <g
              key={r.id}
              onClick={() => onSelect(isSelected ? null : r)}
              className="cursor-pointer"
              role="button"
              aria-label={`${r.name}: ${r.resources} resources, $${r.cost.toLocaleString()}/month`}
            >
              {/* Pulse ring for warnings/criticals */}
              {s.pulse && (
                <circle cx={r.cx} cy={r.cy} r={radius + 6} fill={s.fill} opacity="0">
                  <animate attributeName="r" values={`${radius + 2};${radius + 14};${radius + 2}`} dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              {/* Selection ring */}
              {isSelected && (
                <circle cx={r.cx} cy={r.cy} r={radius + 10} fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.8" />
              )}
              {/* Glow */}
              <circle cx={r.cx} cy={r.cy} r={radius + 2} fill={s.fill} opacity="0.2" />
              {/* Main dot */}
              <circle cx={r.cx} cy={r.cy} r={radius} fill={s.fill} stroke="white" strokeWidth="1.5" opacity="0.95" />
              {/* Inner highlight */}
              <circle cx={r.cx - radius * 0.25} cy={r.cy - radius * 0.25} r={radius * 0.35} fill="white" opacity="0.25" />
              {/* Provider label */}
              <text
                x={r.cx}
                y={r.cy + radius + 13}
                textAnchor="middle"
                fontSize="9"
                fill="white"
                opacity="0.7"
                fontFamily="system-ui, sans-serif"
              >
                {r.id.split('-').slice(0, 2).join('-')}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function MapStat({ label, value, icon: Icon, colorClass, bgClass }: {
  label: string; value: string; icon: typeof Cloud; colorClass: string; bgClass: string;
}) {
  return (
    <Card className="border-border">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className={`p-2 rounded-xl ${bgClass}`}>
            <Icon className={`w-4 h-4 ${colorClass}`} />
          </div>
        </div>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ResourceMapPage() {
  const [selected, setSelected] = useState<Region | null>(null);

  const totalResources = REGIONS.reduce((s, r) => s + r.resources, 0);
  const totalCost      = REGIONS.reduce((s, r) => s + r.cost, 0);

  const statusLabel = (s: Region['status']) =>
    ({ healthy: 'bg-green-500/10 text-green-500', warning: 'bg-amber-500/10 text-amber-500', critical: 'bg-red-500/10 text-red-500' })[s];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Resource Map</h1>
        <p className="text-muted-foreground">Global view of your cloud infrastructure across all regions</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MapStat label="Total Resources"  value={totalResources.toString()}           icon={Cloud}    colorClass="text-primary"    bgClass="bg-primary/10"    />
        <MapStat label="Monthly Spend"    value={`$${totalCost.toLocaleString()}`}    icon={DollarSign} colorClass="text-green-500" bgClass="bg-green-500/10" />
        <MapStat label="Active Regions"   value={REGIONS.length.toString()}           icon={Globe}    colorClass="text-blue-500"   bgClass="bg-blue-500/10"   />
      </div>

      {/* Map + detail panel */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Infrastructure Regions</CardTitle>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {[
                { fill: '#22c55e', label: 'Healthy'  },
                { fill: '#f59e0b', label: 'Warning'  },
                { fill: '#ef4444', label: 'Critical' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.fill }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <WorldMap regions={REGIONS} selected={selected} onSelect={setSelected} />

          {/* Selected region detail */}
          {selected && (
            <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div>
                <p className="font-semibold">{selected.name}</p>
                <Badge className={`${PROVIDER_BADGE[selected.provider]} mt-1`}>{selected.provider}</Badge>
              </div>
              <div className="flex gap-6 ml-auto">
                {[
                  { label: 'Resources', value: selected.resources },
                  { label: 'Monthly Cost', value: `$${selected.cost.toLocaleString()}` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-base font-bold">{value}</p>
                  </div>
                ))}
                <span className={`px-3 py-1 rounded-full text-xs font-medium self-center ${statusLabel(selected.status)}`}>
                  {selected.status}
                </span>
              </div>
            </div>
          )}
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
                  <tr
                    key={r.id}
                    onClick={() => setSelected(selected?.id === r.id ? null : r)}
                    className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer ${selected?.id === r.id ? 'bg-primary/5' : ''}`}
                  >
                    <td className="px-4 py-3 font-medium">{r.id}</td>
                    <td className="px-4 py-3"><Badge className={PROVIDER_BADGE[r.provider]}>{r.provider}</Badge></td>
                    <td className="px-4 py-3">{r.resources}</td>
                    <td className="px-4 py-3 font-medium">${r.cost.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusLabel(r.status)}`}>{r.status}</span>
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
