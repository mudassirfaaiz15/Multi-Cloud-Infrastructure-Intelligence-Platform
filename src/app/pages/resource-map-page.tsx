import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { DollarSign, Cloud, Globe, Wifi } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Region {
  id: string;
  name: string;
  provider: 'AWS' | 'GCP' | 'Azure';
  cx: number;   // SVG x
  cy: number;   // SVG y
  resources: number;
  cost: number;
  status: 'healthy' | 'warning' | 'critical';
}

// ─── Equirectangular projection helpers (viewBox 960 × 460) ──────────────────
// x = (lon + 180) * (960/360)   y = (90 - lat) * (460/180)
const ll = (lat: number, lon: number) => ({
  cx: Math.round((lon + 180) * (960 / 360)),
  cy: Math.round((90 - lat) * (460 / 180)),
});

// ─── Regions (real geographic lat/lon) ───────────────────────────────────────
const REGIONS: Region[] = [
  { id: 'us-east-1',      name: 'US East (N. Virginia)',   provider: 'AWS', ...ll(38.9,  -77.0),  resources: 142, cost: 2840, status: 'warning'  },
  { id: 'us-west-2',      name: 'US West (Oregon)',         provider: 'AWS', ...ll(45.5, -122.7),  resources: 67,  cost: 1120, status: 'healthy'  },
  { id: 'eu-west-1',      name: 'Europe (Ireland)',         provider: 'AWS', ...ll(53.3,   -8.5),  resources: 34,  cost: 540,  status: 'healthy'  },
  { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)', provider: 'AWS', ...ll(1.3,  103.8),  resources: 18,  cost: 245,  status: 'healthy'  },
  { id: 'us-central1',    name: 'GCP US Central (Iowa)',    provider: 'GCP', ...ll(41.8,  -93.6),  resources: 28,  cost: 310,  status: 'critical' },
  { id: 'europe-west1',   name: 'GCP Europe (Belgium)',     provider: 'GCP', ...ll(50.8,    4.4),  resources: 12,  cost: 121,  status: 'healthy'  },
  { id: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)',     provider: 'AWS', ...ll(35.7,  139.7),  resources: 8,   cost: 98,   status: 'healthy'  },
];

const STATUS = {
  healthy:  { fill: '#22c55e', glow: 'rgba(34,197,94,0.55)',   pulse: false },
  warning:  { fill: '#f59e0b', glow: 'rgba(245,158,11,0.55)',  pulse: true  },
  critical: { fill: '#ef4444', glow: 'rgba(239,68,68,0.55)',   pulse: true  },
} as const;

const PROVIDER_BADGE: Record<Region['provider'], string> = {
  AWS:   'bg-amber-500/10 text-amber-500 border-amber-500/20',
  GCP:   'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Azure: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
};

// ─── Continent paths — simplified real-world equirectangular ─────────────────
const CONTINENTS = [
  // North America
  { key: 'na', d: 'M 68 74 L 82 60 L 105 53 L 135 50 L 162 50 L 185 52 L 205 50 L 225 53 L 246 58 L 262 64 L 276 72 L 284 84 L 288 98 L 287 114 L 282 130 L 275 146 L 267 160 L 258 174 L 248 188 L 236 202 L 222 216 L 208 228 L 196 238 L 186 244 L 175 242 L 162 238 L 150 230 L 138 220 L 126 210 L 114 202 L 100 196 L 86 188 L 74 178 L 64 164 L 59 148 L 59 132 L 63 116 L 65 100 Z' },
  // Greenland
  { key: 'gl', d: 'M 264 30 L 280 25 L 298 27 L 313 35 L 316 48 L 308 60 L 292 66 L 275 63 L 264 53 L 262 40 Z' },
  // South America
  { key: 'sa', d: 'M 196 270 L 218 262 L 242 264 L 262 272 L 276 284 L 285 300 L 290 320 L 290 342 L 287 364 L 280 386 L 268 408 L 252 426 L 235 440 L 218 444 L 203 438 L 190 420 L 180 398 L 174 374 L 171 348 L 171 322 L 176 300 L 184 280 Z' },
  // Europe (mainland + Scandinavia)
  { key: 'eu', d: 'M 430 56 L 452 52 L 476 52 L 500 55 L 520 62 L 534 74 L 537 90 L 530 106 L 518 120 L 502 130 L 484 136 L 464 138 L 446 132 L 432 120 L 424 106 L 425 88 Z' },
  { key: 'sc', d: 'M 466 36 L 480 30 L 495 32 L 503 44 L 501 56 L 490 62 L 476 58 L 466 48 Z' },
  { key: 'uk', d: 'M 444 68 L 453 63 L 460 68 L 458 78 L 450 82 L 445 76 Z' },
  // Africa
  { key: 'af', d: 'M 426 158 L 454 152 L 486 152 L 512 160 L 530 176 L 540 198 L 543 222 L 540 248 L 534 274 L 524 300 L 510 325 L 492 346 L 474 360 L 457 365 L 440 358 L 424 340 L 412 314 L 404 286 L 400 258 L 402 230 L 407 204 L 415 178 Z' },
  { key: 'mg', d: 'M 558 278 L 565 272 L 568 282 L 565 294 L 558 298 L 553 290 Z' },
  // main Asia block
  { key: 'as', d: 'M 546 46 L 590 40 L 645 36 L 705 34 L 762 35 L 812 38 L 850 45 L 876 55 L 892 70 L 894 90 L 884 114 L 864 136 L 838 156 L 806 172 L 770 180 L 730 182 L 690 178 L 654 168 L 622 162 L 596 162 L 570 166 L 552 172 L 543 158 L 540 136 L 540 112 L 541 88 L 542 66 Z' },
  // Indian subcontinent
  { key: 'in', d: 'M 598 160 L 620 155 L 640 160 L 650 175 L 650 194 L 638 210 L 620 220 L 603 216 L 591 202 L 587 185 Z' },
  // Arabian Peninsula
  { key: 'ar', d: 'M 546 164 L 570 158 L 588 162 L 596 176 L 593 194 L 575 204 L 556 204 L 542 193 L 538 175 Z' },
  // SE Asia
  { key: 'sea1', d: 'M 726 198 L 754 192 L 772 196 L 775 208 L 764 218 L 745 220 L 728 214 Z' },
  { key: 'sea2', d: 'M 778 212 L 800 206 L 812 212 L 808 224 L 793 228 L 778 222 Z' },
  // Japan
  { key: 'jp', d: 'M 842 138 L 852 134 L 860 138 L 857 150 L 847 156 L 839 150 Z' },
  // Australia
  { key: 'au', d: 'M 748 306 L 782 295 L 820 292 L 854 296 L 878 310 L 892 330 L 894 354 L 887 376 L 870 394 L 845 405 L 814 408 L 782 400 L 757 382 L 742 358 L 738 332 Z' },
  { key: 'tas', d: 'M 808 410 L 815 405 L 820 410 L 817 420 L 809 422 L 806 415 Z' },
  // Antarctica strip
  { key: 'ant', d: 'M 0 440 L 960 440 L 960 460 L 0 460 Z' },
];

// ─── Connection pairs ─────────────────────────────────────────────────────────
const CONNECTIONS: [string, string][] = [
  ['us-east-1',      'eu-west-1'],
  ['us-east-1',      'us-central1'],
  ['us-west-2',      'ap-northeast-1'],
  ['eu-west-1',      'europe-west1'],
  ['ap-southeast-1', 'ap-northeast-1'],
];

// Quadratic bezier arc
function arcPath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 - Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) * 0.22;
  return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
}

// ─── World Map Component ──────────────────────────────────────────────────────
function WorldMap({ regions, selected, onSelect }: {
  regions: Region[];
  selected: Region | null;
  onSelect: (r: Region | null) => void;
}) {
  return (
    <div
      className="w-full rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl"
      style={{ background: 'radial-gradient(ellipse at 50% 38%, #0c2340 0%, #060d1c 55%, #020509 100%)' }}
    >
      <svg
        viewBox="0 0 960 460"
        className="w-full h-auto select-none"
        aria-label="Global cloud infrastructure map"
      >
        <defs>
          {/* Ambient ocean radial */}
          <radialGradient id="oceanAmbient" cx="50%" cy="38%" r="60%">
            <stop offset="0%"   stopColor="#0b2d5e" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#020509" stopOpacity="0"   />
          </radialGradient>

          {/* Land fill gradient — subtle top-lighting */}
          <linearGradient id="landGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#1a4a38" />
            <stop offset="100%" stopColor="#0c2b1f" />
          </linearGradient>
          {/* Antarctica - lighter */}
          <linearGradient id="iceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#c8d8e8" />
            <stop offset="100%" stopColor="#8aa4b8" />
          </linearGradient>

          {/* Glow filter for markers */}
          <filter id="markerGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Soft ambient glow behind markers */}
          <filter id="ambientGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="9" />
          </filter>
          {/* Edge vignette */}
          <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
            <stop offset="60%" stopColor="transparent" stopOpacity="0"   />
            <stop offset="100%" stopColor="#020509"    stopOpacity="0.85" />
          </radialGradient>
        </defs>

        {/* Ocean ambient glow */}
        <ellipse cx="480" cy="200" rx="510" ry="270" fill="url(#oceanAmbient)" />

        {/* Lat/Lon grid lines */}
        {[-60,-30,0,30,60].map(lat => {
          const y = (90 - lat) * (460 / 180);
          const isEquator = lat === 0;
          return (
            <line key={`lat${lat}`} x1="0" y1={y} x2="960" y2={y}
              stroke={isEquator ? '#0d3d6e' : '#0a2240'}
              strokeWidth={isEquator ? 1.2 : 0.6}
              strokeDasharray={isEquator ? '7 4' : 'none'}
            />
          );
        })}
        {[-150,-120,-90,-60,-30,0,30,60,90,120,150].map(lon => {
          const x = (lon + 180) * (960 / 360);
          return (
            <line key={`lon${lon}`} x1={x} y1="0" x2={x} y2="460"
              stroke="#0a2240" strokeWidth="0.6" />
          );
        })}

        {/* Continents */}
        {CONTINENTS.map(c => (
          <path
            key={c.key}
            d={c.d}
            fill={c.key === 'ant' ? 'url(#iceGrad)' : 'url(#landGrad)'}
            stroke={c.key === 'ant' ? '#8aa4b8' : '#2a7a50'}
            strokeWidth="0.7"
            strokeOpacity="0.6"
          />
        ))}

        {/* Connection arcs */}
        {CONNECTIONS.map(([aId, bId], i) => {
          const ra = regions.find(r => r.id === aId);
          const rb = regions.find(r => r.id === bId);
          if (!ra || !rb) return null;
          const highlighted = selected?.id === aId || selected?.id === bId;
          return (
            <g key={`arc-${i}`}>
              {/* Glow copy */}
              {highlighted && (
                <path
                  d={arcPath(ra.cx, ra.cy, rb.cx, rb.cy)}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="3"
                  strokeOpacity="0.2"
                />
              )}
              <path
                d={arcPath(ra.cx, ra.cy, rb.cx, rb.cy)}
                fill="none"
                stroke={highlighted ? '#818cf8' : '#1e3a6e'}
                strokeWidth={highlighted ? 1.4 : 0.8}
                strokeOpacity={highlighted ? 0.9 : 0.4}
                strokeDasharray={highlighted ? 'none' : '5 4'}
              />
            </g>
          );
        })}

        {/* Region markers */}
        {regions.map(r => {
          const s = STATUS[r.status];
          const isSelected = selected?.id === r.id;
          const isConnected = selected
            ? CONNECTIONS.some(([a, b]) => (a === selected.id && b === r.id) || (b === selected.id && a === r.id))
            : false;
          const radius = Math.max(7, Math.min(17, r.resources / 9));
          const dim = selected && !isSelected && !isConnected;

          return (
            <g
              key={r.id}
              onClick={() => onSelect(isSelected ? null : r)}
              className="cursor-pointer"
              style={{ opacity: dim ? 0.35 : 1, transition: 'opacity 0.25s' }}
              role="button"
              aria-label={`${r.name}: ${r.resources} resources, $${r.cost.toLocaleString()}/month`}
            >
              {/* Distant ambient halo */}
              <circle cx={r.cx} cy={r.cy} r={radius + 12} fill={s.glow} filter="url(#ambientGlow)" opacity="0.7" />

              {/* Pulse ring for warning/critical */}
              {s.pulse && (
                <circle cx={r.cx} cy={r.cy} r={radius + 3} fill="none" stroke={s.fill} strokeWidth="1.5" opacity="0">
                  <animate attributeName="r"       values={`${radius};${radius + 20};${radius}`} dur="2.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.65;0;0.65"                           dur="2.2s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Spinning dashed ring when selected */}
              {isSelected && (
                <circle cx={r.cx} cy={r.cy} r={radius + 13} fill="none" stroke="white" strokeWidth="1.2" strokeOpacity="0.5" strokeDasharray="6 3">
                  <animateTransform attributeName="transform" type="rotate"
                    from={`0 ${r.cx} ${r.cy}`} to={`360 ${r.cx} ${r.cy}`} dur="7s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Solid indigo ring when connected */}
              {isConnected && (
                <circle cx={r.cx} cy={r.cy} r={radius + 9} fill="none" stroke="#818cf8" strokeWidth="1" strokeOpacity="0.6" strokeDasharray="3 2" />
              )}

              {/* Main glowing dot */}
              <circle cx={r.cx} cy={r.cy} r={radius} fill={s.fill} filter="url(#markerGlow)" opacity="0.9" />
              <circle cx={r.cx} cy={r.cy} r={radius} fill={s.fill} stroke="white" strokeWidth="1.5" />
              {/* Inner specular highlight */}
              <circle cx={r.cx - radius * 0.28} cy={r.cy - radius * 0.28} r={radius * 0.3} fill="white" opacity="0.28" />

              {/* Region ID label */}
              <text x={r.cx} y={r.cy + radius + 12} textAnchor="middle" fontSize="8" fill="white" opacity="0.6" fontFamily="ui-monospace,monospace">
                {r.id.split('-').slice(0, 2).join('-')}
              </text>
              {/* Provider label */}
              <text x={r.cx} y={r.cy + radius + 22} textAnchor="middle" fontSize="7" fill={s.fill} opacity="0.95" fontFamily="system-ui,sans-serif" fontWeight="600">
                {r.provider}
              </text>
            </g>
          );
        })}

        {/* Edge vignette overlay */}
        <rect x="0" y="0" width="960" height="460" fill="url(#vignette)" />

        {/* Bottom gradient fade */}
        <defs>
          <linearGradient id="bottomFade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="transparent" />
            <stop offset="100%" stopColor="#020509" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <rect x="0" y="370" width="960" height="90" fill="url(#bottomFade)" />
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

  const statusCls = (s: Region['status']) =>
    ({ healthy: 'bg-green-500/10 text-green-500', warning: 'bg-amber-500/10 text-amber-500', critical: 'bg-red-500/10 text-red-500' })[s];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Resource Map</h1>
        <p className="text-muted-foreground">Real-time view of your cloud infrastructure across all active regions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MapStat label="Total Resources" value={totalResources.toString()}        icon={Cloud}       colorClass="text-primary"   bgClass="bg-primary/10"    />
        <MapStat label="Monthly Spend"   value={`$${totalCost.toLocaleString()}`} icon={DollarSign}  colorClass="text-green-500" bgClass="bg-green-500/10" />
        <MapStat label="Active Regions"  value={REGIONS.length.toString()}        icon={Globe}        colorClass="text-blue-500"  bgClass="bg-blue-500/10"  />
      </div>

      {/* Map card */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Infrastructure Regions</CardTitle>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
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
              <div className="flex items-center gap-1.5 ml-1 border-l border-border pl-3">
                <div className="w-5 border-t border-dashed border-indigo-400/60" />
                <span>Traffic arc</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <WorldMap regions={REGIONS} selected={selected} onSelect={setSelected} />

          {/* Selected region detail strip */}
          {selected ? (
            <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: STATUS[selected.status].fill }} />
                <div>
                  <p className="font-semibold text-sm">{selected.name}</p>
                  <Badge className={`${PROVIDER_BADGE[selected.provider]} mt-0.5`}>{selected.provider}</Badge>
                </div>
              </div>
              <div className="flex gap-6 ml-auto flex-wrap">
                <div>
                  <p className="text-xs text-muted-foreground">Resources</p>
                  <p className="text-lg font-bold">{selected.resources}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Cost</p>
                  <p className="text-lg font-bold">${selected.cost.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Connections</p>
                  <p className="text-lg font-bold">
                    {CONNECTIONS.filter(([a, b]) => a === selected.id || b === selected.id).length}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium self-center ${statusCls(selected.status)}`}>
                  {selected.status}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <Wifi className="w-3.5 h-3.5" />
              Click any glowing marker to inspect region details and highlight traffic connections
            </div>
          )}
        </CardContent>
      </Card>

      {/* Region breakdown table */}
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
                    className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer ${selected?.id === r.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS[r.status].fill }} />
                        <span className="font-medium">{r.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge className={PROVIDER_BADGE[r.provider]}>{r.provider}</Badge></td>
                    <td className="px-4 py-3">{r.resources}</td>
                    <td className="px-4 py-3 font-medium">${r.cost.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusCls(r.status)}`}>{r.status}</span>
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
