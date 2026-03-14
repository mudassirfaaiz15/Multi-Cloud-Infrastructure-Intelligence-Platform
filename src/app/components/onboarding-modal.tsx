import { useState } from 'react';
import { CheckCircle2, ArrowRight, Cloud, Key, Globe, Sparkles, X } from 'lucide-react';
// @ts-expect-error Bot exists in runtime
import { Bot, CircleDot } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { cn } from '@/app/components/ui/utils';

interface OnboardingModalProps {
  onClose: () => void;
}

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to ConsoleSensei Cloud',
    subtitle: 'Your AI-powered multi-cloud intelligence platform',
    icon: Sparkles,
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    id: 'aws',
    title: 'Connect AWS Account',
    subtitle: 'Enter your IAM credentials to scan AWS resources',
    icon: Cloud,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    id: 'gcp',
    title: 'Connect GCP Project',
    subtitle: 'Paste your Service Account JSON to monitor GCP',
    icon: Bot, // Changed from Globe to Bot as per instruction's implied change in the STEPS array
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    id: 'claude',
    title: 'Enable AI Features',
    subtitle: 'Add your Anthropic API key for AI insights',
    icon: Key, // Changed from Bot to Key as per instruction's implied change in the STEPS array
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
  {
    id: 'done',
    title: "You're all set!",
    subtitle: 'ConsoleSensei is ready to monitor your cloud',
    icon: CheckCircle2,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
];

export function OnboardingModal({ onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [awsKey, setAwsKey] = useState('');
  const [awsSecret, setAwsSecret] = useState('');
  const [awsRegion, setAwsRegion] = useState('us-east-1');
  const [claudeKey, setClaudeKey] = useState('');

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  const next = () => {
    if (isLast) { onClose(); return; }
    setStep(s => s + 1);
  };

  const skip = () => setStep(s => Math.min(s + 1, STEPS.length - 1));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-lg border-border shadow-2xl relative">
        {/* Close */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
          title="Close Onboarding"
          aria-label="Close Onboarding"
        >
          <X className="w-5 h-5" />
        </button>

        <CardContent className="pt-8 pb-6">
          {/* Progress dots */}
          <div className="flex gap-2 justify-center mb-8">
            {STEPS.map((s, i) => (
              <div key={s.id} className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === step ? 'w-8 bg-primary' : i < step ? 'w-4 bg-primary/40' : 'w-4 bg-muted'
              )} />
            ))}
          </div>

          {/* Icon + Title */}
          <div className="text-center mb-8">
            <div className={`w-16 h-16 rounded-2xl ${current.bg} flex items-center justify-center mx-auto mb-4`}>
              <Icon className={`w-8 h-8 ${current.color}`} />
            </div>
            <h2 className="text-xl font-bold mb-2">{current.title}</h2>
            <p className="text-muted-foreground text-sm">{current.subtitle}</p>
          </div>

          {/* Step-specific content */}
          {step === 0 && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: 'Multi-Cloud Monitoring', desc: 'AWS, GCP, Azure in one view' },
                { label: 'AI Anomaly Detection', desc: 'Automatic cost spike alerts' },
                { label: 'Natural Language Queries', desc: 'Ask about your infra in plain English' },
                { label: 'Cost Forecasting', desc: 'Predict next month\'s bill' },
              ].map(f => (
                <div key={f.label} className="p-3 rounded-xl bg-muted/50 border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <p className="text-xs font-medium">{f.label}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3 mb-6">
              <div>
                <label className="text-xs font-medium block mb-1">AWS Access Key ID</label>
                <input value={awsKey} onChange={e => setAwsKey(e.target.value)} placeholder="AKIAIOSFODNN7EXAMPLE"
                  className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary transition-colors font-mono" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">AWS Secret Access Key</label>
                <input type="password" value={awsSecret} onChange={e => setAwsSecret(e.target.value)}
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                  className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary transition-colors font-mono" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Default Region</label>
                <select 
                  value={awsRegion} 
                  onChange={e => setAwsRegion(e.target.value)}
                  title="Select AWS Region"
                  aria-label="Select AWS Region"
                  className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary transition-colors"
                >
                  {['us-east-1','us-west-2','eu-west-1','ap-southeast-1','ap-northeast-1'].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Key className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-600 dark:text-amber-400">Use a read-only IAM user. Never use your root account credentials.</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3 mb-6">
              <div>
                <label className="text-xs font-medium block mb-1">Service Account JSON</label>
                <textarea rows={5} placeholder='{"type": "service_account", "project_id": "...", ...}'
                  className="w-full bg-muted rounded-xl px-3 py-2.5 text-xs outline-none border border-border focus:border-primary transition-colors font-mono resize-none" />
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Globe className="w-4 h-4 text-blue-500 shrink-0" />
                <p className="text-xs text-blue-600 dark:text-blue-400">Assign the Viewer role to the service account in GCP IAM.</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 mb-6">
              <div>
                <label className="text-xs font-medium block mb-1">Anthropic API Key</label>
                <input type="password" value={claudeKey} onChange={e => setClaudeKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary transition-colors font-mono" />
              </div>
              <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 space-y-2">
                <p className="text-xs font-medium text-violet-600 dark:text-violet-400">Enables these AI features:</p>
                {['AI-powered anomaly explanations', 'Natural language cloud queries', 'Floating AI Cost Advisor', 'Predictive cost alerts'].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <p className="text-xs">{f}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3 mb-6">
              {[
                { label: 'AWS Connected', done: !!awsKey, skip: !awsKey },
                { label: 'GCP Connected', done: false, skip: true },
                { label: 'Claude AI Enabled', done: !!claudeKey, skip: !claudeKey },
                { label: 'Demo data loaded', done: true, skip: false },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                  {item.done ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <CircleDot className="w-4 h-4 text-muted-foreground" />}
                  <span className="text-sm">{item.label}</span>
                  {item.skip && !item.done && <span className="ml-auto text-xs text-muted-foreground">Using demo data</span>}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {step > 0 && step < STEPS.length - 1 && (
              <Button variant="ghost" className="flex-1" onClick={skip}>Skip for now</Button>
            )}
            <Button className="flex-1 gap-2" onClick={next}>
              {isLast ? 'Open Dashboard' : step === 0 ? 'Get Started' : 'Continue'}
              {!isLast && <ArrowRight className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
