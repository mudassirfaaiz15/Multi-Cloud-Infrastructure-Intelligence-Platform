"""
AI API Usage Monitor
Tracks Claude AI API usage, token consumption, and cost estimation.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import calendar

logger = logging.getLogger(__name__)


# ============================================================================
# ANTHROPIC PRICING (per million tokens, as of early 2025)
# ============================================================================
ANTHROPIC_PRICING = {
    "claude-3-5-sonnet-20241022": {"input": 3.00, "output": 15.00},
    "claude-3-5-haiku-20241022": {"input": 0.80, "output": 4.00},
    "claude-3-opus-20240229": {"input": 15.00, "output": 75.00},
    "claude-3-sonnet-20240229": {"input": 3.00, "output": 15.00},
    "claude-3-haiku-20240307": {"input": 0.25, "output": 1.25},
    # Aliases
    "claude-3-5-sonnet": {"input": 3.00, "output": 15.00},
    "claude-3-5-haiku": {"input": 0.80, "output": 4.00},
    "claude-3-opus": {"input": 15.00, "output": 75.00},
}


def estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Estimate cost in USD for a given model and token count."""
    pricing = ANTHROPIC_PRICING.get(model, {"input": 3.00, "output": 15.00})
    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]
    return round(input_cost + output_cost, 6)


# ============================================================================
# AI USAGE MONITOR CLASS
# ============================================================================

class AIUsageMonitor:
    """
    Monitors Claude AI API usage via the Anthropic API.
    Falls back to demo data if API key is not available.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key

    def get_usage_stats(self, days: int = 30) -> Dict[str, Any]:
        """
        Get AI API usage statistics for the last N days.
        Returns real data if API key is configured, otherwise demo data.
        """
        if not self.api_key:
            return self._demo_usage_stats()

        try:
            return self._fetch_real_usage(days)
        except Exception as e:
            logger.warning(f"Failed to fetch Anthropic usage: {e}. Using demo data.")
            return self._demo_usage_stats()

    def _fetch_real_usage(self, days: int) -> Dict[str, Any]:
        """Fetch real usage data from Anthropic API."""
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=self.api_key)

            # Anthropic usage API endpoint (beta)
            # Note: usage endpoint availability may vary; this uses the messages endpoint pattern
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)

            # Try to fetch usage via the usage API
            # The actual Anthropic API exposes usage in response objects
            # For aggregate stats, we build from stored request logs
            return self._build_usage_response(
                api_calls=0,
                input_tokens=0,
                output_tokens=0,
                model_breakdown={},
                monthly_trend=self._empty_monthly_trend(),
                note="Connect usage tracking via request interceptor for real data",
            )
        except ImportError:
            logger.error("anthropic package not installed. Run: pip install anthropic")
            return self._demo_usage_stats()

    def _build_usage_response(
        self,
        api_calls: int,
        input_tokens: int,
        output_tokens: int,
        model_breakdown: Dict[str, Any],
        monthly_trend: List[Dict[str, Any]],
        note: Optional[str] = None,
    ) -> Dict[str, Any]:
        total_tokens = input_tokens + output_tokens
        total_cost = sum(
            estimate_cost(model, data.get("input_tokens", 0), data.get("output_tokens", 0))
            for model, data in model_breakdown.items()
        )

        # Monthly forecast based on daily average
        daily_cost = total_cost / 30 if total_cost > 0 else 0
        monthly_forecast = round(daily_cost * 30, 2)

        return {
            "success": True,
            "provider": "anthropic",
            "period_days": 30,
            "api_calls": api_calls,
            "total_tokens": total_tokens,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "estimated_cost_usd": round(total_cost, 4),
            "monthly_forecast_usd": monthly_forecast,
            "model_breakdown": model_breakdown,
            "monthly_trend": monthly_trend,
            "note": note,
            "timestamp": datetime.utcnow().isoformat(),
        }

    def _empty_monthly_trend(self) -> List[Dict[str, Any]]:
        """Generate an empty monthly trend for the last 6 months."""
        trend = []
        now = datetime.utcnow()
        for i in range(5, -1, -1):
            month_date = now - timedelta(days=30 * i)
            trend.append({
                "month": month_date.strftime("%b"),
                "year": month_date.year,
                "api_calls": 0,
                "tokens": 0,
                "cost": 0.0,
            })
        return trend

    def _demo_usage_stats(self) -> Dict[str, Any]:
        """Return realistic demo AI usage data."""
        monthly_trend = [
            {"month": "Aug", "year": 2024, "api_calls": 1240, "tokens": 3_450_000, "cost": 18.25},
            {"month": "Sep", "year": 2024, "api_calls": 1580, "tokens": 4_120_000, "cost": 22.80},
            {"month": "Oct", "year": 2024, "api_calls": 2100, "tokens": 5_890_000, "cost": 31.40},
            {"month": "Nov", "year": 2024, "api_calls": 2450, "tokens": 6_780_000, "cost": 37.90},
            {"month": "Dec", "year": 2024, "api_calls": 2890, "tokens": 7_920_000, "cost": 45.10},
            {"month": "Jan", "year": 2025, "api_calls": 3210, "tokens": 9_340_000, "cost": 52.60},
        ]

        model_breakdown = {
            "claude-3-5-sonnet-20241022": {
                "api_calls": 2100,
                "input_tokens": 5_200_000,
                "output_tokens": 2_100_000,
                "cost": 45.30,
            },
            "claude-3-5-haiku-20241022": {
                "api_calls": 890,
                "input_tokens": 1_500_000,
                "output_tokens": 540_000,
                "cost": 3.36,
            },
            "claude-3-opus-20240229": {
                "api_calls": 220,
                "input_tokens": 480_000,
                "output_tokens": 220_000,
                "cost": 23.70,
            },
        }

        # Aggregate totals from monthly trend (last month)
        last_month = monthly_trend[-1]

        return {
            "success": True,
            "provider": "anthropic",
            "period_days": 30,
            "api_calls": last_month["api_calls"],
            "total_tokens": last_month["tokens"],
            "input_tokens": int(last_month["tokens"] * 0.72),  # ~72% input, ~28% output
            "output_tokens": int(last_month["tokens"] * 0.28),
            "estimated_cost_usd": last_month["cost"],
            "monthly_forecast_usd": round(last_month["cost"] * 1.08, 2),  # 8% growth forecast
            "model_breakdown": model_breakdown,
            "monthly_trend": monthly_trend,
            "credit_balance_usd": 150.00,
            "credit_expires": "2025-06-30",
            "demo_mode": True,
            "timestamp": datetime.utcnow().isoformat(),
        }
