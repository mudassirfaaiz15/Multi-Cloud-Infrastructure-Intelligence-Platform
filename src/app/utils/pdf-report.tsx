import { Button } from '@/app/components/ui/button';
import { Download } from 'lucide-react';

function buildReportHTML(): string {
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>ConsoleSensei — Cloud Cost Report ${now}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; padding: 40px; }
    h1 { font-size: 24px; color: #4f46e5; margin-bottom: 4px; }
    .subtitle { color: #64748b; font-size: 13px; margin-bottom: 32px; }
    h2 { font-size: 16px; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin: 24px 0 12px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
    .card .label { font-size: 11px; color: #64748b; margin-bottom: 4px; }
    .card .value { font-size: 22px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; }
    th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-weight: 600; color: #475569; }
    td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    .green { color: #16a34a; } .red { color: #dc2626; } .amber { color: #d97706; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
    .badge-green { background: #dcfce7; color: #16a34a; }
    .badge-red { background: #fee2e2; color: #dc2626; }
    .badge-amber { background: #fef3c7; color: #d97706; }
    .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; text-align: center; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>ConsoleSensei Cloud Cost Report</h1>
  <p class="subtitle">Generated: ${now} &nbsp;|&nbsp; Reporting period: March 2026 MTD</p>

  <h2>Executive Summary</h2>
  <div class="grid">
    <div class="card"><div class="label">MTD Spend</div><div class="value">$2,309</div><div class="label" style="margin-top:4px">46% of monthly budget</div></div>
    <div class="card"><div class="label">Month-End Forecast</div><div class="value red">$5,610</div><div class="label" style="margin-top:4px">$336 over $5,274 budget</div></div>
    <div class="card"><div class="label">Potential Savings</div><div class="value green">$1,505</div><div class="label" style="margin-top:4px">6 identified actions</div></div>
  </div>

  <h2>Cost by Provider</h2>
  <table>
    <tr><th>Provider</th><th>Spend (Mar)</th><th>% of Total</th><th>MoM Δ</th><th>Status</th></tr>
    <tr><td>AWS</td><td class="amber">$4,114</td><td>73.4%</td><td>+5.2%</td><td><span class="badge badge-amber">Watch</span></td></tr>
    <tr><td>GCP</td><td class="amber">$1,160</td><td>20.7%</td><td>+6.4%</td><td><span class="badge badge-amber">Watch</span></td></tr>
    <tr><td>Claude AI</td><td>$312</td><td>5.6%</td><td>+5.8%</td><td><span class="badge badge-green">OK</span></td></tr>
  </table>

  <h2>Top Services by Cost</h2>
  <table>
    <tr><th>Service</th><th>Provider</th><th>Budget</th><th>Actual</th><th>Variance</th></tr>
    <tr><td>EC2 Compute</td><td>AWS</td><td>$2,000</td><td class="red">$2,140</td><td class="red">+7%</td></tr>
    <tr><td>GCP BigQuery</td><td>GCP</td><td>$200</td><td class="red">$890</td><td class="red">+345%</td></tr>
    <tr><td>RDS Databases</td><td>AWS</td><td>$700</td><td class="green">$640</td><td class="green">-8.6%</td></tr>
    <tr><td>S3 Storage</td><td>AWS</td><td>$350</td><td class="green">$295</td><td class="green">-15.7%</td></tr>
    <tr><td>CloudFront</td><td>AWS</td><td>$200</td><td class="green">$198</td><td class="green">-1%</td></tr>
  </table>

  <h2>Anomalies Detected</h2>
  <table>
    <tr><th>Date</th><th>Service</th><th>Spike</th><th>Root Cause</th><th>Status</th></tr>
    <tr><td>Mar 10</td><td>EC2 us-east-1</td><td class="red">+$73/day</td><td>Auto Scaling misconfiguration</td><td><span class="badge badge-amber">Investigating</span></td></tr>
    <tr><td>Mar 08</td><td>BigQuery</td><td class="red">+$124/day</td><td>Unoptimized table scan (no partition)</td><td><span class="badge badge-red">Critical</span></td></tr>
  </table>

  <h2>Top Savings Opportunities</h2>
  <table>
    <tr><th>Recommendation</th><th>Service</th><th>Effort</th><th>Monthly Saving</th></tr>
    <tr><td>Reserve EC2 capacity (1-year)</td><td>EC2</td><td>Medium</td><td class="green">$520</td></tr>
    <tr><td>Optimize BigQuery partitioning</td><td>GCP</td><td>Medium</td><td class="green">$310</td></tr>
    <tr><td>Rightsize 6 underutilized EC2s</td><td>EC2</td><td>Low</td><td class="green">$381</td></tr>
    <tr><td>Enable S3 Intelligent-Tiering</td><td>S3</td><td>Low</td><td class="green">$94</td></tr>
    <tr><td>Migrate dev RDS to Aurora Serverless</td><td>RDS</td><td>High</td><td class="green">$185</td></tr>
  </table>

  <div class="footer">Generated by ConsoleSensei — Multi-Cloud Intelligence Platform &nbsp;|&nbsp; Confidential</div>
</body>
</html>`;
}

export function PDFReportButton({ className = '' }: { className?: string }) {
  function generate() {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(buildReportHTML());
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 500);
  }

  return (
    <Button
      variant="outline"
      onClick={generate}
      className={`gap-2 ${className}`}
      id="generate-pdf-report"
      aria-label="Download PDF executive report"
    >
      <Download className="w-4 h-4" />
      Export PDF Report
    </Button>
  );
}
