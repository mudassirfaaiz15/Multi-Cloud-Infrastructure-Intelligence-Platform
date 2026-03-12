import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Terminal, Copy, Check, Wand2, BookOpen, AlertTriangle } from 'lucide-react';

interface Example { label: string; query: string; }
interface Generated { cmd: string; explanation: string; warning?: string; }

const EXAMPLES: Example[] = [
  { label: 'List S3 buckets',        query: 'show me all S3 buckets in us-east-1' },
  { label: 'Running EC2 instances',  query: 'list all running EC2 instances' },
  { label: 'High-cost services',     query: 'show top 5 services by cost this month' },
  { label: 'IAM users',              query: 'list all IAM users with console access' },
  { label: 'Unattached EBS volumes', query: 'find unattached EBS volumes' },
  { label: 'Security groups',        query: 'list security groups with 0.0.0.0/0 inbound' },
  { label: 'CloudTrail status',      query: 'check if cloudtrail is enabled in all regions' },
  { label: 'RDS instances',          query: 'show all RDS instances and their sizes' },
  { label: 'Lambda functions',       query: 'list lambda functions with errors in last 24 hours' },
];

function generateCLI(q: string): Generated | null {
  const ql = q.toLowerCase();
  if (ql.includes('s3') && ql.includes('bucket'))
    return {
      cmd: 'aws s3 ls --region us-east-1',
      explanation: 'Lists all S3 buckets in your account. Note: S3 buckets are global but this scopes output to us-east-1 endpoint.',
    };
  if (ql.includes('ec2') && (ql.includes('running') || ql.includes('instance')))
    return {
      cmd: 'aws ec2 describe-instances --filters "Name=instance-state-name,Values=running" --query "Reservations[*].Instances[*].[InstanceId,InstanceType,PublicIpAddress,Tags[?Key==\'Name\'].Value|[0]]" --output table',
      explanation: 'Queries all running EC2 instances and formats their ID, type, IP, and name tag in a readable table.',
    };
  if (ql.includes('cost') || ql.includes('spend'))
    return {
      cmd: 'aws ce get-cost-and-usage --time-period Start=$(date -d "30 days ago" +%Y-%m-%d),End=$(date +%Y-%m-%d) --granularity MONTHLY --metrics BlendedCost --group-by Type=DIMENSION,Key=SERVICE --output table',
      explanation: 'Retrieves cost breakdown by service for the last 30 days using Cost Explorer.',
      warning: 'Cost Explorer API calls cost $0.01 each. Use sparingly.',
    };
  if (ql.includes('iam') && ql.includes('user'))
    return {
      cmd: 'aws iam list-users --query "Users[*].[UserName,CreateDate,PasswordLastUsed]" --output table',
      explanation: 'Lists all IAM users with their creation date and last console login.',
    };
  if (ql.includes('ebs') || ql.includes('volume'))
    return {
      cmd: 'aws ec2 describe-volumes --filters "Name=status,Values=available" --query "Volumes[*].[VolumeId,Size,CreateTime,AvailabilityZone]" --output table',
      explanation: 'Finds EBS volumes in "available" state (not attached to any instance). These are costing money without providing value.',
    };
  if (ql.includes('security group') || ql.includes('0.0.0.0'))
    return {
      cmd: 'aws ec2 describe-security-groups --query "SecurityGroups[?IpPermissions[?IpRanges[?CidrIp==\'0.0.0.0/0\']]].[GroupId,GroupName,Description]" --output table',
      explanation: 'Finds all security groups with an inbound rule open to the whole internet (0.0.0.0/0). Potential security risk.',
      warning: 'Review each result carefully — some may be intentionally public (load balancers, CDN origins).',
    };
  if (ql.includes('cloudtrail'))
    return {
      cmd: 'aws cloudtrail describe-trails --query "trailList[*].[Name,S3BucketName,IsMultiRegionTrail,HomeRegion]" --output table',
      explanation: 'Lists all CloudTrail configurations. Check the IsMultiRegionTrail column to verify global coverage.',
    };
  if (ql.includes('rds'))
    return {
      cmd: 'aws rds describe-db-instances --query "DBInstances[*].[DBInstanceIdentifier,DBInstanceClass,Engine,DBInstanceStatus,MultiAZ]" --output table',
      explanation: 'Lists all RDS database instances with their class, engine type, status, and Multi-AZ configuration.',
    };
  if (ql.includes('lambda'))
    return {
      cmd: 'aws logs filter-log-events --log-group-name /aws/lambda --filter-pattern "ERROR" --start-time $(($(date +%s) - 86400))000 --query "events[*].[timestamp,message]" --output table',
      explanation: 'Scans Lambda CloudWatch logs for ERROR entries in the past 24 hours.',
    };
  return null;
}

export function CLIGeneratorPage() {
  const [query,   setQuery]   = useState('');
  const [result,  setResult]  = useState<Generated | null>(null);
  const [copied,  setCopied]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [noMatch, setNoMatch] = useState(false);

  function generate(q = query) {
    if (!q.trim()) return;
    setQuery(q);
    setLoading(true);
    setNoMatch(false);
    setTimeout(() => {
      const r = generateCLI(q);
      setResult(r);
      setNoMatch(!r);
      setLoading(false);
    }, 600);
  }

  function copy() {
    if (!result) return;
    navigator.clipboard.writeText(result.cmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Terminal className="w-7 h-7 text-primary" /> CLI Generator
        </h1>
        <p className="text-muted-foreground">Translate plain English into AWS CLI commands instantly</p>
      </div>

      {/* Input */}
      <Card className="border-border">
        <CardContent className="pt-5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Wand2 className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && generate()}
                placeholder="e.g. show me all running EC2 instances..."
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg bg-muted/50 border border-border outline-none focus:ring-2 focus:ring-primary/40"
                aria-label="Natural language query"
              />
            </div>
            <Button onClick={() => generate()} disabled={!query.trim() || loading} className="gap-1.5">
              {loading ? <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" /> : <Terminal className="w-4 h-4" />}
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className="border-border animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" /> Generated Command
              </CardTitle>
              <Button size="sm" variant="outline" onClick={copy} className="gap-1.5 h-7 text-xs">
                {copied ? <><Check className="w-3 h-3 text-green-500" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="bg-slate-950 text-green-400 rounded-xl p-4 text-xs overflow-x-auto font-mono leading-relaxed border border-slate-800">
              <code>{result.cmd}</code>
            </pre>
            <div className="p-3 rounded-lg bg-muted/40 border border-border">
              <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Explanation: </span>{result.explanation}</p>
            </div>
            {result.warning && (
              <div className="flex gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-600 dark:text-amber-400">{result.warning}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {noMatch && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Terminal className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>Couldn't match that query. Try one of the examples below.</p>
        </div>
      )}

      {/* Examples */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Example Queries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EXAMPLES.map(e => (
              <button key={e.label} onClick={() => generate(e.query)}
                className="text-left px-3 py-2.5 rounded-lg border border-border bg-muted/30 hover:bg-muted transition-colors group">
                <p className="text-xs font-medium group-hover:text-primary transition-colors">{e.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{e.query}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
