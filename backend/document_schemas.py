from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime, timezone

DocumentType = Literal[
    "education_certificate",
    "marksheet",
    "resume",
    "employment_document",
    "healthcare_document",
    "finance_document",
    "identity_document",
    "general_document",
    "unknown"
]

ClaimStatus = Literal[
    "PROPOSED",
    "MATCH",
    "CONFLICT",
    "SUPERSEDES",
    "REJECTED",
    "CONFIRMED"
]

class SourceRegion(BaseModel):
    page: Optional[int] = 1
    bounding_box: Optional[Dict[str, float]] = None
    line_number: Optional[int] = None

class ConflictDetails(BaseModel):
    field_name: str
    existing_value: str
    existing_source: str
    conflicting_value: str
    conflicting_source: str
    detected_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ClaimProposal(BaseModel):
    field: str
    canonical_field_name: Optional[str] = None
    value: str
    confidence: float = Field(ge=0.0, le=1.0, description="Extraction confidence signal from AI model. Not an assurance of truth.")
    category: str = "identity"
    is_singular: bool = False
    is_sensitive: bool = False
    raw_numeric_value: Optional[float] = None
    source_region: Optional[SourceRegion] = Field(default_factory=lambda: SourceRegion(page=1))
    extraction_method: str = "Hugging Face Document Intelligence"
    model_identifier: Optional[str] = None
    status: ClaimStatus = "PROPOSED"
    conflict_info: Optional[ConflictDetails] = None
    assurance_level: str = "LEVEL_2_EVIDENCE_ATTACHED"
    evidence_doc_name: Optional[str] = None
    evidence_doc_hash: Optional[str] = None

class ExtractionMetadata(BaseModel):
    provider: str
    model: str
    processing_time_ms: int
    char_count: int
    page_count: int
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    fallback_used: bool = False

class DocumentExtractionProposal(BaseModel):
    document_id: str
    file_name: str
    category: str
    file_size: str
    sha256_hash: str
    document_type: DocumentType = "general_document"
    language: str = "en"
    status: Literal["NEEDS_REVIEW", "READY_FOR_CONFIRMATION", "FAILED", "CONFIRMED"] = "NEEDS_REVIEW"
    provider: str = "huggingface"
    model: str = "Qwen/Qwen2.5-Coder-32B-Instruct"
    claims: List[ClaimProposal] = Field(default_factory=list)
    extraction_metadata: ExtractionMetadata
    error_message: Optional[str] = None

class ConfirmedClaimItem(BaseModel):
    field: str
    value: str
    category: Optional[str] = "identity"
    is_singular: Optional[bool] = False
    is_sensitive: Optional[bool] = False
    raw_numeric_value: Optional[float] = None

class ConfirmClaimsRequest(BaseModel):
    document_id: str
    accepted_claims: List[ConfirmedClaimItem]
    rejected_claim_fields: Optional[List[str]] = Field(default_factory=list)
