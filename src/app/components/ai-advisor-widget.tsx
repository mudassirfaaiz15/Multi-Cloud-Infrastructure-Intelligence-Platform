import { useState, useRef, useEffect } from 'react';
import { X, Loader2, Sparkles, ChevronDown } from 'lucide-react';
// @ts-expect-error exists in runtime
import { Bot, Send } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/components/ui/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_PROMPTS = [
  'Why did my costs spike this week?',
  'What can I optimize right now?',
  'Am I over budget?',
  'Show me idle resources',
];

const RESPONSES: Record<string, string> = {
  default: "I can see you're running **289 resources** across AWS and GCP. Your current monthly spend is **$5,701** — up 18% from last month. The biggest driver is EC2 costs in us-east-1 (doubled overnight). Want me to dig deeper into any area?",
  spike: "Your cost spike is primarily driven by **EC2 in us-east-1** — an Auto Scaling group launched 8 additional p3.8xlarge instances during a traffic surge on March 9th. These instances are still running. I recommend setting a **max capacity of 4** on that ASG and adding a scheduled scale-down at midnight.",
  optimize: "Top 3 quick wins right now:\n\n1. **Rightsize prod-ml-training** (p3.8xlarge → p3.2xlarge) — save $445/month\n2. **Schedule staging-cluster** to stop nights/weekends — save $240/month\n3. **Delete 3 idle NAT Gateways** in dev — save $87/month\n\nTotal potential: **$772/month** with these 3 changes alone.",
  budget: "⚠️ **Budget Alert:** AWS Production is at 96.4% ($4,820 of $5,000). At current burn rate, you'll exceed the limit in **~2 days**. GCP is already over budget at 98.2%. I recommend reviewing the EC2 Auto Scaling group and BigQuery query costs immediately.",
  idle: "Found **6 idle resources**:\n- 3× NAT Gateways (dev/staging) — $87/month, 0 active connections\n- 1× EC2 dev-bastion (t3.micro) — $2/month, stopped for 30+ days\n- 2× unattached EBS volumes — $18/month, 0 reads/writes\n\nTerminating these saves **$107/month**.",
};

function getResponse(q: string): string {
  const lower = q.toLowerCase();
  if (lower.includes('spike') || lower.includes('cost') || lower.includes('why')) return RESPONSES.spike;
  if (lower.includes('optim') || lower.includes('save') || lower.includes('rightsi')) return RESPONSES.optimize;
  if (lower.includes('budget') || lower.includes('over')) return RESPONSES.budget;
  if (lower.includes('idle') || lower.includes('unused') || lower.includes('wast')) return RESPONSES.idle;
  return RESPONSES.default;
}

export function AIAdvisorWidget() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', content: "👋 Hi! I'm your AI Cloud Advisor. I can help you understand your costs, find savings, and explain anomalies. What would you like to know?" }
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 900 + Math.random() * 500));
    const aiMsg: Message = { id: `a-${Date.now()}`, role: 'assistant', content: getResponse(text) };
    setMessages(prev => [...prev, aiMsg]);
    setLoading(false);
  };

  const renderContent = (text: string) =>
    text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : part
    );

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat Window */}
      {open && (
        <div className={cn(
          'w-80 bg-card border border-border rounded-2xl shadow-2xl flex flex-col transition-all duration-300',
          minimized ? 'h-12 overflow-hidden' : 'h-[460px]'
        )}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-violet-500/10 rounded-t-2xl cursor-pointer"
            onClick={() => setMinimized(!minimized)}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold">AI Cloud Advisor</p>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <p className="text-[10px] text-muted-foreground">Powered by Claude</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={e => { e.stopPropagation(); setMinimized(!minimized); }} 
                className="text-muted-foreground hover:text-foreground"
                title={minimized ? "Expand" : "Minimize"}
                aria-label={minimized ? "Expand" : "Minimize"}
              >
                <ChevronDown className={cn('w-4 h-4 transition-transform', minimized && 'rotate-180')} />
              </button>
              <button 
                onClick={e => { e.stopPropagation(); setOpen(false); }} 
                className="text-muted-foreground hover:text-foreground"
                title="Close AI Advisor"
                aria-label="Close AI Advisor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' && 'justify-end')}>
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                    <div className={cn(
                      'rounded-xl px-3 py-2 text-xs leading-relaxed max-w-[85%]',
                      msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'
                    )}>
                      <p className="whitespace-pre-wrap">{renderContent(msg.content)}</p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="bg-muted rounded-xl rounded-bl-sm px-3 py-2">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick prompts */}
              {messages.length === 1 && (
                <div className="px-3 pb-2 flex flex-wrap gap-1">
                  {QUICK_PROMPTS.map(p => (
                    <button key={p} onClick={() => send(p)}
                      className="text-[10px] px-2 py-1 rounded-full border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors">
                      {p}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t border-border">
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && send(input)}
                    placeholder="Ask anything..."
                    className="flex-1 bg-muted rounded-xl px-3 py-2 text-xs outline-none placeholder:text-muted-foreground"
                  />
                  <Button size="icon" className="w-8 h-8 shrink-0" onClick={() => send(input)} disabled={!input.trim() || loading}>
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => { setOpen(!open); setMinimized(false); }}
        className={cn(
          'w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 group',
          open ? 'bg-card border border-border' : 'bg-gradient-to-br from-primary to-violet-600'
        )}
        id="ai-advisor-btn"
      >
        {open ? (
          <X className="w-5 h-5 text-muted-foreground" />
        ) : (
          <>
            <Sparkles className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
            <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
          </>
        )}
      </button>
    </div>
  );
}
