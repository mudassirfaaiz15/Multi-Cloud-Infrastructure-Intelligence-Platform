"""
Feature Flag System for Enterprise Extensibility
Manages experimental and future-scope features
"""

import os
from typing import Dict, List
from enum import Enum


class FeatureFlag(Enum):
    """Feature flags for platform capabilities"""
    
    # Core Features (Always Enabled)
    AWS_INTEGRATION = "aws_integration"
    CLAUDE_AI = "claude_ai"
    COST_ANALYSIS = "cost_analysis"
    SECURITY_AUDIT = "security_audit"
    CLOUDTRAIL_MONITORING = "cloudtrail_monitoring"
    
    # Experimental Features (Opt-in)
    GCP_SUPPORT = "gcp_support"
    AZURE_SUPPORT = "azure_support"
    WEBSOCKET_STREAMING = "websocket_streaming"
    ADVANCED_ANOMALY_DETECTION = "advanced_anomaly_detection"
    MULTI_LLM_SUPPORT = "multi_llm_support"
    
    # Future Roadmap (Disabled by default)
    TERRAFORM_INTEGRATION = "terraform_integration"
    KUBERNETES_MONITORING = "kubernetes_monitoring"
    SLACK_INTEGRATION = "slack_integration"
    ADVANCED_COMPLIANCE_REPORTING = "advanced_compliance_reporting"
    MOBILE_APP = "mobile_app"


class FeatureManager:
    """Manages feature flags and experimental features"""
    
    # Core features always enabled
    CORE_FEATURES = {
        FeatureFlag.AWS_INTEGRATION,
        FeatureFlag.CLAUDE_AI,
        FeatureFlag.COST_ANALYSIS,
        FeatureFlag.SECURITY_AUDIT,
        FeatureFlag.CLOUDTRAIL_MONITORING,
    }
    
    # Experimental features (can be enabled via env vars)
    EXPERIMENTAL_FEATURES = {
        FeatureFlag.GCP_SUPPORT,
        FeatureFlag.AZURE_SUPPORT,
        FeatureFlag.WEBSOCKET_STREAMING,
        FeatureFlag.ADVANCED_ANOMALY_DETECTION,
        FeatureFlag.MULTI_LLM_SUPPORT,
    }
    
    # Future roadmap features (disabled)
    ROADMAP_FEATURES = {
        FeatureFlag.TERRAFORM_INTEGRATION,
        FeatureFlag.KUBERNETES_MONITORING,
        FeatureFlag.SLACK_INTEGRATION,
        FeatureFlag.ADVANCED_COMPLIANCE_REPORTING,
        FeatureFlag.MOBILE_APP,
    }
    
    def __init__(self):
        """Initialize feature manager with environment configuration"""
        self._enabled_features = set(self.CORE_FEATURES)
        self._load_experimental_features()
    
    def _load_experimental_features(self) -> None:
        """Load experimental features from environment variables"""
        experimental_env = os.getenv("EXPERIMENTAL_FEATURES", "").split(",")
        
        for feature_name in experimental_env:
            feature_name = feature_name.strip().upper()
            if not feature_name:
                continue
            
            try:
                feature = FeatureFlag[feature_name]
                if feature in self.EXPERIMENTAL_FEATURES:
                    self._enabled_features.add(feature)
            except KeyError:
                pass
    
    def is_enabled(self, feature: FeatureFlag) -> bool:
        """Check if a feature is enabled"""
        return feature in self._enabled_features
    
    def enable_feature(self, feature: FeatureFlag) -> None:
        """Enable a feature at runtime"""
        if feature in self.EXPERIMENTAL_FEATURES or feature in self.CORE_FEATURES:
            self._enabled_features.add(feature)
    
    def disable_feature(self, feature: FeatureFlag) -> None:
        """Disable a feature at runtime (except core features)"""
        if feature not in self.CORE_FEATURES:
            self._enabled_features.discard(feature)
    
    def get_enabled_features(self) -> List[str]:
        """Get list of all enabled features"""
        return [f.value for f in self._enabled_features]
    
    def get_experimental_features(self) -> List[str]:
        """Get list of available experimental features"""
        return [f.value for f in self.EXPERIMENTAL_FEATURES]
    
    def get_roadmap_features(self) -> List[str]:
        """Get list of future roadmap features"""
        return [f.value for f in self.ROADMAP_FEATURES]
    
    def get_feature_status(self) -> Dict[str, Dict[str, bool]]:
        """Get comprehensive feature status"""
        return {
            "core": {f.value: True for f in self.CORE_FEATURES},
            "experimental": {f.value: self.is_enabled(f) for f in self.EXPERIMENTAL_FEATURES},
            "roadmap": {f.value: False for f in self.ROADMAP_FEATURES},
        }


# Global feature manager instance
feature_manager = FeatureManager()


def is_feature_enabled(feature: FeatureFlag) -> bool:
    """Convenience function to check if feature is enabled"""
    return feature_manager.is_enabled(feature)


def require_feature(feature: FeatureFlag):
    """Decorator to require a feature for endpoint access"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            if not feature_manager.is_enabled(feature):
                from flask import jsonify
                return jsonify({
                    "success": False,
                    "error": "Feature not enabled",
                    "message": f"Feature '{feature.value}' is not enabled in this deployment",
                    "status": 403
                }), 403
            return func(*args, **kwargs)
        wrapper.__name__ = func.__name__
        return wrapper
    return decorator
