from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

# Category Schemas
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = None

class CategoryCreate(CategoryBase):
    user_id: str

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None

class Category(CategoryBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# BOQ Schemas
class BoqBase(BaseModel):
    name: str
    description: Optional[str] = None

# AI Cost Claim Analysis Schemas
class OnlvJsonRequest(BaseModel):
    """Request schema for ONLV JSON data"""
    onlv_data: Dict[str, Any]
    search_terms: Optional[List[str]] = None
    model_name: Optional[str] = "flash"

class QuickClaimCheckRequest(BaseModel):
    """Request schema for quick claim check"""
    onlv_data: Dict[str, Any]

class FullAnalysisRequest(BaseModel):
    """Request schema for full BoQ analysis"""
    onlv_data: Dict[str, Any]
    search_terms: Optional[List[str]] = None
    model_name: Optional[str] = "flash"

class IdentifiedRisk(BaseModel):
    """Schema for identified risk in analysis"""
    json_location: str
    position_description: str
    matched_claim_id: Optional[str] = None
    claim_title: Optional[str] = None
    risk_reason: str
    prevention_action: str
    confidence_level: str
    requires_additional_position: bool

class MissingPosition(BaseModel):
    """Schema for missing position recommendation"""
    claim_prevention_reason: str
    work_category: str
    suggested_description: str
    integration_location: str
    estimated_impact: str

class AnalysisSummary(BaseModel):
    """Schema for analysis summary statistics"""
    total_positions_analyzed: int
    potential_claims_found: int
    missing_positions_identified: int
    risk_assessment: str

class AnalysisMetadata(BaseModel):
    """Schema for analysis metadata"""
    model_used: str
    analysis_timestamp: str
    positions_analyzed: int
    claims_referenced: int

class FullAnalysisResponse(BaseModel):
    """Response schema for full BoQ analysis"""
    success: bool
    analysis_summary: AnalysisSummary
    identified_risks: List[IdentifiedRisk]
    missing_positions: List[MissingPosition]
    recommendations: List[str]
    analysis_metadata: AnalysisMetadata
    error: Optional[str] = None

class QuickClaimCheckResponse(BaseModel):
    """Response schema for quick claim check"""
    success: bool
    risk_level: str
    risks_found: int
    missing_positions: int
    quick_recommendations: List[str]
    analysis_timestamp: str
    summary: str
    error: Optional[str] = None

class SystemInfo(BaseModel):
    """Schema for system information"""
    system_name: str
    version: str
    capabilities: List[str]
    available_models: Dict[str, Any]
    supported_formats: List[str]
    database_integration: List[str]
    api_endpoints: List[str]

class ClaimPreventionInfoResponse(BaseModel):
    """Response schema for claim prevention info"""
    system_info: SystemInfo

# Cost Claim Schemas
class CostClaimBase(BaseModel):
    title: str
    description: str
    cause: str
    prevention_strategy: str

class CostClaimCreate(CostClaimBase):
    pass

class CostClaimUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    cause: Optional[str] = None
    prevention_strategy: Optional[str] = None

class CostClaim(CostClaimBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True