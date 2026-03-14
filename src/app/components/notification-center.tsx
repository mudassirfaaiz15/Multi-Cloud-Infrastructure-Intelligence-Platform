import { useState } from 'react';
import { Bell, X, AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { cn } from '@/app/components/ui/utils';

interface Notification {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  time: string;
  read: boolean;
  category: 'anomaly' | 'budget' | 'scan' | 'system';
}

const DEMO_NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'critical', title: 'Critical Anomaly Detected', message: 'EC2 costs in us-east-1 are 106% above baseline — $2,480 unexpected spend.', time: '2m ago', read: false, category: 'anomaly' },
  { id: '2', type: 'warning', title: 'Budget Alert — AWS Production', message: 'You have used 96.4% of your $5,000 monthly budget. Forecast exceeds limit.', time: '15m ago', read: false, category: 'budget' },
  { id: '3', type: 'warning', title: 'GCP Project Over Budget', message: 'BigQuery costs are 641% above normal due to unoptimized queries.', time: '1h ago', read: false, category: 'anomaly' },
  { id: '4', type: 'info', title: 'AWS Scan Complete', message: '289 resources scanned across 6 regions. 5 optimization opportunities found.', time: '2h ago', read: true, category: 'scan' },
  { id: '5', type: 'success', title: 'Savings Applied', message: 'Rightsizing recommendation applied to staging-cluster. Saving $240/month.', time: '1d ago', read: true, category: 'system' },
  { id: '6', type: 'info', title: 'Claude API Usage', message: 'Monthly token budget is at 72.6%. 27.4% remaining for the month.', time: '2d ago', read: true, category: 'budget' },
];

const TYPE_CONFIG = {
  critical: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', dot: 'bg-red-500' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', dot: 'bg-amber-500' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', dot: 'bg-blue-500' },
  success: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', dot: 'bg-green-500' },
};



export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(DEMO_NOTIFICATIONS);

  const unread = notifications.filter(n => !n.read).length;

  const markAllRead = () =>
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const dismiss = (id: string) =>
    setNotifications(prev => prev.filter(n => n.id !== id));

  const markRead = (id: string) =>
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  return (
    <>
      {/* Bell button */}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(!open)}
          className="relative"
          id="notification-bell"
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </Button>
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel */}
      <div className={cn(
        'fixed right-4 top-16 z-50 w-96 max-h-[80vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl transition-all duration-300',
        open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-4 pointer-events-none'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unread > 0 && <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">{unread} new</Badge>}
          </div>
          <div className="flex items-center gap-1">
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1">
                Mark all read
              </button>
            )}
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setOpen(false)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {notifications.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">All caught up!</p>
            </div>
          ) : (
            notifications.map(n => {
              const cfg = TYPE_CONFIG[n.type];
              const Icon = cfg.icon;
              return (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={cn(
                    'flex gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors group relative',
                    !n.read && 'bg-primary/3'
                  )}
                >
                  {!n.read && <div className={`absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
                  <div className={`p-1.5 rounded-lg ${cfg.bg} shrink-0 mt-0.5`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs font-medium', !n.read && 'font-semibold')}>{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{n.time}</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    title="Dismiss notification"
                    aria-label="Dismiss notification"
                  >
                    <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
