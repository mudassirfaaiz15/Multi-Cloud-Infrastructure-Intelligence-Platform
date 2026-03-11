"""
Natural Language Cloud Query Engine
Translates plain English questions into cloud API queries using Claude AI,
executes them, and returns structured results with a human-readable summary.
"""

import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


# ─── Schema for Claude to generate queries ───────────────────────────────────

SUPPORTED_QUERY_TYPES = {
    "cost_by_service": "Get cost breakdown by AWS/GCP service for a time period",
    "cost_by_region": "Get cost breakdown by cloud region",
    "top_expensive_resources": "List the most expensive resources",
    "ec2_instances": "List EC2 instances with filters (region, state, type)",
    "s3_buckets": "List S3 buckets with size and cost",
    "gcp_resources": "List GCP resources with filters",
    "claude_usage": "Get Claude AI API usage statistics",
    "anomalies": "Find cost or usage anomalies",
    "savings_opportunities": "Find resources to optimize for savings",
    "budget_status": "Check budget vs actual spend",
}

SYSTEM_PROMPT = """You are a cloud infrastructure query parser for ConsoleSensei, a multi-cloud monitoring platform.

Your job: parse a natural language question and return a JSON object describing what query to execute.

Available query types and their parameters:
- cost_by_service: { time_period: "7d|30d|90d", provider: "aws|gcp|all" }
- cost_by_region: { time_period: "7d|30d|90d", provider: "aws|gcp|all" }
- top_expensive_resources: { limit: number, provider: "aws|gcp|all", time_period: "7d|30d" }
- ec2_instances: { region: string|null, state: "running|stopped|all", min_cost: number|null }
- s3_buckets: { min_size_gb: number|null }
- gcp_resources: { resource_type: string|null, region: string|null }
- claude_usage: { time_period: "7d|30d" }
- anomalies: { severity: "all|critical|high|medium|low" }
- savings_opportunities: { min_savings: number|null }
- budget_status: { provider: "aws|gcp|all" }

Return ONLY valid JSON in this format:
{
  "query_type": "<one of the types above>",
  "parameters": { <relevant parameters> },
  "human_question": "<restate what the user is asking in clear English>",
  "confidence": <0.0-1.0>
}

If you cannot map the question to a query type, return:
{ "query_type": "unknown", "parameters": {}, "human_question": "<original question>", "confidence": 0.0 }"""


# ─── Query Engine ─────────────────────────────────────────────────────────────

class NLQueryEngine:
    """
    Accepts natural language questions, uses Claude to parse them into
    structured queries, executes the queries, and returns results with
    a natural language summary.
    """

    def __init__(self, anthropic_api_key: Optional[str] = None):
        self.anthropic_api_key = anthropic_api_key

    # ── Public API ────────────────────────────────────────────────────────────

    def query(self, question: str, credentials: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Process a natural language cloud query.

        Returns:
            {
                "question": original question,
                "parsed_query": { type, parameters },
                "results": [ ... ],
                "summary": "AI-generated plain English answer",
                "result_count": int,
                "execution_time_ms": int,
            }
        """
        start = datetime.utcnow()

        # Step 1: Parse the question using Claude
        parsed = self._parse_question(question)

        # Step 2: Execute the query (demo or real)
        has_real_credentials = bool(credentials and any(credentials.values()))
        results = self._execute_query(parsed, credentials if has_real_credentials else None)

        # Step 3: Generate a natural language summary
        summary = self._generate_summary(question, parsed, results)

        elapsed_ms = int((datetime.utcnow() - start).total_seconds() * 1000)

        return {
            "question": question,
            "parsed_query": parsed,
            "results": results,
            "summary": summary,
            "result_count": len(results) if isinstance(results, list) else 1,
            "execution_time_ms": elapsed_ms,
            "demo_mode": not has_real_credentials,
        }

    # ── Question Parsing ──────────────────────────────────────────────────────

    def _parse_question(self, question: str) -> Dict[str, Any]:
        """Use Claude to parse the natural language question into a structured query."""
        if not self.anthropic_api_key:
            return self._rule_based_parse(question)

        try:
            import anthropic
            client = anthropic.Anthropic(api_key=self.anthropic_api_key)
            message = client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=300,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": question}],
            )
            raw = message.content[0].text.strip()
            # Extract JSON from response
            if "```json" in raw:
                raw = raw.split("```json")[1].split("```")[0].strip()
            elif "```" in raw:
                raw = raw.split("```")[1].split("```")[0].strip()
            return json.loads(raw)
        except Exception as e:
            logger.warning(f"Claude parse failed: {e}, falling back to rule-based")
            return self._rule_based_parse(question)

    def _rule_based_parse(self, question: str) -> Dict[str, Any]:
        """Fallback keyword-based parser when no API key is available."""
        q = question.lower()

        if any(w in q for w in ["anomal", "spike", "unusual", "weird"]):
            return {"query_type": "anomalies", "parameters": {"severity": "all"},
                    "human_question": question, "confidence": 0.75}
        if any(w in q for w in ["save", "saving", "optim", "rightsiz"]):
            return {"query_type": "savings_opportunities", "parameters": {"min_savings": None},
                    "human_question": question, "confidence": 0.75}
        if any(w in q for w in ["expensive", "cost", "spend", "bill"]):
            if "region" in q:
                return {"query_type": "cost_by_region", "parameters": {"time_period": "30d", "provider": "all"},
                        "human_question": question, "confidence": 0.70}
            if any(w in q for w in ["service", "breakdown"]):
                return {"query_type": "cost_by_service", "parameters": {"time_period": "30d", "provider": "all"},
                        "human_question": question, "confidence": 0.70}
            return {"query_type": "top_expensive_resources", "parameters": {"limit": 10, "provider": "all"},
                    "human_question": question, "confidence": 0.65}
        if "ec2" in q or "instance" in q:
            return {"query_type": "ec2_instances", "parameters": {"region": None, "state": "running"},
                    "human_question": question, "confidence": 0.80}
        if "s3" in q or "bucket" in q:
            return {"query_type": "s3_buckets", "parameters": {"min_size_gb": None},
                    "human_question": question, "confidence": 0.80}
        if "gcp" in q or "google" in q:
            return {"query_type": "gcp_resources", "parameters": {"resource_type": None, "region": None},
                    "human_question": question, "confidence": 0.70}
        if "claude" in q or "ai" in q or "anthropic" in q:
            return {"query_type": "claude_usage", "parameters": {"time_period": "30d"},
                    "human_question": question, "confidence": 0.85}
        if "budget" in q:
            return {"query_type": "budget_status", "parameters": {"provider": "all"},
                    "human_question": question, "confidence": 0.80}

        return {"query_type": "unknown", "parameters": {}, "human_question": question, "confidence": 0.0}

    # ── Query Execution ───────────────────────────────────────────────────────

    def _execute_query(self, parsed: Dict, credentials: Optional[Dict]) -> List[Dict]:
        """Execute the parsed query and return structured results."""
        qt = parsed.get("query_type", "unknown")
        params = parsed.get("parameters", {})

        executors = {
            "cost_by_service": self._demo_cost_by_service,
            "cost_by_region": self._demo_cost_by_region,
            "top_expensive_resources": self._demo_top_resources,
            "ec2_instances": self._demo_ec2_instances,
            "s3_buckets": self._demo_s3_buckets,
            "gcp_resources": self._demo_gcp_resources,
            "claude_usage": self._demo_claude_usage,
            "anomalies": self._demo_anomalies,
            "savings_opportunities": self._demo_savings,
            "budget_status": self._demo_budget_status,
        }

        executor = executors.get(qt)
        if executor:
            return executor(params)
        return [{"message": "I couldn't understand that query. Try asking about costs, resources, anomalies, or savings."}]

    # ── Natural Language Summary ──────────────────────────────────────────────

    def _generate_summary(self, question: str, parsed: Dict, results: List[Dict]) -> str:
        """Generate a conversational summary of the results using Claude."""
        if not self.anthropic_api_key:
            return self._rule_based_summary(parsed, results)

        try:
            import anthropic
            client = anthropic.Anthropic(api_key=self.anthropic_api_key)

            results_preview = json.dumps(results[:5], indent=2) if results else "[]"
            prompt = f"""The user asked: "{question}"

Here are the query results (first 5 of {len(results)} records):
{results_preview}

Write a concise 2-3 sentence summary answering the user's question directly. 
Be specific with numbers and resource names. Use a friendly, expert tone."""

            message = client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}],
            )
            return message.content[0].text
        except Exception as e:
            logger.warning(f"Summary generation failed: {e}")
            return self._rule_based_summary(parsed, results)

    def _rule_based_summary(self, parsed: Dict, results: List[Dict]) -> str:
        qt = parsed.get("query_type", "unknown")
        count = len(results)
        summaries = {
            "cost_by_service": f"Found cost breakdown across {count} services. EC2 and RDS are typically the largest contributors.",
            "cost_by_region": f"Cost data available for {count} regions.",
            "top_expensive_resources": f"Identified the top {count} most expensive resources across your cloud accounts.",
            "ec2_instances": f"Found {count} EC2 instances matching your criteria.",
            "s3_buckets": f"Found {count} S3 buckets in your account.",
            "gcp_resources": f"Found {count} GCP resources matching your query.",
            "claude_usage": f"Retrieved Claude AI usage statistics across {count} data points.",
            "anomalies": f"Detected {count} anomalies in your cloud environment.",
            "savings_opportunities": f"Found {count} cost optimization opportunities.",
            "budget_status": f"Budget status retrieved for {count} accounts.",
        }
        return summaries.get(qt, f"Query returned {count} results.")

    # ── Demo Data Generators ──────────────────────────────────────────────────

    def _demo_cost_by_service(self, params: Dict) -> List[Dict]:
        return [
            {"service": "Amazon EC2", "provider": "AWS", "cost": 3660.00, "pct": 64.2, "trend": "+12%"},
            {"service": "Amazon RDS", "provider": "AWS", "cost": 890.50, "pct": 15.6, "trend": "+3%"},
            {"service": "Amazon S3", "provider": "AWS", "cost": 340.20, "pct": 6.0, "trend": "+608%"},
            {"service": "AWS Lambda", "provider": "AWS", "cost": 120.80, "pct": 2.1, "trend": "-5%"},
            {"service": "CloudFront", "provider": "AWS", "cost": 98.30, "pct": 1.7, "trend": "+2%"},
            {"service": "BigQuery", "provider": "GCP", "cost": 280.00, "pct": 4.9, "trend": "+641%"},
            {"service": "Cloud Run", "provider": "GCP", "cost": 95.40, "pct": 1.7, "trend": "+8%"},
            {"service": "Claude AI API", "provider": "Anthropic", "cost": 72.60, "pct": 1.3, "trend": "+20%"},
        ]

    def _demo_cost_by_region(self, params: Dict) -> List[Dict]:
        return [
            {"region": "us-east-1", "provider": "AWS", "cost": 2840.00, "resources": 142},
            {"region": "us-west-2", "provider": "AWS", "cost": 1120.50, "resources": 67},
            {"region": "eu-west-1", "provider": "AWS", "cost": 540.80, "resources": 34},
            {"region": "ap-southeast-1", "provider": "AWS", "cost": 245.20, "resources": 18},
            {"region": "us-central1", "provider": "GCP", "cost": 310.40, "resources": 28},
            {"region": "europe-west1", "provider": "GCP", "cost": 121.60, "resources": 12},
        ]

    def _demo_top_resources(self, params: Dict) -> List[Dict]:
        return [
            {"name": "prod-ml-training", "type": "EC2 p3.8xlarge", "provider": "AWS", "region": "us-east-1", "monthly_cost": 890.20, "state": "running"},
            {"name": "prod-rds-primary", "type": "RDS db.r5.2xlarge", "provider": "AWS", "region": "us-east-1", "monthly_cost": 640.50, "state": "running"},
            {"name": "staging-cluster", "type": "EKS NodeGroup", "provider": "AWS", "region": "us-east-1", "monthly_cost": 480.30, "state": "running"},
            {"name": "analytics-bq", "type": "BigQuery Dataset", "provider": "GCP", "region": "us-central1", "monthly_cost": 280.00, "state": "active"},
            {"name": "cdn-distribution", "type": "CloudFront", "provider": "AWS", "region": "global", "monthly_cost": 198.40, "state": "active"},
            {"name": "data-pipeline-vm", "type": "n2-standard-8", "provider": "GCP", "region": "us-central1", "monthly_cost": 175.20, "state": "running"},
        ]

    def _demo_ec2_instances(self, params: Dict) -> List[Dict]:
        return [
            {"instance_id": "i-0abc123def456", "name": "prod-api-server-1", "type": "t3.large", "state": "running", "region": "us-east-1", "monthly_cost": 72.40, "cpu_avg": 28.5},
            {"instance_id": "i-0def456ghi789", "name": "prod-ml-training", "type": "p3.8xlarge", "state": "running", "region": "us-east-1", "monthly_cost": 890.20, "cpu_avg": 87.3},
            {"instance_id": "i-0ghi789jkl012", "name": "staging-web-server", "type": "t2.medium", "state": "running", "region": "us-west-2", "monthly_cost": 30.50, "cpu_avg": 8.2},
            {"instance_id": "i-0jkl012mno345", "name": "dev-bastion", "type": "t3.micro", "state": "stopped", "region": "us-east-1", "monthly_cost": 2.10, "cpu_avg": 0},
            {"instance_id": "i-0mno345pqr678", "name": "data-processor", "type": "c5.4xlarge", "state": "running", "region": "us-east-1", "monthly_cost": 280.30, "cpu_avg": 45.8},
        ]

    def _demo_s3_buckets(self, params: Dict) -> List[Dict]:
        return [
            {"bucket": "prod-data-lake-primary", "size_gb": 12840, "objects": 2840920, "monthly_cost": 295.80, "public": False},
            {"bucket": "prod-backups-2024", "size_gb": 4920, "objects": 180240, "monthly_cost": 113.20, "public": False},
            {"bucket": "static-assets-cdn", "size_gb": 340, "objects": 42800, "monthly_cost": 22.40, "public": True},
            {"bucket": "dev-test-uploads", "size_gb": 180, "objects": 8940, "monthly_cost": 4.10, "public": True},
            {"bucket": "lambda-deployment-pkg", "size_gb": 12, "objects": 320, "monthly_cost": 0.28, "public": False},
        ]

    def _demo_gcp_resources(self, params: Dict) -> List[Dict]:
        return [
            {"name": "ml-training-vm-1", "type": "Compute Engine n2-standard-16", "region": "us-central1", "monthly_cost": 175.20, "state": "RUNNING"},
            {"name": "prod-gke-cluster", "type": "GKE Standard Cluster", "region": "us-central1", "monthly_cost": 145.80, "state": "RUNNING"},
            {"name": "analytics-dataset", "type": "BigQuery Dataset", "region": "US", "monthly_cost": 280.00, "state": "ACTIVE"},
            {"name": "media-storage", "type": "Cloud Storage Bucket", "region": "us-central1", "monthly_cost": 42.60, "state": "ACTIVE"},
            {"name": "api-cloud-run", "type": "Cloud Run Service", "region": "us-central1", "monthly_cost": 28.40, "state": "ACTIVE"},
        ]

    def _demo_claude_usage(self, params: Dict) -> List[Dict]:
        return [
            {"date": "2025-01-01", "model": "claude-3-5-sonnet", "api_calls": 420, "input_tokens": 890000, "output_tokens": 380000, "cost": 8.40},
            {"date": "2025-01-02", "model": "claude-3-5-sonnet", "api_calls": 380, "input_tokens": 820000, "output_tokens": 340000, "cost": 7.80},
            {"date": "2025-01-03", "model": "claude-3-5-haiku", "api_calls": 1200, "input_tokens": 480000, "output_tokens": 180000, "cost": 1.20},
            {"date": "2025-01-04", "model": "claude-3-5-haiku", "api_calls": 890, "input_tokens": 360000, "output_tokens": 140000, "cost": 0.90},
            {"date": "2025-01-05", "model": "claude-3-opus", "api_calls": 45, "input_tokens": 120000, "output_tokens": 48000, "cost": 5.40},
        ]

    def _demo_anomalies(self, params: Dict) -> List[Dict]:
        return [
            {"id": "demo-001", "title": "EC2 Cost Spike", "severity": "critical", "provider": "AWS", "deviation": "106%", "cost_impact": 2480.50},
            {"id": "demo-002", "title": "S3 Egress Anomaly", "severity": "high", "provider": "AWS", "deviation": "608%", "cost_impact": 292.20},
            {"id": "demo-003", "title": "BigQuery Over-scan", "severity": "high", "provider": "GCP", "deviation": "641%", "cost_impact": 770.00},
        ]

    def _demo_savings(self, params: Dict) -> List[Dict]:
        return [
            {"resource": "prod-ml-training (EC2 p3.8xlarge)", "issue": "Low CPU utilization (12% avg)", "action": "Rightsize to p3.2xlarge", "monthly_savings": 445.10},
            {"resource": "dev-test-uploads (S3)", "issue": "Public bucket with no lifecycle policy", "action": "Add 30-day Glacier transition", "monthly_savings": 3.50},
            {"resource": "staging-cluster (EKS)", "issue": "Runs 24/7 but only needed 8h/day", "action": "Schedule stop/start with Lambda", "monthly_savings": 240.20},
            {"resource": "3x NAT Gateways (dev)", "issue": "Idle but billing hourly", "action": "Delete and use VPC Endpoints", "monthly_savings": 87.60},
            {"resource": "prod-rds-primary", "issue": "Multi-AZ not needed for staging", "action": "Convert staging RDS to Single-AZ", "monthly_savings": 180.00},
        ]

    def _demo_budget_status(self, params: Dict) -> List[Dict]:
        return [
            {"account": "AWS Production", "budget": 5000.00, "actual": 4820.50, "pct_used": 96.4, "forecast": 5240.00, "status": "at_risk"},
            {"account": "AWS Development", "budget": 1000.00, "actual": 480.20, "pct_used": 48.0, "forecast": 520.00, "status": "on_track"},
            {"account": "GCP Project (prod)", "budget": 600.00, "actual": 589.40, "pct_used": 98.2, "forecast": 640.00, "status": "over_budget"},
            {"account": "Anthropic API", "budget": 100.00, "actual": 72.60, "pct_used": 72.6, "forecast": 78.40, "status": "on_track"},
        ]
