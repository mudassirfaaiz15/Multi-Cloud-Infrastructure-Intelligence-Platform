#!/usr/bin/env python
"""
Production Setup Script
Initializes database, creates tables, verifies all services
"""

import os
import sys
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def print_header(text: str):
    """Print formatted header"""
    print("\n" + "="*70)
    print(f"  {text}")
    print("="*70 + "\n")

def print_success(text: str):
    """Print success message"""
    print(f"✅ {text}")

def print_error(text: str):
    """Print error message"""
    print(f"❌ {text}")

def print_warning(text: str):
    """Print warning message"""
    print(f"⚠️  {text}")

def print_info(text: str):
    """Print info message"""
    print(f"ℹ️  {text}")

# ============================================================================
# STEP 1: VERIFY ENVIRONMENT
# ============================================================================

def verify_environment():
    """Verify environment variables"""
    print_header("STEP 1: Verifying Environment Variables")
    
    required_vars = [
        "DATABASE_URL",
        "AWS_REGION",
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
    ]
    
    optional_vars = [
        "ANTHROPIC_API_KEY",
        "OPENAI_API_KEY",
    ]
    
    missing_required = []
    missing_optional = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_required.append(var)
        else:
            print_success(f"{var} configured")
    
    for var in optional_vars:
        if not os.getenv(var):
            missing_optional.append(var)
        else:
            print_success(f"{var} configured")
    
    if missing_optional:
        print_warning(f"Optional variables not set: {', '.join(missing_optional)}")
    
    if missing_required:
        print_error(f"Required variables not set: {', '.join(missing_required)}")
        return False
    
    print_success("All required environment variables configured")
    return True

# ============================================================================
# STEP 2: VERIFY DATABASE CONNECTION
# ============================================================================

def verify_database():
    """Verify database connection"""
    print_header("STEP 2: Verifying Database Connection")
    
    try:
        from database import verify_connection
        
        if verify_connection():
            print_success("Database connection verified")
            return True
        else:
            print_error("Database connection failed")
            return False
    
    except Exception as e:
        print_error(f"Database verification error: {str(e)}")
        return False

# ============================================================================
# STEP 3: INITIALIZE DATABASE
# ============================================================================

def initialize_database():
    """Initialize database tables"""
    print_header("STEP 3: Initializing Database Tables")
    
    try:
        from database import init_db
        
        if init_db():
            print_success("Database tables initialized")
            return True
        else:
            print_error("Database initialization failed")
            return False
    
    except Exception as e:
        print_error(f"Database initialization error: {str(e)}")
        return False

# ============================================================================
# STEP 4: VERIFY AWS INTEGRATION
# ============================================================================

def verify_aws_integration():
    """Verify AWS service integration"""
    print_header("STEP 4: Verifying AWS Integration")
    
    try:
        from services.aws_service import AWSServiceClient
        
        client = AWSServiceClient(region=os.getenv("AWS_REGION", "us-east-1"))
        print_success("AWS service client created")
        
        # Test EC2
        try:
            instances = client.get_ec2_instances(max_results=1)
            print_success(f"EC2 integration working (found {len(instances)} instances)")
        except Exception as e:
            print_warning(f"EC2 test: {str(e)}")
        
        # Test RDS
        try:
            databases = client.get_rds_instances(max_results=1)
            print_success(f"RDS integration working (found {len(databases)} databases)")
        except Exception as e:
            print_warning(f"RDS test: {str(e)}")
        
        # Test S3
        try:
            buckets = client.get_s3_buckets(max_results=1)
            print_success(f"S3 integration working (found {len(buckets)} buckets)")
        except Exception as e:
            print_warning(f"S3 test: {str(e)}")
        
        return True
    
    except Exception as e:
        print_error(f"AWS integration error: {str(e)}")
        return False

# ============================================================================
# STEP 5: VERIFY LLM INTEGRATION
# ============================================================================

def verify_llm_integration():
    """Verify LLM provider integration"""
    print_header("STEP 5: Verifying LLM Integration")
    
    try:
        from services.llm_provider import get_llm_router
        
        router = get_llm_router()
        providers = router.get_available_providers()
        
        if providers:
            print_success(f"LLM providers available: {', '.join(providers)}")
            
            for provider in providers:
                models = router.get_available_models(provider)
                print_info(f"  {provider}: {len(models)} models available")
            
            return True
        else:
            print_warning("No LLM providers configured")
            return False
    
    except Exception as e:
        print_error(f"LLM integration error: {str(e)}")
        return False

# ============================================================================
# STEP 6: VERIFY WEBSOCKET
# ============================================================================

def verify_websocket():
    """Verify WebSocket infrastructure"""
    print_header("STEP 6: Verifying WebSocket Infrastructure")
    
    try:
        from websocket_manager import get_connection_manager, get_event_broadcaster
        
        manager = get_connection_manager()
        broadcaster = get_event_broadcaster()
        
        print_success("WebSocket connection manager initialized")
        print_success("WebSocket event broadcaster initialized")
        
        return True
    
    except Exception as e:
        print_error(f"WebSocket verification error: {str(e)}")
        return False

# ============================================================================
# STEP 7: CREATE TEST USER
# ============================================================================

def create_test_user():
    """Create test user in database"""
    print_header("STEP 7: Creating Test User")
    
    try:
        from database import SessionLocal
        from db_models import User
        import bcrypt
        
        db = SessionLocal()
        try:
            # Check if test user exists
            existing = db.query(User).filter(User.email == "admin@test.local").first()
            if existing:
                print_info("Test user already exists")
                return True
            
            # Create test user
            password_hash = bcrypt.hashpw(b"test-password-123", bcrypt.gensalt()).decode()
            user = User(
                email="admin@test.local",
                password_hash=password_hash,
                full_name="Test Admin",
                role="admin",
                is_active=True,
                is_verified=True,
            )
            
            db.add(user)
            db.commit()
            
            print_success("Test user created: admin@test.local / test-password-123")
            return True
        
        finally:
            db.close()
    
    except Exception as e:
        print_error(f"Test user creation error: {str(e)}")
        return False

# ============================================================================
# MAIN SETUP FUNCTION
# ============================================================================

def main():
    """Run complete setup"""
    print("\n")
    print("╔" + "="*68 + "╗")
    print("║" + " "*68 + "║")
    print("║" + "  Console Sensei Cloud Ops - Production Setup".center(68) + "║")
    print("║" + " "*68 + "║")
    print("╚" + "="*68 + "╝")
    
    steps = [
        ("Environment Variables", verify_environment),
        ("Database Connection", verify_database),
        ("Database Initialization", initialize_database),
        ("AWS Integration", verify_aws_integration),
        ("LLM Integration", verify_llm_integration),
        ("WebSocket Infrastructure", verify_websocket),
        ("Test User", create_test_user),
    ]
    
    results = []
    
    for step_name, step_func in steps:
        try:
            result = step_func()
            results.append((step_name, result))
        except Exception as e:
            print_error(f"Step failed with exception: {str(e)}")
            results.append((step_name, False))
    
    # Print summary
    print_header("SETUP SUMMARY")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for step_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {step_name}")
    
    print(f"\nTotal: {passed}/{total} steps passed")
    
    if passed == total:
        print_success("All setup steps completed successfully!")
        print_info("You can now start the API server with: python api_v2.py")
        return 0
    else:
        print_error("Some setup steps failed. Please review the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
