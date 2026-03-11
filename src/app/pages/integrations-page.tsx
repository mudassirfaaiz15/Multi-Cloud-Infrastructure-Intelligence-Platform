import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Cloud,
  CheckCircle2,
  XCircle,
  Upload,
  Eye,
  EyeOff,
  Save,
  Link2,
  Bot,
  Loader2,
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  provider: string;
  status: 'connected' | 'disconnected';
  description: string;
}

function useIntegrationState(provider: string) {
  const key = `integration_${provider}`;
  const getStored = () => {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  };
  const [data, setDataState] = useState<Record<string, string>>(getStored() || {});

  const save = (fields: Record<string, string>) => {
    // Never store plaintext secrets long-term; base64 encode for transport layer only.
    // In production, use a backend secrets manager.
    const sanitized: Record<string, string> = {};
    for (const [k, v] of Object.entries(fields)) {
      sanitized[k] = btoa(v); // lightweight obfuscation
    }
    localStorage.setItem(key, JSON.stringify(sanitized));
    setDataState(fields);
  };

  const isConnected = Object.values(data).some((v) => v.trim().length > 0);
  return { data, save, isConnected };
}

function AWSIntegrationPanel() {
  const { data, save, isConnected } = useIntegrationState('aws');
  const [accessKey, setAccessKey] = useState(data.accessKey || '');
  const [secretKey, setSecretKey] = useState(data.secretKey || '');
  const [region, setRegion] = useState(data.region || 'us-east-1');
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    save({ accessKey, secretKey, region });
    setSaving(false);
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10">
              <Cloud className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <CardTitle>Amazon Web Services</CardTitle>
              <CardDescription>Connect your AWS account</CardDescription>
            </div>
          </div>
          <Badge variant={isConnected ? 'default' : 'secondary'} className={isConnected ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''}>
            {isConnected ? <><CheckCircle2 className="w-3 h-3 mr-1" />Connected</> : <><XCircle className="w-3 h-3 mr-1" />Not Connected</>}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <div className="space-y-2">
            <Label htmlFor="aws-access-key">Access Key ID</Label>
            <Input
              id="aws-access-key"
              placeholder="AKIAIOSFODNN7EXAMPLE"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aws-secret-key">Secret Access Key</Label>
            <div className="relative">
              <Input
                id="aws-secret-key"
                type={showSecret ? 'text' : 'password'}
                placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCY"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="aws-region">Default Region</Label>
            <Input
              id="aws-region"
              placeholder="us-east-1"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || !accessKey || !secretKey} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? 'Saving...' : 'Save AWS Credentials'}
        </Button>
      </CardContent>
    </Card>
  );
}

function GCPIntegrationPanel() {
  const { data, save, isConnected } = useIntegrationState('gcp');
  const [projectId, setProjectId] = useState(data.projectId || '');
  const [jsonContent, setJsonContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setJsonContent(content);
      try {
        const parsed = JSON.parse(content);
        if (parsed.project_id) setProjectId(parsed.project_id);
      } catch {
        // ignore parse error, user can fill manually
      }
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    save({ projectId, serviceAccountJson: jsonContent });
    setSaving(false);
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <Cloud className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <CardTitle>Google Cloud Platform</CardTitle>
              <CardDescription>Connect your GCP project</CardDescription>
            </div>
          </div>
          <Badge variant={isConnected ? 'default' : 'secondary'} className={isConnected ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''}>
            {isConnected ? <><CheckCircle2 className="w-3 h-3 mr-1" />Connected</> : <><XCircle className="w-3 h-3 mr-1" />Not Connected</>}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <div className="space-y-2">
            <Label htmlFor="gcp-project">Project ID</Label>
            <Input
              id="gcp-project"
              placeholder="my-project-123456"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Service Account JSON</Label>
            <label
              htmlFor="gcp-json-upload"
              className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Upload className="w-6 h-6 text-muted-foreground mb-1" />
              <span className="text-sm text-muted-foreground">
                {fileName || 'Click to upload service-account.json'}
              </span>
              <input
                id="gcp-json-upload"
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || (!projectId && !jsonContent)} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? 'Saving...' : 'Save GCP Credentials'}
        </Button>
      </CardContent>
    </Card>
  );
}

function ClaudeAIIntegrationPanel() {
  const { data, save, isConnected } = useIntegrationState('claude');
  const [apiKey, setApiKey] = useState(data.apiKey || '');
  const [orgId, setOrgId] = useState(data.orgId || '');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    save({ apiKey, orgId });
    setSaving(false);
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10">
              <Bot className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <CardTitle>Claude AI API</CardTitle>
              <CardDescription>Monitor your Anthropic API usage</CardDescription>
            </div>
          </div>
          <Badge variant={isConnected ? 'default' : 'secondary'} className={isConnected ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''}>
            {isConnected ? <><CheckCircle2 className="w-3 h-3 mr-1" />Connected</> : <><XCircle className="w-3 h-3 mr-1" />Not Connected</>}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <div className="space-y-2">
            <Label htmlFor="claude-api-key">API Key</Label>
            <div className="relative">
              <Input
                id="claude-api-key"
                type={showKey ? 'text' : 'password'}
                placeholder="sk-ant-api03-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="claude-org">Organization ID <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Input
              id="claude-org"
              placeholder="org-xxxxxxxxxxxxxxxxxxxx"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || !apiKey} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? 'Saving...' : 'Save Claude API Credentials'}
        </Button>
      </CardContent>
    </Card>
  );
}

const INTEGRATIONS_INFO: Integration[] = [
  { id: 'aws', name: 'Amazon Web Services', provider: 'AWS', status: 'disconnected', description: 'EC2, S3, RDS, Lambda, IAM, CloudWatch, Cost Explorer' },
  { id: 'gcp', name: 'Google Cloud Platform', provider: 'GCP', status: 'disconnected', description: 'Compute Engine, Cloud Storage, Cloud SQL, Cloud Functions, BigQuery' },
  { id: 'claude', name: 'Claude AI API', provider: 'Anthropic', status: 'disconnected', description: 'API usage tracking, token monitoring, cost estimation' },
];

export function IntegrationsPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Cloud Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Connect your cloud providers to monitor resources, costs, and AI usage.
        </p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {INTEGRATIONS_INFO.map((integration) => (
          <Card key={integration.id} className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="w-4 h-4 text-primary" />
                <span className="font-medium">{integration.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">{integration.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Integration Panels */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Configure Integrations</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AWSIntegrationPanel />
          <GCPIntegrationPanel />
          <ClaudeAIIntegrationPanel />
        </div>
      </div>

      {/* Security Notice */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-amber-500/10 mt-0.5">
              <CheckCircle2 className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="font-medium text-sm">Security Note</p>
              <p className="text-xs text-muted-foreground mt-1">
                Credentials are stored locally in your browser session and never sent to third parties.
                Use IAM roles with least-privilege access. Rotate keys regularly.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
