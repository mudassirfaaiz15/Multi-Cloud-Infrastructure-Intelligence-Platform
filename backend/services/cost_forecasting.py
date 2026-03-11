"""
Cost Forecasting Engine
Uses linear regression to predict future cloud spend.
"""

import logging
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime, timedelta
import math

logger = logging.getLogger(__name__)


# ============================================================================
# SIMPLE LINEAR REGRESSION (no external deps needed)
# ============================================================================

def linear_regression(x: List[float], y: List[float]) -> Tuple[float, float]:
    """Compute slope and intercept for simple linear regression."""
    n = len(x)
    if n < 2:
        return 0.0, y[0] if y else 0.0

    mean_x = sum(x) / n
    mean_y = sum(y) / n

    numerator = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
    denominator = sum((x[i] - mean_x) ** 2 for i in range(n))

    slope = numerator / denominator if denominator != 0 else 0.0
    intercept = mean_y - slope * mean_x
    return slope, intercept


def compute_std_dev(y: List[float], slope: float, intercept: float, x: List[float]) -> float:
    """Compute standard deviation of regression residuals."""
    n = len(y)
    if n < 2:
        return 0.0
    residuals = [(y[i] - (slope * x[i] + intercept)) ** 2 for i in range(n)]
    return math.sqrt(sum(residuals) / (n - 1))


# ============================================================================
# FORECAST ENGINE CLASS
# ============================================================================

class CostForecastingEngine:
    """
    Predicts future cloud costs using linear regression on historical data.
    """

    def forecast(
        self,
        historical_costs: List[Dict[str, Any]],
        forecast_months: int = 12,
    ) -> Dict[str, Any]:
        """
        Generate cost forecasts from historical monthly data.

        Args:
            historical_costs: List of { "month": "Jan", "cost": 1200.0 } dicts
            forecast_months: How many months to predict (3, 6, or 12)

        Returns:
            Forecast dict with predictions, trends, and confidence intervals.
        """
        if not historical_costs:
            historical_costs = self._demo_historical_costs()

        costs = [float(d.get("cost", 0)) for d in historical_costs]
        n = len(costs)

        if n == 0:
            return {"success": False, "error": "No historical data provided"}

        # Use index as X axis for regression
        x = list(range(n))
        slope, intercept = linear_regression(x, costs)
        std_dev = compute_std_dev(costs, slope, intercept, x)

        # Predict future months
        last_month_idx = n - 1
        predictions = []

        # Build future month labels
        future_labels = self._generate_future_labels(historical_costs, forecast_months)

        for i, (label, month_offset) in enumerate(zip(future_labels, range(1, forecast_months + 1))):
            future_x = last_month_idx + month_offset
            predicted = slope * future_x + intercept
            predicted = max(0.0, predicted)  # No negative costs

            # 90% confidence interval ≈ 1.645 * std_dev
            margin = 1.645 * std_dev
            predictions.append({
                "month": label,
                "predicted_cost": round(predicted, 2),
                "lower_bound": round(max(0.0, predicted - margin), 2),
                "upper_bound": round(predicted + margin, 2),
                "confidence": "90%",
            })

        # Summary by horizon
        horizon_3m = round(sum(p["predicted_cost"] for p in predictions[:3]), 2)
        horizon_6m = round(sum(p["predicted_cost"] for p in predictions[:6]), 2)
        horizon_12m = round(sum(p["predicted_cost"] for p in predictions[:12]), 2)

        # Annualized trend
        current_monthly = costs[-1] if costs else 0
        trend_pct = round((slope / current_monthly * 100), 1) if current_monthly > 0 else 0.0

        return {
            "success": True,
            "historical": historical_costs,
            "predictions": predictions,
            "summary": {
                "current_monthly": round(current_monthly, 2),
                "trend_pct_per_month": trend_pct,
                "next_3_months_total": horizon_3m,
                "next_6_months_total": horizon_6m,
                "next_12_months_total": horizon_12m,
                "next_month_estimate": predictions[0]["predicted_cost"] if predictions else 0.0,
            },
            "regression": {
                "slope": round(slope, 4),
                "intercept": round(intercept, 4),
                "std_dev": round(std_dev, 4),
            },
            "timestamp": datetime.utcnow().isoformat(),
        }

    def _generate_future_labels(
        self,
        historical: List[Dict[str, Any]],
        n_months: int,
    ) -> List[str]:
        """Generate month labels for future predictions."""
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

        # Try to determine last month from historical data
        last_label = historical[-1].get("month", "Jan") if historical else "Jan"
        try:
            last_idx = months.index(last_label)
        except ValueError:
            last_idx = 0

        labels = []
        for i in range(1, n_months + 1):
            labels.append(months[(last_idx + i) % 12])
        return labels

    def _demo_historical_costs(self) -> List[Dict[str, Any]]:
        """Demo historical cost data for testing."""
        return [
            {"month": "Aug", "cost": 3660},
            {"month": "Sep", "cost": 3890},
            {"month": "Oct", "cost": 3720},
            {"month": "Nov", "cost": 4100},
            {"month": "Dec", "cost": 4350},
            {"month": "Jan", "cost": 4580},
        ]

    def forecast_by_provider(
        self,
        provider_history: Dict[str, List[Dict[str, Any]]],
        forecast_months: int = 6,
    ) -> Dict[str, Any]:
        """
        Forecast costs separately for each cloud provider.

        Args:
            provider_history: { "aws": [...], "gcp": [...], "claude": [...] }
            forecast_months: Months to forecast
        """
        results = {}
        for provider, history in provider_history.items():
            results[provider] = self.forecast(history, forecast_months)

        return {
            "success": True,
            "by_provider": results,
            "forecast_months": forecast_months,
            "timestamp": datetime.utcnow().isoformat(),
        }
