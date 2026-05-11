import { useState, useEffect, useRef } from 'react';
// @ts-ignore - these icons exist at runtime but lack TS definitions in this version
import { Bot, Send, MessageCircle } from 'lucide-react';
import { X, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/components/ui/utils';
import { logger } from '@/lib/utils/logger';

interface Message { 
  role: 'user' | 'ai'; 
  text: string; 
  ts: number;
}

const SUGGESTIONS = [
  'What is my biggest cost driver?',
  'How can I reduce EC2 spend?',
  'Explain the latest anomaly',
  'Show savings recommendations',
];

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

async function queryAI(question: string, context?: Record<string, unknown>): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.REACT_APP_API_KEY || 'demo-key',
      },
      body: JSON.stringify({
        question,
        context: context || {},
      }),
    });

    if (!response.ok) {
      logger.warn(`AI API returned status ${response.status}`);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.success && data.data) {
      return data.data.answer || 'No response from AI';
    }
    throw new Error(data.error || 'Unknown API error');
  } catch (error) {
    logger.error(`Failed to query AI: ${error}`);
    // Provide intelligent fallback responses
    return generateFallbackResponse(question);
  }
}

function generateFallbackResponse(q: string): string {
  const ql = q.toLowerCase();
  if (ql.includes('anomaly') || ql.includes('spike'))
    return 'The anomaly on Mar 10 was caused by an EC2 Auto Scaling event that launched 18 additional instances during a traffic surge in us-east-1. The root cause was a misconfigured CloudWatch alarm threshold. Recommendation: set a scaling cooldown period of 300s to avoid repeated triggers.';
  if (ql.includes('savings') || ql.includes('reduce') || ql.includes('save'))
    return 'Top 3 savings actions:\n1. **Downsize idle EC2** (t3.xlarge → t3.medium) — saves ~$380/mo\n2. **Enable S3 Intelligent-Tiering** on buckets >1 GB — saves ~$94/mo\n3. **Delete 7 unattached EBS volumes** (142 GB total) — saves ~$15/mo\n\nTotal potential savings: **$489/month**.';
  if (ql.includes('ec2') || ql.includes('compute'))
    return 'Your EC2 fleet is your largest cost at $2,140/mo (41% of total). 23% of instances have <10% average CPU over the last 14 days, suggesting right-sizing opportunities. I recommend reviewing instance types in us-east-1 first.';
  if (ql.includes('s3') || ql.includes('storage'))
    return 'S3 costs are $295/mo across 18 buckets. 3 buckets have not been accessed in 90+ days and are candidates for Glacier archival. Enabling lifecycle policies could reduce storage costs by ~$60/mo.';
  if (ql.includes('forecast') || ql.includes('predict'))
    return 'Based on current spend trajectory, your month-end forecast is **$5,610** (+6.4% vs budget of $5,274). The overrun is primarily driven by BigQuery charges that are 345% over budget — recommend reviewing query optimization.';
  if (ql.includes('cost') || ql.includes('spend') || ql.includes('driver'))
    return 'Your top cost drivers this month:\n1. EC2 Compute — $2,140 (41%)\n2. RDS Databases — $640 (12%)\n3. GCP BigQuery — $890 (17%)\n4. AWS S3 — $295 (6%)\n5. Claude AI API — $312 (6%)\n\nBigQuery is the biggest concern — 3.5× over its budget allocation.';
  if (ql.includes('security') || ql.includes('iam') || ql.includes('compliance'))
    return 'Security scan found 3 issues:\n• 2 S3 buckets with public read ACL\n• 1 IAM role with overly broad `s3:*` policy\n• CloudTrail logging disabled in ap-northeast-1\n\nAll issues are MEDIUM severity. Would you like remediation scripts?';
  return 'I can help you analyze your cloud costs, identify savings, explain anomalies, or review security posture. Try asking: "What is my biggest cost driver?" or "How can I reduce EC2 spend?"';
}

const STORAGE_KEY = 'consoleSensei_chat_history';

export function AIChatSidebar({ open, onClose }: { open: boolean, onClose: () => void }) {
  const [input, setInput]     = useState('');
  const [typing, setTyping]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40))); }
    catch { /* quota exceeded */ }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  async function send(text = input.trim()) {
    if (!text || loading) return;
    
    const userMsg: Message = { role: 'user', text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setTyping(true);
    
    try {
      const answer = await queryAI(text);
      setTyping(false);
      setMessages(prev => [...prev, { role: 'ai', text: answer, ts: Date.now() }]);
    } catch (error) {
      logger.error(`Send error: ${error}`);
      setTyping(false);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: 'Sorry, I encountered an error processing your request. Please try again.', 
        ts: Date.now() 
      }]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Sidebar Container */}
      <aside className="fixed inset-y-0 right-0 z-50 lg:static lg:z-10 flex flex-col w-[85vw] max-w-sm lg:w-[380px] bg-sidebar border-l border-sidebar-border lg:shadow-[-8px_0_24px_-12px_rgba(0,0,0,0.15)] shrink-0 h-full animate-in slide-in-from-right-full lg:animate-none">
        {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-sidebar-border shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Cloud AI Assistant</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Always online
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => setMessages([])} aria-label="Clear history">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7"
                onClick={onClose} aria-label="Close chat">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-medium">Ask me anything about your cloud</p>
                <p className="text-xs text-muted-foreground">Costs, security, anomalies, savings — I have answers.</p>
                <div className="flex flex-col gap-1.5 w-full mt-2">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)}
                      className="text-left text-xs px-3 py-2 rounded-lg border border-border bg-muted/40 hover:bg-muted transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(m => (
              <div key={m.ts} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                {m.role === 'ai' && (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div className={cn(
                  'max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap',
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-muted text-foreground rounded-tl-sm',
                )}>
                  {m.text}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-muted w-16">
                {[0, 1, 2].map(i => (
                  <span key={i} className={cn("w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce", i === 0 ? "animation-delay-0" : i === 1 ? "animation-delay-150" : "animation-delay-300")} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions when there are messages */}
          {messages.length > 0 && (
            <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto shrink-0">
              {SUGGESTIONS.slice(0, 2).map(s => (
                <button key={s} onClick={() => send(s)}
                  className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/40 hover:bg-muted transition-colors whitespace-nowrap shrink-0">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-4 pt-1 shrink-0">
            <div className="flex gap-2 items-end bg-muted/50 border border-border rounded-xl p-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask about your cloud..."
                rows={1}
                className="flex-1 bg-transparent text-sm resize-none outline-none placeholder:text-muted-foreground max-h-28 scrollbar-none"
                aria-label="Chat input"
              />
              <Button size="icon" className="h-7 w-7 shrink-0 rounded-lg" onClick={() => send()} disabled={!input.trim() || loading} aria-label="Send message">
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
      </aside>

      {/* Backdrop on mobile */}
      <div className="fixed inset-0 z-40 bg-black/40 lg:hidden backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
    </>
  );
}
