# models.py
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid

# Note: Since we're using Supabase directly, SQLAlchemy models are not needed
# All database operations are handled through Supabase client in services
# The Regulation model below is kept as a Pydantic model for API responses if needed

class RegulationResponse(BaseModel):
    """Pydantic model for Regulation API responses."""
    id: int
    entity_type: str
    lg_nr: Optional[str] = None
    ulg_nr: Optional[str] = None
    grundtext_nr: Optional[str] = None
    position_nr: Optional[str] = None
    searchable_text: str
    entity_json: Optional[str] = None
    created_at: Optional[str] = None
    full_nr: Optional[str] = None
    short_text: Optional[str] = None

class SearchQuery(BaseModel):
    """The request model for the /search endpoint."""
    query: str
    match_threshold: float = 0.75
    match_count: int = 5

class SearchResult(BaseModel):
    """A single search result."""
    id: int
    entity_type: str
    lg_nr: Optional[str] = None
    ulg_nr: Optional[str] = None
    grundtext_nr: Optional[str] = None
    position_nr: Optional[str] = None
    searchable_text: str
    entity_json: Dict[str, Any]
    similarity: float

class SearchResponse(BaseModel):
    """The response model for the /search endpoint."""
    results: List[SearchResult]

class PositionExplanationRequest(BaseModel):
    """Request model for position explanation endpoint."""
    position_text: str
    context: Optional[str] = None

class MultiplePositionsRequest(BaseModel):
    """Request model for multiple positions explanation."""
    positions: List[str]
    context: Optional[str] = None

class PositionSummaryRequest(BaseModel):
    """Request model for position summary endpoint."""
    position_text: str

class PositionExplanationResponse(BaseModel):
    """Response model for position explanation."""
    success: bool
    explanation: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    raw_response: Optional[str] = None
    input_text: str
    context: Optional[str] = None

class MultiplePositionsResponse(BaseModel):
    """Response model for multiple positions explanation."""
    success: bool
    total_positions: int
    successful_explanations: int
    explanations: List[Dict[str, Any]]
    context: Optional[str] = None

class PositionSummaryResponse(BaseModel):
    """Response model for position summary."""
    success: bool
    summary: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    input_text: str

# Smart Chat Models
class SmartChatRequest(BaseModel):
    """Request model for smart chat endpoint."""
    query: str
    context: Optional[str] = None

class SmartChatResponse(BaseModel):
    """Response model for smart chat endpoint."""
    query: str
    intent: Dict[str, Any]
    response: Dict[str, Any]
    routing_decision: str
    processing_time: Optional[float] = None
    services_used: List[str] = []

class IntentClassification(BaseModel):
    """Model for intent classification result."""
    primary_intent: str
    confidence: float
    extracted_entities: Dict[str, Any]
    suggested_routing: str
    reasoning: str
    query_language: str
    timestamp: str
    classifier_version: str
    success: bool
    fallback_used: Optional[bool] = None

# Custom Content Models
class CustomContentRequest(BaseModel):
    """Request model for adding custom content to LG structure."""
    position_nr: str
    custom_json: Dict[str, Any]
    content_type: Optional[str] = "auto"  # "grundtext", "folgeposition", or "auto"

class CustomContentResponse(BaseModel):
    """Response model for custom content addition."""
    success: bool
    position_nr: str
    content_type: str
    lg_json: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    message: str

