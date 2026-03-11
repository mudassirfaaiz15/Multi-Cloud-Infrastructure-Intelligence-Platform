import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Users, Shield, ChevronDown, Check, Crown, Eye, DollarSign, Code2 } from 'lucide-react';

type Role = 'admin' | 'finance' | 'developer' | 'viewer';

interface RoleDefinition {
  id: Role;
  label: string;
  icon: typeof Crown;
  color: string;
  bg: string;
  badge: string;
  description: string;
  permissions: string[];
}

const ROLES: RoleDefinition[] = [
  {
    id: 'admin',
    label: 'Administrator',
    icon: Crown,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    description: 'Full access to all features, settings, and team management',
    permissions: ['View all dashboards', 'Manage integrations', 'Manage team members', 'Configure alerts', 'Export data', 'View financial data', 'Run infrastructure scans', 'Apply recommendations'],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: DollarSign,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    badge: 'bg-green-500/10 text-green-500 border-green-500/20',
    description: 'Focused on cost data, budgets, and financial reporting',
    permissions: ['View cost dashboards', 'View cost forecasts', 'View anomaly costs', 'Export financial reports', 'Set budget alerts'],
  },
  {
    id: 'developer',
    label: 'Developer',
    icon: Code2,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    description: 'Access to resource views, dependency graphs, and scan results',
    permissions: ['View resource inventory', 'View dependency graph', 'View drift detection', 'Run infrastructure scans', 'View AI API usage'],
  },
  {
    id: 'viewer',
    label: 'Viewer',
    icon: Eye,
    color: 'text-muted-foreground',
    bg: 'bg-muted',
    badge: 'bg-muted text-muted-foreground',
    description: 'Read-only access to the main dashboard and basic metrics',
    permissions: ['View main dashboard', 'View resource list (read-only)'],
  },
];

const TEAM_MEMBERS = [
  { id: 1, name: 'Mudassir Faaiz', email: 'mudassir@company.com', role: 'admin' as Role, avatar: 'MF', lastActive: 'Now' },
  { id: 2, name: 'Sarah Chen', email: 'sarah@company.com', role: 'finance' as Role, avatar: 'SC', lastActive: '2h ago' },
  { id: 3, name: 'Alex Kumar', email: 'alex@company.com', role: 'developer' as Role, avatar: 'AK', lastActive: '1d ago' },
  { id: 4, name: 'Maria García', email: 'maria@company.com', role: 'viewer' as Role, avatar: 'MG', lastActive: '3d ago' },
];

export function RBACPage() {
  const [members, setMembers] = useState(TEAM_MEMBERS);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [currentRole, setCurrentRole] = useState<Role>('admin');

  const updateRole = (id: number, role: Role) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m));
    setEditingId(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Access Control</h1>
          <p className="text-muted-foreground">Manage team roles and permissions across ConsoleSensei</p>
        </div>
        <Button className="gap-2"><Users className="w-4 h-4" /> Invite Member</Button>
      </div>

      {/* Current role banner */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Your current role: <span className="text-primary">Administrator</span></p>
              <p className="text-xs text-muted-foreground">You have full access to all features</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Preview as:</span>
              <div className="flex gap-1">
                {(['admin', 'finance', 'developer', 'viewer'] as Role[]).map(r => (
                  <button key={r} onClick={() => setCurrentRole(r)}
                    className={`px-2 py-1 rounded-lg text-xs capitalize transition-colors ${currentRole === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {ROLES.map(role => {
          const Icon = role.icon;
          const memberCount = members.filter(m => m.role === role.id).length;
          const isCurrentPreview = currentRole === role.id;
          return (
            <Card key={role.id} className={`border-border transition-all ${isCurrentPreview ? 'ring-2 ring-primary' : ''}`}>
              <CardContent className="pt-6">
                <div className={`w-10 h-10 rounded-xl ${role.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${role.color}`} />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">{role.label}</h3>
                  <Badge className={role.badge}>{memberCount}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-4">{role.description}</p>
                <div className="space-y-1.5">
                  {role.permissions.slice(0, 3).map(p => (
                    <div key={p} className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-green-500 shrink-0" />
                      <span className="text-[11px] text-muted-foreground">{p}</span>
                    </div>
                  ))}
                  {role.permissions.length > 3 && (
                    <p className="text-[11px] text-primary">+{role.permissions.length - 3} more permissions</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Team members table */}
      <Card className="border-border">
        <CardHeader><CardTitle className="text-base">Team Members</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Member', 'Email', 'Role', 'Last Active', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map(member => {
                const roleDef = ROLES.find(r => r.id === member.role)!;
                return (
                  <tr key={member.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{member.avatar}</div>
                        <span className="font-medium">{member.name}</span>
                        {member.id === 1 && <Badge className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20">You</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{member.email}</td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        {editingId === member.id ? (
                          <div className="absolute top-0 left-0 z-10 bg-card border border-border rounded-xl shadow-2xl min-w-40 overflow-hidden">
                            {ROLES.map(r => (
                              <button key={r.id} onClick={() => updateRole(member.id, r.id)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors text-left ${member.role === r.id ? 'bg-primary/10' : ''}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${r.color.replace('text-', 'bg-')}`} />
                                {r.label}
                                {member.role === r.id && <Check className="w-3 h-3 ml-auto text-primary" />}
                              </button>
                            ))}
                          </div>
                        ) : null}
                        <button onClick={() => setEditingId(editingId === member.id ? null : member.id)}
                          className="flex items-center gap-2">
                          <Badge className={roleDef.badge}>{roleDef.label}</Badge>
                          {member.id !== 1 && <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{member.lastActive}</td>
                    <td className="px-4 py-3">
                      {member.id !== 1 && (
                        <button className="text-xs text-red-500 hover:underline">Remove</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
