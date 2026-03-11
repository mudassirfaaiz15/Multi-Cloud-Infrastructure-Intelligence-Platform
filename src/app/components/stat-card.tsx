import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  colorClass: string;   // e.g. 'text-primary'
  bgClass: string;      // e.g. 'bg-primary/10'
  cardClass?: string;   // optional override for card border/bg
}

/**
 * Reusable summary stat card used across dashboard, AI usage, cost forecast,
 * anomaly detection, and other pages.
 */
export function StatCard({ label, value, sub, icon: Icon, colorClass, bgClass, cardClass }: StatCardProps) {
  return (
    <Card className={`border-border ${cardClass ?? ''}`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className={`p-2 rounded-xl ${bgClass}`}>
            <Icon className={`w-4 h-4 ${colorClass}`} />
          </div>
        </div>
        <p className="text-3xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
