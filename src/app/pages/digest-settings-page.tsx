import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Mail, Clock, Check, DollarSign, AlertTriangle, TrendingUp, Shield } from 'lucide-react';
// @ts-expect-error Send exists in runtime
import { Send } from 'lucide-react';

const REPORT_SECTIONS = [
  { id: 'costs', label: 'Weekly Cost Summary', desc: 'Total spend, top services, vs last week', icon: DollarSign, enabled: true },
  { id: 'anomalies', label: 'Anomaly Report', desc: 'All detected anomalies and their impact', icon: AlertTriangle, enabled: true },
  { id: 'forecast', label: 'Month-End Forecast', desc: 'Predicted end-of-month bill', icon: TrendingUp, enabled: true },
  { id: 'security', label: 'Security & Drift', desc: 'High-risk changes and drift summary', icon: Shield, enabled: false },
];

const FREQUENCIES = ['Weekly (Monday 9am)', 'Bi-weekly', 'Monthly', 'Daily'];
const FORMATS = ['HTML (rich)', 'Plain Text', 'PDF Summary'];

export function DigestSettingsPage() {
  const [email, setEmail] = useState('mudassir@company.com');
  const [frequency, setFrequency] = useState(FREQUENCIES[0]);
  const [format, setFormat] = useState(FORMATS[0]);
  const [sections, setSections] = useState(REPORT_SECTIONS);
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);

  const toggle = (id: string) =>
    setSections(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const sendTest = () => {
    setSending(true);
    setTimeout(() => setSending(false), 2000);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Weekly Digest</h1>
        <p className="text-muted-foreground">Configure your automated cloud intelligence reports</p>
      </div>

      {/* Preview card */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-violet-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">AI-Generated Weekly Summary</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Claude AI reads your cost data, anomalies, and usage trends — then writes a concise executive summary delivered to your inbox every Monday morning.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {['Cost trends', 'Anomaly highlights', 'Savings opportunities', 'Action items'].map(tag => (
                  <span key={tag} className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery settings */}
        <Card className="border-border">
          <CardHeader><CardTitle className="text-base">Delivery Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Email Address</label>
              <div className="flex gap-2">
                <input value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary transition-colors" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Frequency</label>
              <div className="grid grid-cols-2 gap-2">
                {FREQUENCIES.map(f => (
                  <button key={f} onClick={() => setFrequency(f)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-colors ${frequency === f ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                    <Clock className="w-3 h-3" />
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Report Format</label>
              <div className="flex gap-2">
                {FORMATS.map(f => (
                  <button key={f} onClick={() => setFormat(f)}
                    className={`flex-1 px-3 py-2 rounded-xl border text-xs transition-colors ${format === f ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report sections */}
        <Card className="border-border">
          <CardHeader><CardTitle className="text-base">Report Sections</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {sections.map(s => {
              const Icon = s.icon;
              return (
                <div key={s.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${s.enabled ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                  <div className={`p-2 rounded-lg shrink-0 ${s.enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                    <Icon className={`w-4 h-4 ${s.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                  <button onClick={() => toggle(s.id)}
                    className={`shrink-0 w-10 h-6 rounded-full transition-colors ${s.enabled ? 'bg-primary' : 'bg-muted'}`}
                    title={`Toggle ${s.label}`}
                    aria-label={`Toggle ${s.label}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${s.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={sendTest} variant="outline" className="gap-2" disabled={sending}>
          {sending ? <Check className="w-4 h-4 text-green-500" /> : <Send className="w-4 h-4" />}
          {sending ? 'Test Sent!' : 'Send Test Email'}
        </Button>
        <Button onClick={save} className="gap-2">
          {saved ? <Check className="w-4 h-4" /> : null}
          {saved ? 'Saved!' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
