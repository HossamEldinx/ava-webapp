import os
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

_supabase_client: Optional[Client] = None

def get_supabase_client() -> Client:
    """Get or create Supabase client instance."""
    global _supabase_client
    if _supabase_client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY environment variables must be set")
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase_client

# For backward compatibility with SQLAlchemy-based code
# This is a dummy Base class that won't be used but prevents import errors
class DummyBase:
    """Dummy base class for backward compatibility."""
    pass

Base = DummyBase

def get_db():
    """
    Dummy function for backward compatibility.
    In Supabase setup, use get_supabase_client() instead.
    """
    return get_supabase_client()