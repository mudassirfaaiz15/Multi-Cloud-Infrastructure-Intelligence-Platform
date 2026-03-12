import { Link, useLocation } from 'react-router';
import { LayoutDashboard, DollarSign, AlertTriangle, MapPin, Shield } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

const TABS = [
  { href: '/app',          icon: LayoutDashboard, label: 'Home'      },
  { href: '/app/costs',    icon: DollarSign,      label: 'Costs'     },
  { href: '/app/anomalies',icon: AlertTriangle,   label: 'Anomalies' },
  { href: '/app/resource-map', icon: MapPin,      label: 'Map'       },
  { href: '/app/security', icon: Shield,          label: 'Security'  },
] as const;

export function MobileTabBar() {
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-sidebar border-t border-sidebar-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Mobile navigation"
    >
      {TABS.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || (href !== '/app' && pathname.startsWith(href));
        return (
          <Link
            key={href}
            to={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className={cn('w-5 h-5', active && 'drop-shadow-[0_0_6px_hsl(var(--primary))]')} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
