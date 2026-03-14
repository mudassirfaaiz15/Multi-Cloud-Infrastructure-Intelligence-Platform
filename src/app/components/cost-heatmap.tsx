import { useMemo, useState } from 'react';

const WEEKS = 12;
const DAYS  = 7;
const BASE  = 165;   // avg daily spend $

function seededRand(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function intensity(value: number, max: number): string {
  const r = value / max;
  if (r > 0.85) return '#22c55e';
  if (r > 0.65) return '#4ade80';
  if (r > 0.45) return '#86efac';
  if (r > 0.25) return '#bbf7d0';
  if (r > 0.05) return '#dcfce7';
  return 'hsl(var(--muted))';
}

export function CostHeatmap() {
  const [hovered, setHovered] = useState<{ value: number; date: string } | null>(null);

  const grid = useMemo(() => {
    const now   = new Date();
    const cells: { value: number; date: string; col: number; row: number }[] = [];
    for (let w = 0; w < WEEKS; w++) {
      for (let d = 0; d < DAYS; d++) {
        const dayOffset  = (WEEKS - 1 - w) * 7 + (DAYS - 1 - d);
        const date       = new Date(now);
        date.setDate(now.getDate() - dayOffset);
        const seed       = w * 10 + d;
        const multiplier = 0.4 + seededRand(seed) * 1.8; // 0.4–2.2×
        const value      = Math.round(BASE * multiplier);
        cells.push({
          value,
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          col: w,
          row: d,
        });
      }
    }
    return cells;
  }, []);

  const max      = Math.max(...grid.map(c => c.value));
  const total30  = grid.slice(-30).reduce((s, c) => s + c.value, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Daily Spend — Last 12 Weeks</span>
        <span>30-day total: <strong className="text-foreground">${total30.toLocaleString()}</strong></span>
      </div>

      {/* Grid */}
      <div className="relative">
        <div className="flex gap-1" onMouseLeave={() => setHovered(null)}>
          {Array.from({ length: WEEKS }, (_, w) => (
            <div key={w} className="flex flex-col gap-1">
              {Array.from({ length: DAYS }, (_, d) => {
                const cell = grid.find(c => c.col === w && c.row === d)!;
                return (
                  // eslint-disable-next-line react/forbid-dom-props
                  <div
                    key={d}
                    className="w-3.5 h-3.5 rounded-sm cursor-default transition-transform hover:scale-125"
                    style={{ backgroundColor: intensity(cell.value, max) }}
                    onMouseEnter={() => setHovered({ value: cell.value, date: cell.date })}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Tooltip */}
        {hovered && (
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-lg px-2.5 py-1.5 text-xs shadow-xl whitespace-nowrap pointer-events-none z-10">
            <strong>${hovered.value}</strong> on {hovered.date}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Less</span>
        {['hsl(var(--muted))','#dcfce7','#bbf7d0','#86efac','#4ade80','#22c55e'].map(c => (
          // eslint-disable-next-line react/forbid-dom-props
          <div key={c} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
