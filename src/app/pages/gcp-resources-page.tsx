import { useState } from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  Server,
  HardDrive,
  Database,
  Zap,
  BarChart2,
  RefreshCw,
  Loader2,
  Filter,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

// Demo GCP resource data
const DEMO_RESOURCES = [
  { id: 'gcp-vm-001', name: 'prod-web-server-1', type: 'GCP_ComputeInstance', region: 'us-central1-a', state: 'running', cost: 48.0, details: { machine_type: 'n1-standard-2' } },
  { id: 'gcp-vm-002', name: 'prod-api-server-1', type: 'GCP_ComputeInstance', region: 'us-central1-b', state: 'running', cost: 48.0, details: { machine_type: 'n1-standard-2' } },
  { id: 'gcp-vm-003', name: 'staging-server', type: 'GCP_ComputeInstance', region: 'us-east1-b', state: 'terminated', cost: 0.0, details: { machine_type: 'e2-medium' } },
  { id: 'gcp-bucket-001', name: 'prod-assets-bucket', type: 'GCP_StorageBucket', region: 'us', state: 'active', cost: 12.5, details: { storage_class: 'STANDARD' } },
  { id: 'gcp-bucket-002', name: 'backups-bucket', type: 'GCP_StorageBucket', region: 'us-central1', state: 'active', cost: 3.2, details: { storage_class: 'NEARLINE' } },
  { id: 'gcp-bucket-003', name: 'logs-archive', type: 'GCP_StorageBucket', region: 'us', state: 'active', cost: 1.8, details: { storage_class: 'COLDLINE' } },
  { id: 'gcp-sql-001', name: 'prod-postgres-db', type: 'GCP_CloudSQL', region: 'us-central1', state: 'runnable', cost: 95.0, details: { database_version: 'POSTGRES_14', tier: 'db-n1-standard-2' } },
  { id: 'gcp-sql-002', name: 'dev-mysql-db', type: 'GCP_CloudSQL', region: 'us-east1', state: 'runnable', cost: 30.0, details: { database_version: 'MYSQL_8_0', tier: 'db-f1-micro' } },
  { id: 'gcp-fn-001', name: 'process-uploads', type: 'GCP_CloudFunction', region: 'us-central1', state: 'active', cost: 0.5, details: { runtime: 'python310', memory_mb: 256 } },
  { id: 'gcp-fn-002', name: 'send-notifications', type: 'GCP_CloudFunction', region: 'us-central1', state: 'active', cost: 0.3, details: { runtime: 'nodejs18', memory_mb: 128 } },
  { id: 'gcp-fn-003', name: 'data-processor', type: 'GCP_CloudFunction', region: 'us-east1', state: 'active', cost: 1.2, details: { runtime: 'python310', memory_mb: 512 } },
  { id: 'gcp-bq-001', name: 'analytics_dataset', type: 'GCP_BigQueryDataset', region: 'us', state: 'active', cost: 8.0, details: { location: 'US' } },
  { id: 'gcp-bq-002', name: 'user_events', type: 'GCP_BigQueryDataset', region: 'us', state: 'active', cost: 4.5, details: { location: 'US' } },
];

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Server; color: string }> = {
  GCP_ComputeInstance: { label: 'Compute Engine', icon: Server, color: 'text-blue-500' },
  GCP_StorageBucket: { label: 'Cloud Storage', icon: HardDrive, color: 'text-amber-500' },
  GCP_CloudSQL: { label: 'Cloud SQL', icon: Database, color: 'text-green-500' },
  GCP_CloudFunction: { label: 'Cloud Functions', icon: Zap, color: 'text-purple-500' },
  GCP_BigQueryDataset: { label: 'BigQuery', icon: BarChart2, color: 'text-pink-500' },
};

const STATE_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  running: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
  active: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
  runnable: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
  terminated: { icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted/30' },
  stopped: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
};

const TYPE_FILTERS = ['All', 'GCP_ComputeInstance', 'GCP_StorageBucket', 'GCP_CloudSQL', 'GCP_CloudFunction', 'GCP_BigQueryDataset'];

export function GCPResourcesPage() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const handleScan = async () => {
    setScanning(true);
    await new Promise((r) => setTimeout(r, 1800));
    setLastScanned(new Date().toLocaleTimeString());
    setScanning(false);
  };

  const filtered = activeFilter === 'All' ? DEMO_RESOURCES : DEMO_RESOURCES.filter((r) => r.type === activeFilter);

  const summaryByType = Object.keys(TYPE_CONFIG).map((type) => ({
    type,
    count: DEMO_RESOURCES.filter((r) => r.type === type).length,
    totalCost: DEMO_RESOURCES.filter((r) => r.type === type).reduce((s, r) => s + r.cost, 0),
    ...TYPE_CONFIG[type],
  }));

  const totalCost = DEMO_RESOURCES.reduce((s, r) => s + r.cost, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">GCP Resources</h1>
          <p className="text-muted-foreground">
            Google Cloud Platform resource inventory
            {lastScanned && <span className="ml-2 text-xs">· Last scanned {lastScanned}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-1">
            <Cloud className="w-3 h-3" />
            Demo Mode
          </Badge>
          <Button onClick={handleScan} disabled={scanning}>
            {scanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            {scanning ? 'Scanning GCP...' : 'Scan GCP'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {summaryByType.map(({ type, label, icon: Icon, color, count, totalCost: tc }) => (
          <Card key={type} className="border-border cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveFilter(type)}>
            <CardContent className="pt-4 pb-4">
              <Icon className={`w-5 h-5 ${color} mb-2`} />
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              <div className="text-xs text-primary mt-1">${tc.toFixed(2)}/mo</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total cost bar */}
      <Card className="border-border">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Monthly Cost (GCP)</span>
            <span className="text-2xl font-bold text-primary">${totalCost.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {TYPE_FILTERS.map((f) => (
          <Button
            key={f}
            variant={activeFilter === f ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveFilter(f)}
          >
            {f === 'All' ? 'All' : (TYPE_CONFIG[f]?.label ?? f)}
          </Button>
        ))}
      </div>

      {/* Resource List */}
      <div className="space-y-3">
        {filtered.map((resource) => {
          const typeConf = TYPE_CONFIG[resource.type] || { icon: Server, color: 'text-primary', label: resource.type };
          const stateConf = STATE_CONFIG[resource.state] || { icon: CheckCircle2, color: 'text-muted-foreground', bg: 'bg-muted/30' };
          const Icon = typeConf.icon;
          const StateIcon = stateConf.icon;

          return (
            <Card key={resource.id} className="border-border hover:border-primary/30 transition-colors">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl bg-primary/10`}>
                    <Icon className={`w-5 h-5 ${typeConf.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{resource.name}</span>
                      <Badge variant="outline" className="text-xs">{typeConf.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="font-mono">{resource.id}</span>
                      <span>·</span>
                      <span>{resource.region}</span>
                      {resource.details && Object.entries(resource.details).slice(0, 1).map(([k, v]) => (
                        <span key={k}>· {String(v)}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${stateConf.bg}`}>
                      <StateIcon className={`w-3.5 h-3.5 ${stateConf.color}`} />
                      <span className={`text-xs capitalize ${stateConf.color}`}>{resource.state}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm">${resource.cost.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">/month</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
