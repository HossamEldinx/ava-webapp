"""
Configuration management for the AVA application.
This module handles environment variable loading and validation.
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ============================================================================
# REQUIRED ENVIRONMENT VARIABLES
# These variables MUST be set for the application to run
# ============================================================================

REQUIRED_ENV_VARS = {
    "GOOGLE_API_KEY": "Google Generative AI API Key for embeddings and chat",
    "SUPABASE_URL": "Supabase project URL for database",
    "SUPABASE_KEY": "Supabase API key for database access",
}

# ============================================================================
# OPTIONAL ENVIRONMENT VARIABLES
# These have default values if not set
# ============================================================================

OPTIONAL_ENV_VARS = {
    "ENVIRONMENT": "development",  # development, staging, production
    "FRONTEND_URL": "http://localhost:3000",  # Frontend URL for CORS
    "PORT": "8000",  # Server port
}


def validate_environment():
    """
    Validate that all required environment variables are set.
    
    Raises:
        ValueError: If any required environment variable is missing
    """
    missing_vars = []
    
    for var_name, var_description in REQUIRED_ENV_VARS.items():
        if not os.getenv(var_name):
            missing_vars.append(f"  - {var_name}: {var_description}")
    
    if missing_vars:
        error_msg = (
            "❌ Missing required environment variables:\n" +
            "\n".join(missing_vars) +
            "\n\nPlease set these variables in your .env file or as system environment variables."
        )
        raise ValueError(error_msg)
    
    print("✅ All required environment variables are configured")


def get_config() -> dict:
    """
    Get the application configuration.
    
    This function validates all required environment variables and returns
    a dictionary with both required and optional configuration values.
    
    Returns:
        dict: Configuration dictionary with all required and optional values
        
    Raises:
        ValueError: If any required environment variable is missing
    """
    # Validate required variables first
    validate_environment()
    
    config = {
        # Required variables
        "GOOGLE_API_KEY": os.getenv("GOOGLE_API_KEY"),
        "SUPABASE_URL": os.getenv("SUPABASE_URL"),
        "SUPABASE_KEY": os.getenv("SUPABASE_KEY"),
        # Optional variables with defaults
        "ENVIRONMENT": os.getenv("ENVIRONMENT", "development"),
        "FRONTEND_URL": os.getenv("FRONTEND_URL", "http://localhost:3000"),
        "PORT": int(os.getenv("PORT", "8000")),
    }
    
    return config


def get_environment() -> str:
    """Get the current environment (development, staging, production)."""
    return os.getenv("ENVIRONMENT", "development")


def is_production() -> bool:
    """Check if the application is running in production mode."""
    return get_environment() == "production"


def is_development() -> bool:
    """Check if the application is running in development mode."""
    return get_environment() == "development"


# ============================================================================
# Usage Example:
# ============================================================================
# In your main.py or other modules:
#
# from .config import get_config, validate_environment, is_production
#
# try:
#     config = get_config()
#     print(f"Running in {config['ENVIRONMENT']} mode")
# except ValueError as e:
#     print(f"Configuration error: {e}")
#     exit(1)
