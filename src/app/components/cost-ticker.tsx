import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';

const HOURLY_RATE = 7.18; // $/hr  (≈$5,274/mo)
const RATE_PER_MS  = HOURLY_RATE / 3_600_000;
// Simulate mid-month offset so the counter starts at a realistic value
const MONTH_OFFSET = 5274 * 0.53;

export function CostTicker() {
  const [spend, setSpend] = useState(MONTH_OFFSET);
  const [flash, setFlash]  = useState(false);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      setSpend(MONTH_OFFSET + elapsed * RATE_PER_MS);
    }, 80);

    // Flash green every ~4s to show "live"
    const flashInterval = setInterval(() => {
      setFlash(true);
      setTimeout(() => setFlash(false), 400);
    }, 4000);

    return () => {
      clearInterval(interval);
      clearInterval(flashInterval);
    };
  }, []);

  return (
    <div
      className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors duration-300 ${
        flash
          ? 'bg-green-500/15 border-green-500/30 text-green-400'
          : 'bg-muted/50 border-border text-muted-foreground'
      }`}
      title={`Live monthly spend • $${HOURLY_RATE.toFixed(2)}/hr`}
    >
      <Zap className={`w-3 h-3 ${flash ? 'text-green-400' : 'text-amber-500'}`} />
      <span className="tabular-nums tracking-tight">${spend.toFixed(4)}</span>
    </div>
  );
}
