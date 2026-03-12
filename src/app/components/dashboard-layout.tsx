import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Scan,
  FileJson,
  Bell,
  Settings,
  Cloud,
  Menu,
  LogOut,
  X,
  DollarSign,
  Shield,
  User,
  ExternalLink,
  TrendingUp,
  Activity,
  AlertTriangle,
  MessageCircle,
  LocateFixed,
  Network,
  GitMerge,
  Bookmark,
  Mail,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { cn } from '@/app/components/ui/utils';
import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/auth-context';
import { ThemeToggle } from '@/app/components/theme-toggle';
import { CommandPalette, useCommandPalette } from '@/app/components/command-palette';
import { NotificationCenter } from '@/app/components/notification-center';
import { AIAdvisorWidget } from '@/app/components/ai-advisor-widget';
import { OnboardingModal } from '@/app/components/onboarding-modal';
import { CostTicker } from '@/app/components/cost-ticker';
import { AIChatSidebar } from '@/app/components/ai-chat-sidebar';
import { MobileTabBar } from '@/app/components/mobile-tab-bar';
import { TrendingDown, Terminal, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ─── Grouped Navigation ───────────────────────────────────────────────────────

interface NavItem {
  id: string;
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  collapsible?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Core',
    items: [
      { id: 'nav-dashboard', name: 'Dashboard', href: '/app', icon: LayoutDashboard },
      { id: 'nav-scan', name: 'Scan AWS', href: '/app/connect', icon: Scan },
      { id: 'nav-settings', name: 'Settings', href: '/app/settings', icon: Settings },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      { id: 'nav-resources', name: 'AWS Resources', href: '/app/aws-resources', icon: Cloud },
      { id: 'nav-gcp', name: 'GCP Resources', href: '/app/gcp-resources', icon: Cloud },
      { id: 'nav-map', name: 'Resource Map', href: '/app/resource-map', icon: LocateFixed },
      { id: 'nav-graph', name: 'Dependency Graph', href: '/app/dependency-graph', icon: Network },
      { id: 'nav-drift', name: 'Drift Detection', href: '/app/drift', icon: GitMerge },
    ],
  },
  {
    label: 'Cost & Finance',
    items: [
      { id: 'nav-costs', name: 'Costs', href: '/app/costs', icon: DollarSign },
      { id: 'nav-forecast', name: 'Cost Forecast', href: '/app/cost-forecast', icon: TrendingUp },
      { id: 'nav-budget', name: 'Budget vs Actual', href: '/app/budget-actuals', icon: BarChart2 },
      { id: 'nav-waterfall', name: 'Multi-Cloud Breakdown', href: '/app/costs/waterfall', icon: DollarSign },
      { id: 'nav-savings', name: 'Savings Recommendations', href: '/app/savings', icon: TrendingDown },
      { id: 'nav-accounts', name: 'Accounts', href: '/app/accounts', icon: Cloud },
    ],
  },
  {
    label: 'AI Features',
    items: [
      { id: 'nav-anomalies', name: 'Anomaly Detection', href: '/app/anomalies', icon: AlertTriangle },
      { id: 'nav-query', name: 'Cloud Query', href: '/app/cloud-query', icon: MessageCircle },
      { id: 'nav-cli', name: 'CLI Generator', href: '/app/cli', icon: Terminal },
      { id: 'nav-ai-usage', name: 'AI API Usage', href: '/app/ai-usage', icon: Activity },
      { id: 'nav-digest', name: 'Weekly Digest', href: '/app/digest', icon: Mail },
    ],
  },
  {
    label: 'Governance',
    items: [
      { id: 'nav-security', name: 'Security', href: '/app/security', icon: Shield },
      { id: 'nav-tagging', name: 'Tag Compliance', href: '/app/tagging', icon: Bookmark },
      { id: 'nav-rbac', name: 'Access Control', href: '/app/rbac', icon: User },
      { id: 'nav-iam', name: 'IAM Explainer', href: '/app/iam-explainer', icon: FileJson },
    ],
  },
  {
    label: 'More',
    collapsible: true,
    items: [
      { id: 'nav-integrations', name: 'Integrations', href: '/app/integrations', icon: ExternalLink },
      { id: 'nav-team', name: 'Team', href: '/app/team', icon: User },
      { id: 'nav-reminders', name: 'Reminders', href: '/app/reminders', icon: Bell },
    ],
  },
];

// ─── NavLink helper ───────────────────────────────────────────────────────────

function useThemeAccent(pathname: string) {
  useEffect(() => {
    const root = document.documentElement;
    if (pathname.includes('/costs') || pathname.includes('/budget') || pathname.includes('/savings')) {
      root.style.setProperty('--primary', '142 71% 45%'); // Green
    } else if (pathname.includes('/security') || pathname.includes('/anomalies')) {
      root.style.setProperty('--primary', '0 84% 60%'); // Red
    } else if (pathname.includes('/query') || pathname.includes('/ai-usage') || pathname.includes('/cli')) {
      root.style.setProperty('--primary', '271 91% 65%'); // Purple
    } else {
      root.style.setProperty('--primary', '221.2 83.2% 53.3%'); // Default Blue
    }
  }, [pathname]);
}

function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const location = useLocation();
  const isActive = item.href === '/app'
    ? location.pathname === '/app'
    : location.pathname.startsWith(item.href);
  const Icon = item.icon;

  return (
    <Link
      to={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{item.name}</span>
    </Link>
  );
}

// ─── Sidebar Nav ──────────────────────────────────────────────────────────────

function SidebarNav({ onClose }: { onClose?: () => void }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto" aria-label="Main navigation">
      {NAV_GROUPS.map(group => {
        const isCollapsed = collapsed[group.label];
        return (
          <div key={group.label}>
            <button
              onClick={() => group.collapsible && setCollapsed(p => ({ ...p, [group.label]: !p[group.label] }))}
              className={cn(
                'flex items-center justify-between w-full px-3 mb-1',
                group.collapsible && 'cursor-pointer hover:text-foreground transition-colors'
              )}
            >
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{group.label}</span>
              {group.collapsible && (
                <ChevronDown className={cn('w-3 h-3 text-muted-foreground transition-transform', isCollapsed && '-rotate-90')} />
              )}
            </button>
            {!isCollapsed && (
              <div className="space-y-0.5">
                {group.items.map(item => <NavLink key={item.id} item={item} onClick={onClose} />)}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();

  useThemeAccent(location.pathname);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      <div className="flex h-screen bg-background">
        {/* Desktop Sidebar */}
        <aside
          className="hidden md:flex md:flex-col md:w-60 bg-sidebar border-r border-sidebar-border"
          role="navigation"
          aria-label="Main navigation"
        >
          <div className="flex items-center gap-3 h-16 px-5 border-b border-sidebar-border shrink-0">
            <Link to="/" className="flex items-center gap-3" aria-label="Go to homepage">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
                <Cloud className="w-5 h-5 text-primary-foreground" aria-hidden="true" />
              </div>
              <span className="text-base font-semibold text-sidebar-foreground">ConsoleSensei</span>
            </Link>
          </div>

          <SidebarNav />

          <div className="p-3 border-t border-sidebar-border shrink-0 space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-xs"
              onClick={() => setShowOnboarding(true)}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-2" />
              Setup Guide
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-xs"
              onClick={handleLogout}
              aria-label="Sign out of your account"
            >
              <LogOut className="w-3.5 h-3.5 mr-2" aria-hidden="true" />
              Sign Out
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Navigation */}
          <header className="flex items-center justify-between h-16 px-4 md:px-6 bg-card border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={sidebarOpen}
              >
                <Menu className="w-5 h-5" aria-hidden="true" />
              </Button>
              <div className="flex items-center gap-2 md:hidden">
                <Cloud className="w-5 h-5 text-primary" aria-hidden="true" />
                <span className="text-base font-semibold">ConsoleSensei</span>
              </div>
              {/* Search hint */}
              <button
                onClick={() => setCommandPaletteOpen(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Search resources...
                <kbd className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border">⌘K</kbd>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <CostTicker />
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-muted-foreground font-mono">••••{user?.awsAccountId || '1234'}</span>
              </div>
              <ThemeToggle />
              <AIChatSidebar />
              <NotificationCenter />
              <Avatar className="w-8 h-8 cursor-pointer">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto pb-16 md:pb-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>

          <MobileTabBar />
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 md:hidden z-40 backdrop-blur-sm"
            onClick={closeSidebar}
            aria-hidden="true"
          >
            <aside
              className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border flex flex-col"
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="flex items-center justify-between h-16 px-5 border-b border-sidebar-border shrink-0">
                <Link to="/" className="flex items-center gap-3" onClick={closeSidebar}>
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
                    <Cloud className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="text-base font-semibold">ConsoleSensei</span>
                </Link>
                <Button variant="ghost" size="icon" onClick={closeSidebar} aria-label="Close navigation">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <SidebarNav onClose={closeSidebar} />
              <div className="p-3 border-t border-sidebar-border shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => { closeSidebar(); handleLogout(); }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Global floating components */}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      <AIAdvisorWidget />
      {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} />}
    </>
  );
}
