"""
Production Configuration Management
Centralized configuration for all services
"""

import os
from datetime import timedelta
from typing import Optional

class Config:
    """Base configuration"""
    
    # Flask
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    ENV = os.getenv("FLASK_ENV", "production")
    
    # Database
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql://user:password@localhost:5432/console_sensei"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = os.getenv("SQL_ECHO", "false").lower() == "true"
    
    # Connection Pool
    DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", 20))
    DB_MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", 40))
    DB_POOL_RECYCLE = int(os.getenv("DB_POOL_RECYCLE", 3600))
    
    # JWT
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-secret-key")
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", 24))
    JWT_REFRESH_EXPIRATION_DAYS = int(os.getenv("JWT_REFRESH_EXPIRATION_DAYS", 30))
    
    # AWS
    AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
    AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
    AWS_ACCOUNT_ID = os.getenv("AWS_ACCOUNT_ID")
    
    # AI Providers
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    CLAUDE_DEFAULT_MODEL = os.getenv("CLAUDE_DEFAULT_MODEL", "claude-3-5-sonnet-20241022")
    OPENAI_DEFAULT_MODEL = os.getenv("OPENAI_DEFAULT_MODEL", "gpt-4-turbo")
    
    # Redis
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    REDIS_CACHE_TTL = int(os.getenv("REDIS_CACHE_TTL", 3600))
    
    # CORS
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    
    # WebSocket
    WEBSOCKET_ENABLED = os.getenv("WEBSOCKET_ENABLED", "true").lower() == "true"
    WEBSOCKET_PING_INTERVAL = int(os.getenv("WEBSOCKET_PING_INTERVAL", 30))
    WEBSOCKET_PING_TIMEOUT = int(os.getenv("WEBSOCKET_PING_TIMEOUT", 10))
    
    # Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Features
    FEATURE_REAL_TIME_MONITORING = os.getenv("FEATURE_REAL_TIME_MONITORING", "true").lower() == "true"
    FEATURE_MULTI_LLM = os.getenv("FEATURE_MULTI_LLM", "true").lower() == "true"
    FEATURE_COST_FORECASTING = os.getenv("FEATURE_COST_FORECASTING", "true").lower() == "true"
    FEATURE_ANOMALY_DETECTION = os.getenv("FEATURE_ANOMALY_DETECTION", "true").lower() == "true"
    FEATURE_SECURITY_HUB = os.getenv("FEATURE_SECURITY_HUB", "true").lower() == "true"
    FEATURE_CLOUDTRAIL = os.getenv("FEATURE_CLOUDTRAIL", "true").lower() == "true"
    
    # Rate Limiting
    RATELIMIT_STORAGE_URL = os.getenv("RATELIMIT_STORAGE_URL", "memory://")
    
    @staticmethod
    def validate():
        """Validate critical configuration"""
        errors = []
        
        if not Config.DATABASE_URL:
            errors.append("DATABASE_URL not configured")
        
        if not Config.AWS_ACCESS_KEY_ID:
            errors.append("AWS_ACCESS_KEY_ID not configured")
        
        if not Config.AWS_SECRET_ACCESS_KEY:
            errors.append("AWS_SECRET_ACCESS_KEY not configured")
        
        if not Config.ANTHROPIC_API_KEY and not Config.OPENAI_API_KEY:
            errors.append("At least one AI provider key required (ANTHROPIC_API_KEY or OPENAI_API_KEY)")
        
        if errors:
            raise ValueError("Configuration errors:\n" + "\n".join(errors))
        
        return True


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    ENV = "development"
    SQLALCHEMY_ECHO = True


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    ENV = "production"
    SQLALCHEMY_ECHO = False


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DATABASE_URL = "sqlite:///:memory:"
    SQLALCHEMY_ECHO = True


def get_config() -> Config:
    """Get configuration based on environment"""
    env = os.getenv("FLASK_ENV", "production")
    
    if env == "development":
        return DevelopmentConfig()
    elif env == "testing":
        return TestingConfig()
    else:
        return ProductionConfig()
