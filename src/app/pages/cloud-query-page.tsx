import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  Send,
  Loader2,
  Bot,
  User,
  Zap,
  Cloud,
  DollarSign,
  Activity,
  Clock,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QueryResult {
  [key: string]: string | number | boolean | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  results?: QueryResult[];
  query_type?: string;
  execution_time_ms?: number;
  demo_mode?: boolean;
  timestamp: Date;
}

// ─── Suggestion chips ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { label: '💸 Top expensive resources', query: 'What are my top 5 most expensive cloud resources?' },
  { label: '🔍 Anomalies this month', query: 'Show me all anomalies detected this month' },
  { label: '💡 Savings opportunities', query: 'Where can I save money on my cloud bill?' },
  { label: '📊 Cost by service', query: 'Break down my AWS costs by service for the last 30 days' },
  { label: '🖥️ Running EC2s', query: 'List all running EC2 instances' },
  { label: '🤖 Claude API usage', query: 'How much am I spending on Claude AI this month?' },
  { label: '🌍 Cost by region', query: 'What are my cloud costs by region?' },
  { label: '📋 Budget status', query: 'Check my budget status across all providers' },
];

// ─── Demo query executor ──────────────────────────────────────────────────────

function executeDemoQuery(question: string): { results: QueryResult[]; query_type: string; summary: string } {
  const q = question.toLowerCase();

  if (q.includes('expensive') || q.includes('top') || q.includes('cost')) {
    return {
      query_type: 'top_expensive_resources',
      summary: `Found your 6 most expensive resources. The top spender is **prod-ml-training** (EC2 p3.8xlarge) at $890/month. Consider rightsizing instances below 20% CPU utilization to save ~$445/month.`,
      results: [
        { name: 'prod-ml-training', type: 'EC2 p3.8xlarge', provider: 'AWS', region: 'us-east-1', monthly_cost: 890.20 },
        { name: 'prod-rds-primary', type: 'RDS db.r5.2xlarge', provider: 'AWS', region: 'us-east-1', monthly_cost: 640.50 },
        { name: 'staging-cluster', type: 'EKS NodeGroup', provider: 'AWS', region: 'us-east-1', monthly_cost: 480.30 },
        { name: 'analytics-bq', type: 'BigQuery Dataset', provider: 'GCP', region: 'us-central1', monthly_cost: 280.00 },
        { name: 'cdn-distribution', type: 'CloudFront', provider: 'AWS', region: 'global', monthly_cost: 198.40 },
        { name: 'data-pipeline-vm', type: 'n2-standard-8', provider: 'GCP', region: 'us-central1', monthly_cost: 175.20 },
      ],
    };
  }
  if (q.includes('anomal')) {
    return {
      query_type: 'anomalies',
      summary: `Detected **3 anomalies** — 1 critical (EC2 doubling) and 2 high severity (S3 egress, BigQuery overspend). Total additional cost impact: **$3,482.50** this month.`,
      results: [
        { id: 'demo-001', title: 'EC2 Cost Spike', severity: 'critical', provider: 'AWS', deviation: '106%', cost_impact: 2480.50 },
        { id: 'demo-002', title: 'S3 Egress Anomaly', severity: 'high', provider: 'AWS', deviation: '608%', cost_impact: 292.20 },
        { id: 'demo-003', title: 'BigQuery Over-scan', severity: 'high', provider: 'GCP', deviation: '641%', cost_impact: 770.00 },
      ],
    };
  }
  if (q.includes('sav') || q.includes('optim') || q.includes('rightsi')) {
    return {
      query_type: 'savings_opportunities',
      summary: `Found **5 optimization opportunities** with a combined potential saving of **$956.40/month** ($11,476/year). The biggest win is rightsizing your ML training instance.`,
      results: [
        { resource: 'prod-ml-training (EC2 p3.8xlarge)', issue: 'Low CPU utilization (12% avg)', action: 'Rightsize to p3.2xlarge', monthly_savings: 445.10 },
        { resource: 'staging-cluster (EKS)', issue: 'Runs 24/7 but needed only 8h/day', action: 'Schedule stop/start with Lambda', monthly_savings: 240.20 },
        { resource: 'prod-rds-primary', issue: 'Multi-AZ not needed for staging', action: 'Convert staging RDS to Single-AZ', monthly_savings: 180.00 },
        { resource: '3x NAT Gateways (dev)', issue: 'Idle but billing hourly', action: 'Delete and use VPC Endpoints', monthly_savings: 87.60 },
        { resource: 'dev-test-uploads (S3)', issue: 'No lifecycle policy', action: 'Add 30-day Glacier transition', monthly_savings: 3.50 },
      ],
    };
  }
  if (q.includes('service') || q.includes('breakdown')) {
    return {
      query_type: 'cost_by_service',
      summary: `Your total cloud spend across all services is **$5,701.60 this month**. EC2 is the dominant cost at 64.2%, followed by RDS at 15.6%. S3 has an unusual spike this month (+608%).`,
      results: [
        { service: 'Amazon EC2', provider: 'AWS', cost: 3660.00, pct: 64.2, trend: '+12%' },
        { service: 'Amazon RDS', provider: 'AWS', cost: 890.50, pct: 15.6, trend: '+3%' },
        { service: 'Amazon S3', provider: 'AWS', cost: 340.20, pct: 6.0, trend: '+608%' },
        { service: 'BigQuery', provider: 'GCP', cost: 280.00, pct: 4.9, trend: '+641%' },
        { service: 'Claude AI API', provider: 'Anthropic', cost: 72.60, pct: 1.3, trend: '+20%' },
      ],
    };
  }
  if (q.includes('ec2') || q.includes('instance')) {
    return {
      query_type: 'ec2_instances',
      summary: `Found **5 EC2 instances** — 4 running, 1 stopped. Your biggest instance is **prod-ml-training** (p3.8xlarge) at $890/month with only 87% CPU (justified for ML workloads). The bastion host is stopped and can be terminated.`,
      results: [
        { instance_id: 'i-0abc123def456', name: 'prod-api-server-1', type: 't3.large', state: 'running', region: 'us-east-1', monthly_cost: 72.40, cpu_avg: 28.5 },
        { instance_id: 'i-0def456ghi789', name: 'prod-ml-training', type: 'p3.8xlarge', state: 'running', region: 'us-east-1', monthly_cost: 890.20, cpu_avg: 87.3 },
        { instance_id: 'i-0ghi789jkl012', name: 'staging-web-server', type: 't2.medium', state: 'running', region: 'us-west-2', monthly_cost: 30.50, cpu_avg: 8.2 },
        { instance_id: 'i-0jkl012mno345', name: 'dev-bastion', type: 't3.micro', state: 'stopped', region: 'us-east-1', monthly_cost: 2.10, cpu_avg: 0 },
        { instance_id: 'i-0mno345pqr678', name: 'data-processor', type: 'c5.4xlarge', state: 'running', region: 'us-east-1', monthly_cost: 280.30, cpu_avg: 45.8 },
      ],
    };
  }
  if (q.includes('claude') || q.includes('ai') || q.includes('anthropic')) {
    return {
      query_type: 'claude_usage',
      summary: `You've spent **$72.60 on Claude AI** this month across 3,210 API calls and 9.3M tokens. Claude 3.5 Sonnet accounts for 63% of costs. You have $150 in credits remaining.`,
      results: [
        { date: '2025-01-01', model: 'claude-3-5-sonnet', api_calls: 420, tokens_used: 1270000, cost: 8.40 },
        { date: '2025-01-02', model: 'claude-3-5-haiku', api_calls: 1200, tokens_used: 660000, cost: 1.20 },
        { date: '2025-01-03', model: 'claude-3-opus', api_calls: 45, tokens_used: 168000, cost: 5.40 },
      ],
    };
  }
  if (q.includes('region')) {
    return {
      query_type: 'cost_by_region',
      summary: `Your cloud spend spans **6 regions**. us-east-1 is your primary region at $2,840/month (50%). Consider moving dev workloads to cheaper regions like us-west-2 to save ~15%.`,
      results: [
        { region: 'us-east-1', provider: 'AWS', cost: 2840.00, resources: 142 },
        { region: 'us-west-2', provider: 'AWS', cost: 1120.50, resources: 67 },
        { region: 'eu-west-1', provider: 'AWS', cost: 540.80, resources: 34 },
        { region: 'us-central1', provider: 'GCP', cost: 310.40, resources: 28 },
      ],
    };
  }
  if (q.includes('budget')) {
    return {
      query_type: 'budget_status',
      summary: `**Warning:** Your GCP project is over budget (98.2% used, forecast $640 vs $600 budget). AWS Production is at risk (96.4% used). Anthropic API is on track at 72.6%.`,
      results: [
        { account: 'AWS Production', budget: 5000.00, actual: 4820.50, pct_used: 96.4, forecast: 5240.00, status: 'at_risk' },
        { account: 'GCP Project (prod)', budget: 600.00, actual: 589.40, pct_used: 98.2, forecast: 640.00, status: 'over_budget' },
        { account: 'Anthropic API', budget: 100.00, actual: 72.60, pct_used: 72.6, forecast: 78.40, status: 'on_track' },
      ],
    };
  }

  return {
    query_type: 'unknown',
    summary: `I couldn't find a specific match for that query with demo data. Try asking about: costs, anomalies, EC2 instances, S3 buckets, savings opportunities, or budget status.`,
    results: [],
  };
}

// ─── Results Table ────────────────────────────────────────────────────────────

function ResultsTable({ results }: { results: QueryResult[] }) {
  if (!results.length) return null;
  const cols = Object.keys(results[0]);

  return (
    <div className="mt-3 rounded-lg border border-border overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {cols.map(col => (
              <th key={col} className="px-3 py-2 text-left font-medium text-muted-foreground capitalize">
                {col.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
              {cols.map(col => {
                const val = row[col];
                let display: string;
                if (typeof val === 'number') {
                  display = col.includes('cost') || col.includes('savings') || col.includes('budget') || col.includes('actual') || col.includes('forecast')
                    ? `$${val.toLocaleString()}`
                    : col.includes('pct') || col === 'cpu_avg'
                    ? `${val}%`
                    : col.includes('token')
                    ? `${(val / 1000).toFixed(0)}K`
                    : val.toLocaleString();
                } else {
                  display = val === null ? '—' : String(val);
                }

                // Colored badges for status/severity/state
                const isBadgeCol = col === 'status' || col === 'severity' || col === 'state';
                const badgeColors: Record<string, string> = {
                  critical: 'bg-red-500/10 text-red-500',
                  high: 'bg-orange-500/10 text-orange-500',
                  medium: 'bg-amber-500/10 text-amber-500',
                  low: 'bg-blue-500/10 text-blue-500',
                  running: 'bg-green-500/10 text-green-500',
                  stopped: 'bg-muted text-muted-foreground',
                  over_budget: 'bg-red-500/10 text-red-500',
                  at_risk: 'bg-amber-500/10 text-amber-500',
                  on_track: 'bg-green-500/10 text-green-500',
                };

                return (
                  <td key={col} className="px-3 py-2">
                    {isBadgeCol && badgeColors[display] ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeColors[display]}`}>
                        {display.replace(/_/g, ' ')}
                      </span>
                    ) : (
                      <span>{display}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Chat Message ─────────────────────────────────────────────────────────────

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}
      <div className={`max-w-[85%] ${isUser ? 'order-first' : ''}`}>
        <div className={`rounded-2xl px-4 py-3 ${isUser ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-card border border-border rounded-bl-sm'}`}>
          {/* Render markdown bold (**text**) */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
              part.startsWith('**') && part.endsWith('**')
                ? <strong key={i}>{part.slice(2, -2)}</strong>
                : part
            )}
          </p>
          {message.results && <ResultsTable results={message.results} />}
          {message.execution_time_ms !== undefined && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{message.execution_time_ms}ms · {message.query_type?.replace(/_/g, ' ')}</span>
              {message.demo_mode && <Badge variant="outline" className="text-xs py-0">demo</Badge>}
            </div>
          )}
        </div>
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm your AI cloud assistant. Ask me anything about your cloud infrastructure — costs, resources, anomalies, savings opportunities, or usage patterns. I'll query your accounts and give you a straight answer.\n\nConnect your credentials on the Integrations page to get live data, or try the suggestions below with demo data.",
  timestamp: new Date(),
};

export function CloudQueryPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendQuery = async (question: string) => {
    if (!question.trim() || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Simulate network delay
    await new Promise(r => setTimeout(r, 800 + Math.random() * 600));

    const start = Date.now();
    const { results, query_type, summary } = executeDemoQuery(question);
    const elapsed = Date.now() - start;

    const assistantMsg: Message = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: summary,
      results: results.length > 0 ? results : undefined,
      query_type,
      execution_time_ms: elapsed + 820,
      demo_mode: true,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, assistantMsg]);
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuery(input);
    }
  };

  const QUICK_STATS = [
    { label: 'Total Spend', value: '$5,701', icon: DollarSign, colorClass: 'text-primary' },
    { label: 'Resources', value: '289', icon: Cloud, colorClass: 'text-blue-500' },
    { label: 'Anomalies', value: '6', icon: Activity, colorClass: 'text-orange-500' },
    { label: 'Potential Savings', value: '$956/mo', icon: Zap, colorClass: 'text-green-500' },
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold">Cloud Query</h1>
            <p className="text-muted-foreground">Ask questions about your infrastructure in plain English</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {QUICK_STATS.map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-sm">
                  <Icon className={`w-3.5 h-3.5 ${stat.colorClass}`} />
                  <span className="text-muted-foreground">{stat.label}:</span>
                  <span className="font-medium">{stat.value}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Suggestion chips */}
        <div className="flex flex-wrap gap-2 pb-4">
          {SUGGESTIONS.map(s => (
            <button
              key={s.query}
              onClick={() => sendQuery(s.query)}
              disabled={loading}
              className="px-3 py-1 rounded-full text-xs border border-border hover:border-primary/60 hover:bg-primary/5 transition-colors disabled:opacity-50"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
        {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="p-6 pt-0">
        <Card className="border-border">
          <CardContent className="p-3">
            <div className="flex gap-3 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your cloud costs, resources, anomalies..."
                disabled={loading}
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground min-h-[36px] max-h-[120px] py-2"
              />
              <Button
                size="sm"
                onClick={() => sendQuery(input)}
                disabled={!input.trim() || loading}
                className="shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Press Enter to send · Shift+Enter for new line</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
