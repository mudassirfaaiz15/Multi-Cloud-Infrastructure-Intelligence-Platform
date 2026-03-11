"""
AI-Powered Anomaly Detection Service
Detects unusual patterns in cloud costs and resource usage,
then uses Claude AI to generate human-readable explanations.
"""

import logging
import statistics
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


# ─── Data Models ────────────────────────────────────────────────────────────

class AnomalyResult:
    def __init__(
        self,
        anomaly_id: str,
        title: str,
        severity: str,          # critical | high | medium | low
        category: str,          # cost | usage | security | performance
        provider: str,
        resource_type: str,
        current_value: float,
        expected_value: float,
        deviation_pct: float,
        description: str,
        ai_explanation: Optional[str],
        recommendation: str,
        detected_at: str,
    ):
        self.anomaly_id = anomaly_id
        self.title = title
        self.severity = severity
        self.category = category
        self.provider = provider
        self.resource_type = resource_type
        self.current_value = current_value
        self.expected_value = expected_value
        self.deviation_pct = deviation_pct
        self.description = description
        self.ai_explanation = ai_explanation
        self.recommendation = recommendation
        self.detected_at = detected_at

    def to_dict(self) -> Dict[str, Any]:
        return {
            "anomaly_id": self.anomaly_id,
            "title": self.title,
            "severity": self.severity,
            "category": self.category,
            "provider": self.provider,
            "resource_type": self.resource_type,
            "current_value": self.current_value,
            "expected_value": self.expected_value,
            "deviation_pct": round(self.deviation_pct, 1),
            "description": self.description,
            "ai_explanation": self.ai_explanation,
            "recommendation": self.recommendation,
            "detected_at": self.detected_at,
        }


# ─── Core Detector ──────────────────────────────────────────────────────────

class AnomalyDetector:
    """
    Detects cost and usage anomalies using statistical methods (z-score / IQR),
    then enriches findings with Claude AI explanations when an API key is available.
    """

    SEVERITY_THRESHOLDS = {
        "critical": 100.0,  # >100% above expected
        "high": 50.0,
        "medium": 25.0,
        "low": 10.0,
    }

    def __init__(self, anthropic_api_key: Optional[str] = None):
        self.anthropic_api_key = anthropic_api_key

    # ── Public API ──────────────────────────────────────────────────────────

    def detect(
        self,
        cost_history: Optional[List[Dict]] = None,
        resource_metrics: Optional[List[Dict]] = None,
        use_ai_explanations: bool = True,
    ) -> Dict[str, Any]:
        """
        Main entry point. Accepts historical cost/metric data and returns
        detected anomalies with AI explanations.
        """
        anomalies: List[AnomalyResult] = []

        # Run all detection passes
        if cost_history:
            anomalies.extend(self._detect_cost_anomalies(cost_history))
        if resource_metrics:
            anomalies.extend(self._detect_usage_anomalies(resource_metrics))

        # If no real data provided, return rich demo anomalies
        if not cost_history and not resource_metrics:
            anomalies = self._demo_anomalies()

        # Enrich with AI explanations
        if use_ai_explanations and self.anthropic_api_key:
            for anomaly in anomalies:
                anomaly.ai_explanation = self._get_ai_explanation(anomaly)

        anomaly_dicts = [a.to_dict() for a in anomalies]

        return {
            "anomalies": anomaly_dicts,
            "total": len(anomaly_dicts),
            "critical": sum(1 for a in anomaly_dicts if a["severity"] == "critical"),
            "high": sum(1 for a in anomaly_dicts if a["severity"] == "high"),
            "medium": sum(1 for a in anomaly_dicts if a["severity"] == "medium"),
            "low": sum(1 for a in anomaly_dicts if a["severity"] == "low"),
            "scan_time": datetime.utcnow().isoformat() + "Z",
            "ai_enriched": bool(use_ai_explanations and self.anthropic_api_key),
        }

    # ── Detection Algorithms ─────────────────────────────────────────────────

    def _detect_cost_anomalies(self, cost_history: List[Dict]) -> List[AnomalyResult]:
        """Z-score based anomaly detection on cost time series."""
        anomalies = []
        if len(cost_history) < 3:
            return anomalies

        values = [entry.get("total", 0) for entry in cost_history]
        mean = statistics.mean(values)
        try:
            std = statistics.stdev(values)
        except statistics.StatisticsError:
            return anomalies

        if std == 0:
            return anomalies

        latest = cost_history[-1]
        z_score = abs((latest.get("total", 0) - mean) / std)

        if z_score > 2.0:  # 2-sigma threshold
            deviation_pct = ((latest["total"] - mean) / mean) * 100
            severity = self._classify_severity(abs(deviation_pct))
            anomalies.append(AnomalyResult(
                anomaly_id=f"cost-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-001",
                title=f"Unusual Cost Spike Detected",
                severity=severity,
                category="cost",
                provider=latest.get("provider", "AWS"),
                resource_type="billing",
                current_value=round(latest["total"], 2),
                expected_value=round(mean, 2),
                deviation_pct=deviation_pct,
                description=f"Cloud spend of ${latest['total']:.2f} is {abs(deviation_pct):.1f}% "
                            f"{'above' if deviation_pct > 0 else 'below'} the 30-day average of ${mean:.2f}.",
                ai_explanation=None,
                recommendation="Review recent resource launches or scaling events. "
                               "Consider setting a budget alert at 80% of expected spend.",
                detected_at=datetime.utcnow().isoformat() + "Z",
            ))
        return anomalies

    def _detect_usage_anomalies(self, resource_metrics: List[Dict]) -> List[AnomalyResult]:
        """IQR-based anomaly detection for resource metrics."""
        anomalies = []
        for metric in resource_metrics:
            values = metric.get("values", [])
            if len(values) < 4:
                continue

            q1 = statistics.quantiles(values, n=4)[0]
            q3 = statistics.quantiles(values, n=4)[2]
            iqr = q3 - q1
            upper_bound = q3 + 1.5 * iqr

            current = values[-1]
            if current > upper_bound and upper_bound > 0:
                deviation_pct = ((current - upper_bound) / upper_bound) * 100
                severity = self._classify_severity(abs(deviation_pct))
                anomalies.append(AnomalyResult(
                    anomaly_id=f"usage-{metric.get('resource_id', 'unknown')}-{datetime.utcnow().strftime('%H%M%S')}",
                    title=f"High {metric.get('metric_name', 'Usage')} on {metric.get('resource_id', 'resource')}",
                    severity=severity,
                    category="usage",
                    provider=metric.get("provider", "AWS"),
                    resource_type=metric.get("resource_type", "EC2"),
                    current_value=round(current, 2),
                    expected_value=round(upper_bound, 2),
                    deviation_pct=deviation_pct,
                    description=f"{metric.get('metric_name', 'Metric')} is {current:.1f}% — "
                                f"{deviation_pct:.1f}% above the expected upper bound of {upper_bound:.1f}%.",
                    ai_explanation=None,
                    recommendation="Check for runaway processes or unexpected load. "
                                   "Consider auto-scaling policies or vertical scaling.",
                    detected_at=datetime.utcnow().isoformat() + "Z",
                ))
        return anomalies

    # ── AI Explanation ───────────────────────────────────────────────────────

    def _get_ai_explanation(self, anomaly: AnomalyResult) -> str:
        """Call Claude API to generate a plain-English explanation."""
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=self.anthropic_api_key)

            prompt = f"""You are a cloud infrastructure expert. Explain this cost anomaly to a non-technical manager in 2-3 concise sentences.

Anomaly details:
- Title: {anomaly.title}
- Category: {anomaly.category}
- Provider: {anomaly.provider}
- Current value: {anomaly.current_value}
- Expected value: {anomaly.expected_value}
- Deviation: {anomaly.deviation_pct:.1f}%
- Severity: {anomaly.severity}

Write a clear, actionable explanation. Start with what happened, why it might have occurred, and what to do next."""

            message = client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}],
            )
            return message.content[0].text
        except Exception as e:
            logger.warning(f"AI explanation failed: {e}")
            return anomaly.description

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _classify_severity(self, deviation_pct: float) -> str:
        for level, threshold in self.SEVERITY_THRESHOLDS.items():
            if deviation_pct >= threshold:
                return level
        return "low"

    def _demo_anomalies(self) -> List[AnomalyResult]:
        """Rich demo anomalies for when no real credentials are provided."""
        now = datetime.utcnow().isoformat() + "Z"
        return [
            AnomalyResult(
                anomaly_id="demo-001",
                title="EC2 Cost Spike — us-east-1",
                severity="critical",
                category="cost",
                provider="AWS",
                resource_type="EC2",
                current_value=4820.50,
                expected_value=2340.00,
                deviation_pct=106.0,
                description="Your EC2 spend in us-east-1 doubled overnight, likely due to auto-scaling during a traffic surge.",
                ai_explanation=(
                    "Your EC2 costs spiked 106% above normal, reaching $4,820 vs the expected $2,340. "
                    "This pattern is typically caused by auto-scaling groups launching additional instances "
                    "during a traffic surge or a runaway batch job. "
                    "Recommended action: review your Auto Scaling policies and set a maximum instance cap."
                ),
                recommendation="Review Auto Scaling policies. Set max capacity limits and add SNS billing alerts.",
                detected_at=now,
            ),
            AnomalyResult(
                anomaly_id="demo-002",
                title="Unusual S3 Data Transfer Charges",
                severity="high",
                category="cost",
                provider="AWS",
                resource_type="S3",
                current_value=340.20,
                expected_value=48.00,
                deviation_pct=608.7,
                description="S3 egress costs jumped from $48 to $340 — possible misconfigured public bucket or data exfiltration.",
                ai_explanation=(
                    "S3 data transfer costs are 608% above normal. "
                    "This typically indicates a public-facing bucket being accessed by external clients at high volume, "
                    "a misconfigured CloudFront origin, or potentially unauthorized data access. "
                    "Immediately audit your S3 bucket policies and enable S3 Access Analyzer."
                ),
                recommendation="Audit S3 bucket policies. Enable S3 Access Analyzer and block public access.",
                detected_at=now,
            ),
            AnomalyResult(
                anomaly_id="demo-003",
                title="GCP BigQuery Query Cost Anomaly",
                severity="high",
                category="cost",
                provider="GCP",
                resource_type="BigQuery",
                current_value=890.00,
                expected_value=120.00,
                deviation_pct=641.7,
                description="A series of unoptimized BigQuery queries scanned 12TB of data instead of the expected 1.5TB.",
                ai_explanation=(
                    "BigQuery costs jumped 641% due to inefficient full-table scans. "
                    "A query is likely missing a WHERE clause partition filter, causing it to scan the entire table. "
                    "Use INFORMATION_SCHEMA.JOBS to find the offending queries and add proper partition filters."
                ),
                recommendation="Add partition filters to BigQuery queries. Enable cost controls with maximum bytes billed.",
                detected_at=now,
            ),
            AnomalyResult(
                anomaly_id="demo-004",
                title="Claude API — Token Usage Spike",
                severity="medium",
                category="usage",
                provider="Anthropic",
                resource_type="API",
                current_value=9340000,
                expected_value=4500000,
                deviation_pct=107.6,
                description="Claude API token consumption is 107% above normal — possibly due to a prompt engineering regression.",
                ai_explanation=(
                    "Token usage doubled, suggesting prompts are now much longer than expected. "
                    "A common cause is accidentally including large context objects or chat history in API calls. "
                    "Review your system prompts and trim any unnecessarily long context."
                ),
                recommendation="Audit prompt templates. Consider caching common context and implementing token budgets.",
                detected_at=now,
            ),
            AnomalyResult(
                anomaly_id="demo-005",
                title="RDS — Sustained High CPU",
                severity="medium",
                category="performance",
                provider="AWS",
                resource_type="RDS",
                current_value=94.3,
                expected_value=35.0,
                deviation_pct=169.4,
                description="RDS instance db.t3.medium has been at 94% CPU for 3+ hours — slow queries likely the cause.",
                ai_explanation=(
                    "Your RDS instance has sustained 94% CPU utilization for over 3 hours. "
                    "This is typically caused by missing database indexes, N+1 query patterns, or a lock contention issue. "
                    "Run SHOW PROCESSLIST and EXPLAIN on your top queries to identify the bottleneck."
                ),
                recommendation="Enable Performance Insights. Run SHOW PROCESSLIST to identify locking queries.",
                detected_at=now,
            ),
            AnomalyResult(
                anomaly_id="demo-006",
                title="Idle NAT Gateway Charges",
                severity="low",
                category="cost",
                provider="AWS",
                resource_type="NAT Gateway",
                current_value=87.60,
                expected_value=32.40,
                deviation_pct=170.4,
                description="Three NAT gateways in dev/staging accounts are processing minimal traffic but incurring hourly fees.",
                ai_explanation=(
                    "NAT Gateway costs tripled because three gateways in your dev/staging environment are running "
                    "with near-zero traffic utilization. Each gateway costs ~$32/month regardless of usage. "
                    "Consider deleting unused gateways in non-production environments or using VPC Endpoints instead."
                ),
                recommendation="Delete idle NAT gateways in dev/staging. Use VPC Endpoints for AWS service access.",
                detected_at=now,
            ),
        ]
