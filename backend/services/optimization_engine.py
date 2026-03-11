"""
Resource Optimization Engine
Detects underutilized resources and generates savings recommendations.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


RECOMMENDATION_CATEGORIES = {
    "underutilized_compute": "Underutilized Compute",
    "unused_storage": "Unused Storage",
    "idle_database": "Idle Database",
    "unused_ai_budget": "Unused AI Budget",
    "reserved_instance": "Reserved Instance Opportunity",
    "unattached_resource": "Unattached Resource",
}


def make_recommendation(
    rec_id: str,
    title: str,
    description: str,
    category: str,
    monthly_savings: float,
    impact: str,
    provider: str,
    resource_id: Optional[str] = None,
    action: Optional[str] = None,
) -> Dict[str, Any]:
    return {
        "id": rec_id,
        "title": title,
        "description": description,
        "category": RECOMMENDATION_CATEGORIES.get(category, category),
        "monthly_savings": round(monthly_savings, 2),
        "impact": impact,
        "provider": provider,
        "resource_id": resource_id,
        "action": action or "Review and apply",
        "created_at": datetime.utcnow().isoformat(),
    }


class ResourceOptimizationEngine:
    """
    Analyzes cloud resource usage across providers and generates
    actionable cost-saving recommendations.
    """

    def __init__(self):
        pass

    def analyze(
        self,
        aws_resources: Optional[List[Dict[str, Any]]] = None,
        gcp_resources: Optional[List[Dict[str, Any]]] = None,
        ai_usage: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Analyze resources across all providers and return recommendations.
        Uses demo recommendations if no data is provided.
        """
        recommendations: List[Dict[str, Any]] = []

        if aws_resources:
            recommendations.extend(self._analyze_aws(aws_resources))
        if gcp_resources:
            recommendations.extend(self._analyze_gcp(gcp_resources))
        if ai_usage:
            recommendations.extend(self._analyze_ai_usage(ai_usage))

        # If no real data provided, use demo recommendations
        if not recommendations:
            recommendations = self._demo_recommendations()

        total_savings = sum(r["monthly_savings"] for r in recommendations)
        recommendations_sorted = sorted(recommendations, key=lambda r: r["monthly_savings"], reverse=True)

        return {
            "success": True,
            "total_recommendations": len(recommendations_sorted),
            "total_potential_savings": round(total_savings, 2),
            "recommendations": recommendations_sorted,
            "by_provider": self._group_by_provider(recommendations_sorted),
            "by_impact": self._group_by_impact(recommendations_sorted),
            "timestamp": datetime.utcnow().isoformat(),
        }

    def _analyze_aws(self, resources: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Detect optimization opportunities in AWS resources."""
        recs = []
        for i, resource in enumerate(resources):
            rtype = resource.get("resource_type", "")
            name = resource.get("name", resource.get("id", "unknown"))
            state = resource.get("state", "").lower()
            cost = resource.get("cost_estimate", 0.0)

            if rtype == "EC2_Instance" and state == "running":
                # Flag instances as potentially underutilized (in production, check CloudWatch metrics)
                if cost > 100:
                    recs.append(make_recommendation(
                        rec_id=f"aws-compute-{i}",
                        title=f"Right-size EC2 instance: {name}",
                        description=f"Instance {name} may be overprovisioned. Consider downgrading instance type.",
                        category="underutilized_compute",
                        monthly_savings=cost * 0.35,
                        impact="medium",
                        provider="aws",
                        resource_id=resource.get("id"),
                        action="Downsize instance type to save ~35%",
                    ))

            elif rtype in ("EBS_Volume", "EBS") and state in ("available", "unused"):
                recs.append(make_recommendation(
                    rec_id=f"aws-storage-{i}",
                    title=f"Delete unattached EBS volume: {name}",
                    description="This EBS volume is not attached to any instance.",
                    category="unattached_resource",
                    monthly_savings=cost,
                    impact="low",
                    provider="aws",
                    resource_id=resource.get("id"),
                    action="Delete or snapshot and delete",
                ))

            elif rtype == "ElasticIP" and state in ("unused", "unattached"):
                recs.append(make_recommendation(
                    rec_id=f"aws-eip-{i}",
                    title=f"Release unused Elastic IP: {name}",
                    description="Unused Elastic IPs incur charges (~$3.60/month each).",
                    category="unattached_resource",
                    monthly_savings=3.60,
                    impact="low",
                    provider="aws",
                    resource_id=resource.get("id"),
                    action="Release Elastic IP",
                ))

        return recs

    def _analyze_gcp(self, resources: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Detect optimization opportunities in GCP resources."""
        recs = []
        for i, resource in enumerate(resources):
            rtype = resource.get("resource_type", "")
            name = resource.get("name", resource.get("id", "unknown"))
            state = resource.get("state", "").lower()
            cost = resource.get("cost_estimate", 0.0)

            if rtype == "GCP_ComputeInstance" and state == "terminated":
                recs.append(make_recommendation(
                    rec_id=f"gcp-compute-{i}",
                    title=f"Delete terminated GCP VM: {name}",
                    description="Terminated VMs still incur disk storage costs.",
                    category="unused_storage",
                    monthly_savings=cost * 0.1,
                    impact="low",
                    provider="gcp",
                    resource_id=resource.get("id"),
                    action="Delete the VM and its persistent disks",
                ))

            elif rtype == "GCP_ComputeInstance" and state == "running" and cost > 80:
                recs.append(make_recommendation(
                    rec_id=f"gcp-resize-{i}",
                    title=f"Consider committed use discount for: {name}",
                    description="1-year committed use can save up to 37% on GCP Compute.",
                    category="reserved_instance",
                    monthly_savings=cost * 0.37,
                    impact="high",
                    provider="gcp",
                    resource_id=resource.get("id"),
                    action="Purchase 1-year committed use discount",
                ))

        return recs

    def _analyze_ai_usage(self, ai_usage: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Detect optimization opportunities in AI API usage."""
        recs = []
        cost = ai_usage.get("estimated_cost_usd", 0.0)
        model_breakdown = ai_usage.get("model_breakdown", {})

        # Check if expensive Opus model is used for tasks Sonnet could handle
        opus_data = model_breakdown.get("claude-3-opus-20240229", {})
        opus_calls = opus_data.get("api_calls", 0)
        if opus_calls > 50:
            opus_cost = opus_data.get("cost", 0.0)
            recs.append(make_recommendation(
                rec_id="ai-model-downgrade",
                title="Switch Claude 3 Opus to Claude 3.5 Sonnet",
                description=f"{opus_calls} Opus calls/month — Claude 3.5 Sonnet is 5x cheaper with better performance.",
                category="unused_ai_budget",
                monthly_savings=opus_cost * 0.60,
                impact="medium",
                provider="claude",
                action="Update API calls to use claude-3-5-sonnet-20241022",
            ))

        return recs

    def _demo_recommendations(self) -> List[Dict[str, Any]]:
        """Return demo optimization recommendations."""
        return [
            make_recommendation(
                "aws-rec-1", "Right-size EC2 prod-api-server",
                "Instance has <15% average CPU over last 30 days. Downsize from m5.large to m5.medium.",
                "underutilized_compute", 120.0, "high", "aws",
                "i-0abc123def456", "Downsize instance type → save $120/month",
            ),
            make_recommendation(
                "aws-rec-2", "Switch to Reserved Instances for prod-web-server",
                "2 EC2 instances running 24/7. 1-year Reserved Instances save 40%.",
                "reserved_instance", 580.0, "high", "aws",
                None, "Purchase 1-year Standard Reserved Instances",
            ),
            make_recommendation(
                "aws-rec-3", "Delete 5 unattached EBS volumes",
                "5 EBS volumes not attached to any instance, costing $25/month combined.",
                "unattached_resource", 25.0, "low", "aws",
                None, "Snapshot and delete unattached volumes",
            ),
            make_recommendation(
                "aws-rec-4", "Release 3 unused Elastic IPs",
                "3 Elastic IPs unattached to instances, costing $3.60 each/month.",
                "unattached_resource", 10.80, "low", "aws",
                None, "Release unused Elastic IP addresses",
            ),
            make_recommendation(
                "aws-rec-5", "Delete unused NAT Gateway",
                "NAT Gateway in staging VPC has negligible traffic but costs $33/month.",
                "unattached_resource", 33.0, "medium", "aws",
                None, "Delete NAT Gateway and use VPC endpoints instead",
            ),
            make_recommendation(
                "gcp-rec-1", "Committed use discount for prod Compute Engine VMs",
                "2 GCP VMs running continuously. 1-year CUD saves up to 37%.",
                "reserved_instance", 94.0, "high", "gcp",
                None, "Purchase Compute Engine committed use discounts",
            ),
            make_recommendation(
                "gcp-rec-2", "Delete terminated staging VM and its disk",
                "Terminated VM 'staging-server' still incurs persistent disk storage costs.",
                "unused_storage", 4.80, "low", "gcp",
                "gcp-vm-003", "Delete VM and detached persistent disk",
            ),
            make_recommendation(
                "ai-rec-1", "Switch Claude 3 Opus to Claude 3.5 Sonnet",
                "220 Opus API calls/month. Claude 3.5 Sonnet is 5x cheaper with superior performance.",
                "unused_ai_budget", 14.20, "medium", "claude",
                None, "Update API calls to use claude-3-5-sonnet-20241022",
            ),
        ]

    def _group_by_provider(self, recs: List[Dict[str, Any]]) -> Dict[str, Any]:
        result: Dict[str, Any] = {}
        for r in recs:
            p = r["provider"]
            if p not in result:
                result[p] = {"count": 0, "total_savings": 0.0}
            result[p]["count"] += 1
            result[p]["total_savings"] = round(result[p]["total_savings"] + r["monthly_savings"], 2)
        return result

    def _group_by_impact(self, recs: List[Dict[str, Any]]) -> Dict[str, int]:
        result: Dict[str, int] = {"high": 0, "medium": 0, "low": 0}
        for r in recs:
            impact = r.get("impact", "low")
            result[impact] = result.get(impact, 0) + 1
        return result
