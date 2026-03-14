import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Terminal, Copy, Check, Wand2, BookOpen, AlertTriangle, ShieldCheck, FileCode2, Lock } from 'lucide-react';

interface Example { label: string; query: string; }
interface Generated { 
  cmd?: string; 
  iam?: string; 
  tf?: string; 
  explanation: string; 
  warning?: string; 
}

const EXAMPLES: Example[] = [
  { label: 'S3 Read Policy',         query: 'create an IAM policy that allows reading from an s3 bucket named my-app-logs' },
  { label: 'Serverless Dynamo Role', query: 'create an IAM role for a lambda function to read dynamodb tables' },
  { label: 'List EC2 Instances',     query: 'write a CLI command to list all running EC2 instances' },
  { label: 'Cross-account Policy',   query: 'generate an IAM policy for cross account assume role to arn:aws:iam::1234567890:role/admin' },
  { label: 'High-cost services',     query: 'show top 5 services by cost this month using AWS CLI' },
  { label: 'Find public buckets',    query: 'cli command to find public S3 buckets' },
];

function generateCloudAsset(q: string): Generated | null {
  const ql = q.toLowerCase();
  
  // IAM Policy Match
  if (ql.includes('iam ') || ql.includes('policy') || ql.includes('role')) {
    if (ql.includes('s3') && ql.includes('read')) {
      return {
        iam: JSON.stringify({
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Allow",
              "Action": [
                "s3:GetObject",
                "s3:ListBucket"
              ],
              "Resource": [
                "arn:aws:s3:::my-app-logs",
                "arn:aws:s3:::my-app-logs/*"
              ]
            }
          ]
        }, null, 2),
        tf: `data "aws_iam_policy_document" "s3_read" {\n  statement {\n    actions = [\n      "s3:GetObject",\n      "s3:ListBucket"\n    ]\n    resources = [\n      "arn:aws:s3:::my-app-logs",\n      "arn:aws:s3:::my-app-logs/*"\n    ]\n  }\n}`,
        cmd: `aws iam create-policy --policy-name S3ReadOnlyAppLogs --policy-document file://policy.json`,
        explanation: 'Generates a least-privilege IAM policy strictly allowing read access to the specific S3 bucket and its objects.',
      };
    }
    if (ql.includes('dynamodb') && ql.includes('lambda') || ql.includes('dynamodb')) {
      return {
        iam: JSON.stringify({
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Allow",
              "Action": [
                "dynamodb:GetItem",
                "dynamodb:Scan",
                "dynamodb:Query",
                "dynamodb:BatchGetItem"
              ],
              "Resource": "arn:aws:dynamodb:*:*:table/*"
            }
          ]
        }, null, 2),
        tf: `resource "aws_iam_policy" "dynamo_read" {\n  name = "LambdaDynamoDBRead"\n  policy = jsonencode({\n    Version = "2012-10-17"\n    Statement = [...]\n  })\n}`,
        explanation: 'Provides read-only access to DynamoDB tables. Warning: The resource ARN uses wildcards. It is recommended to scope this down to specific table ARNs in production.',
        warning: 'Moderate privilege policy. Scope Resource ARN down in production.'
      };
    }
    if (ql.includes('cross account') || ql.includes('assume role')) {
        return {
          iam: JSON.stringify({
              "Version": "2012-10-17",
              "Statement": [
                  {
                      "Effect": "Allow",
                      "Action": "sts:AssumeRole",
                      "Resource": "arn:aws:iam::123456789012:role/admin"
                  }
              ]
          }, null, 2),
          cmd: `aws sts assume-role --role-arn arn:aws:iam::123456789012:role/admin --role-session-name AdminSession`,
          explanation: 'Allows assuming a specific IAM role in an external account using STS.',
        }
    }
    return {
      iam: JSON.stringify({
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Action": "s3:ListAllMyBuckets",
            "Resource": "*"
          }
        ]
      }, null, 2),
      explanation: 'Generated a generic placeholder policy. Please provide more specific requirements for precise generation.',
    };
  }

  // CLI Matches
  if (ql.includes('s3') && ql.includes('public'))
    return {
      cmd: 'aws s3api list-buckets --query "Buckets[*].Name" | xargs -I {} aws s3api get-bucket-policy-status --bucket {} --query "PolicyStatus.IsPublic" --output text',
      explanation: 'Iterates through all S3 buckets and checks their policy status to identify publicly accessible buckets.',
    };
  if (ql.includes('s3') && ql.includes('bucket'))
    return {
      cmd: 'aws s3 ls --region us-east-1',
      explanation: 'Lists all S3 buckets in your account. Note: S3 buckets are global but this scopes output to us-east-1 endpoint.',
    };
  if (ql.includes('ec2') && (ql.includes('running') || ql.includes('instance')))
    return {
      cmd: 'aws ec2 describe-instances --filters "Name=instance-state-name,Values=running" --query "Reservations[*].Instances[*].[InstanceId,InstanceType,PublicIpAddress]" --output table',
      explanation: 'Queries all running EC2 instances format to a readable table.',
    };
  if (ql.includes('cost') || ql.includes('spend'))
    return {
      cmd: 'aws ce get-cost-and-usage --time-period Start=$(date -d "30 days ago" +%Y-%m-%d),End=$(date +%Y-%m-%d) --granularity MONTHLY --metrics BlendedCost --group-by Type=DIMENSION,Key=SERVICE --output table',
      explanation: 'Retrieves cost breakdown by service for the last 30 days using Cost Explorer.',
      warning: 'Cost Explorer API calls cost $0.01 each.',
    };
  
  return null;
}

export function CLIGeneratorPage() {
  const [query,   setQuery]   = useState('');
  const [result,  setResult]  = useState<Generated | null>(null);
  const [copied,  setCopied]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [noMatch, setNoMatch] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('iam');

  function generate(q = query) {
    if (!q.trim()) return;
    setQuery(q);
    setLoading(true);
    setNoMatch(false);
    setTimeout(() => {
      const r = generateCloudAsset(q);
      setResult(r);
      setNoMatch(!r);
      
      // Auto-select tab
      if (r) {
        if (r.iam) setActiveTab('iam');
        else if (r.cmd) setActiveTab('cmd');
      }

      setLoading(false);
    }, 800);
  }

  function copy(text: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const renderCodeBlock = (content?: string, isJson?: boolean) => {
    if (!content) return null;
    return (
      <div className="relative group mt-2">
        <Button size="icon" variant="secondary" className="absolute top-3 right-3 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 hover:bg-slate-700 text-white border border-slate-700" onClick={() => copy(content)}>
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </Button>
        <pre className={`bg-slate-950 text-slate-300 rounded-xl p-5 text-[13px] overflow-x-auto font-mono leading-loose border border-slate-800 ${isJson ? 'text-blue-400' : 'text-green-400'}`}>
          <code>{content}</code>
        </pre>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20 shadow-inner border border-primary/20">
                <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">AI Cloud Generator</h1>
                <p className="text-muted-foreground mt-1">Design least-privilege IAM Policies and AWS CLI commands using natural English.</p>
            </div>
        </div>
      </div>

      {/* Input Section */}
      <Card className="border-border shadow-sm overflow-hidden bg-card/60 backdrop-blur">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-violet-500 to-blue-500" />
        <CardContent className="pt-6">
          <div className="flex gap-3 relative">
            <div className="relative flex-1 group">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center bg-background rounded-xl border border-border focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 transition-all shadow-sm">
                  <Wand2 className="ml-4 w-5 h-5 text-primary/70" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && generate()}
                    placeholder="e.g. Generate an IAM policy to allow reading from S3 bucket 'finance-reports'..."
                    className="w-full bg-transparent px-3 py-4 text-sm outline-none placeholder:text-muted-foreground"
                    aria-label="Natural language cloud prompt"
                  />
              </div>
            </div>
            <Button size="lg" onClick={() => generate()} disabled={!query.trim() || loading} className="gap-2 h-auto px-6 rounded-xl shadow-md">
              {loading ? <span className="w-5 h-5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" /> : <Terminal className="w-5 h-5" />}
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Result Section */}
      {result && (
        <Card className="border-border shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border pb-4">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                  <FileCode2 className="w-5 h-5 text-primary" />
                  <span>Generated Architecture</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6 pt-4">
                <TabsList className="grid w-full grid-cols-3 max-w-md bg-muted/50 p-1">
                  <TabsTrigger value="iam" disabled={!result.iam} className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                      <Lock className="w-3.5 h-3.5 mr-2" /> JSON Policy
                  </TabsTrigger>
                  <TabsTrigger value="cmd" disabled={!result.cmd} className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                      <Terminal className="w-3.5 h-3.5 mr-2" /> AWS CLI
                  </TabsTrigger>
                  <TabsTrigger value="tf" disabled={!result.tf} className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                      <ShieldCheck className="w-3.5 h-3.5 mr-2" /> Terraform
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="px-6 py-4">
                <TabsContent value="iam" className="mt-0">
                  {renderCodeBlock(result.iam, true)}
                </TabsContent>
                <TabsContent value="cmd" className="mt-0">
                  {renderCodeBlock(result.cmd, false)}
                </TabsContent>
                <TabsContent value="tf" className="mt-0">
                  {renderCodeBlock(result.tf, false)}
                </TabsContent>

                <div className="mt-6 space-y-3">
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 backdrop-blur-sm">
                    <p className="text-sm text-foreground/90 leading-relaxed">
                        <span className="font-semibold text-primary block mb-1">AI Explanation</span>
                        {result.explanation}
                    </p>
                    </div>
                    {result.warning && (
                    <div className="flex gap-3 p-4 rounded-xl bg-warning/10 border border-warning/20">
                        <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                        <p className="text-sm text-warning-foreground dark:text-amber-400 font-medium">{result.warning}</p>
                    </div>
                    )}
                </div>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {noMatch && (
        <div className="text-center py-16 text-muted-foreground animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border shadow-inner">
            <Terminal className="w-8 h-8 opacity-50" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">No exact match found</h3>
          <p className="text-sm max-w-sm mx-auto">Our local mock engine doesn't recognize that phrasing. Try one of the premium examples below.</p>
        </div>
      )}

      {/* Examples Section */}
      <div className="space-y-3 pt-6">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground ml-1">
          <BookOpen className="w-4 h-4" /> Try these prompts
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {EXAMPLES.map(e => (
            <button key={e.label} onClick={() => generate(e.query)}
              className="text-left p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/40 hover:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all group flex flex-col gap-1.5 shadow-sm hover:shadow-md">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-semibold text-primary w-fit">
                  {e.label.includes('Policy') || e.label.includes('Role') ? 'IAM' : 'CLI'}
              </span>
              <div>
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{e.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{e.query}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
