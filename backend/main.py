from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn

from graph_store import GraphStore
from policy_engine import PolicyEngine
from document_agent import DocumentAgent
from query_agent import QueryAgent
from proof_composer import ProofComposer
from audit_logger import AuditLogger

app = FastAPI(
    title="SYNDEO API - Unified Life-Stage Digital Identity & Record Network",
    description="Production Graph Storage Engine, Document Ingestion, Policy Scope Enforcement, and Tamper-Evident Proofs.",
    version="1.0.0"
)

# Enable CORS for Next.js / Vite React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Graph & Security Services Singletons
graph_store = GraphStore(user_name="Indresh")
policy_engine = PolicyEngine()
document_agent = DocumentAgent()
query_agent = QueryAgent(graph_store)
proof_composer = ProofComposer(policy_engine)
audit_logger = AuditLogger()

# Seed initial audit log
audit_logger.log_event(
    action="SYSTEM_INIT",
    recipient="Vault Root",
    purpose="Initial Cryptographic Graph Setup",
    fields_accessed=["Core Vault Root"],
    assurance_status="SYSTEM_VERIFIED"
)

# --- Pydantic Data Models ---
class AddClaimRequest(BaseModel):
    category: str
    fieldName: str
    value: str
    source: Optional[str] = "Confirmed by you"
    evidenceDocName: Optional[str] = None
    isSingular: Optional[bool] = False

class QueryRequest(BaseModel):
    question: str

class ShareScopeRequest(BaseModel):
    recipient: str
    purpose: str
    requestedFields: List[Dict[str, Any]]
    expiryHours: Optional[int] = 24

# --- API Endpoints ---

@app.get("/api/health")
def health_check():
    integrity_ok, integrity_msg = audit_logger.verify_chain_integrity()
    return {
        "status": "online",
        "system": "SYNDEO Production Graph Engine",
        "auditChainStatus": integrity_msg,
        "activeNodesCount": len(graph_store.nodes),
        "sourceDocsCount": len(graph_store.documents)
    }

@app.get("/api/graph/records")
def get_records():
    """Returns all active personal memory claims from multi-hop graph."""
    return {"records": graph_store.get_all_records()}

@app.get("/api/graph/documents")
def get_documents():
    """Returns all evidence documents stored in object storage with hashes."""
    return {"documents": graph_store.get_all_documents()}

@app.post("/api/graph/claims")
def add_claim(req: AddClaimRequest):
    """Adds or updates a personal memory claim node with conflict detection & versioning."""
    node, conflict = graph_store.add_or_update_claim(
        category=req.category,
        field_name=req.fieldName,
        field_value=req.value,
        source=req.source or "Confirmed by you",
        evidence_doc_name=req.evidenceDocName,
        is_singular=req.isSingular or False
    )

    audit_logger.log_event(
        action="RECORD_COMMITTED",
        recipient="Personal Memory Store",
        purpose="User Confirmed Attribute Update",
        fields_accessed=[req.fieldName],
        assurance_status=node.assurance_level
    )

    return {
        "record": node.to_dict(),
        "conflict": conflict
    }

@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    category: Optional[str] = Form(None)
):
    """
    Production Document Ingestion:
    1. Reads PDF/Image bytes.
    2. Computes SHA-256 evidence hash.
    3. Runs AI extraction & category classification.
    4. Links evidence pointer to graph node.
    """
    content = await file.read()
    file_size_str = f"{round(len(content) / (1024 * 1024), 2)} MB" if len(content) >= 1024 * 1024 else f"{round(len(content) / 1024, 1)} KB"

    # Compute hash & parse text
    doc = graph_store.add_document(
        file_name=file.filename,
        category=category or "education",
        file_size=file_size_str,
        content_bytes=content
    )

    text_extracted = document_agent.parse_pdf_text(content)
    analysis = document_agent.classify_and_extract(file.filename, text_extracted)

    # Auto-commit extracted candidate fields into graph store
    extracted_nodes = []
    for field in analysis["extractedFields"]:
        node, _ = graph_store.add_or_update_claim(
            category=analysis["category"],
            field_name=field["fieldName"],
            field_value=field["value"],
            source="Extracted from document",
            evidence_doc_name=file.filename,
            evidence_doc_hash=doc.sha256_hash,
            is_singular=field.get("isSingular", False),
            raw_numeric_value=field.get("rawNumericValue")
        )
        extracted_nodes.append(node.to_dict())

    doc.extracted_fields_count = len(extracted_nodes)

    audit_logger.log_event(
        action="DOCUMENT_INGESTED",
        recipient="Object Storage & Graph Indexer",
        purpose=f"OCR & Extraction of {file.filename}",
        fields_accessed=[n["fieldName"] for n in extracted_nodes],
        assurance_status="LEVEL_2_EVIDENCE_ATTACHED",
        share_id=doc.id
    )

    return {
        "document": doc.to_dict(),
        "extractedFields": extracted_nodes,
        "sha256Hash": doc.sha256_hash
    }

@app.post("/api/query")
def query_memory(req: QueryRequest):
    """
    Graph-First Question Resolution API.
    Checks Graph -> Known? Answer. If not -> Check Evidence -> Ask User.
    """
    result = query_agent.resolve_question(req.question)

    audit_logger.log_event(
        action="GRAPH_QUERY",
        recipient="Query Agent",
        purpose=f"Question: '{req.question}'",
        fields_accessed=[result.get("evidenceDoc") or "Graph Knowledge Node"],
        assurance_status=result.get("assuranceLevel", "LEVEL_1_USER_ASSERTED")
    )

    return result

@app.post("/api/proofs/compose")
def compose_proof(req: ShareScopeRequest):
    """Composes a privacy-preserving selective share link and QR code token."""
    share_obj = proof_composer.compose_proof(
        recipient=req.recipient,
        purpose=req.purpose,
        requested_fields=req.requestedFields,
        expiry_hours=req.expiryHours or 24
    )

    audit_logger.log_event(
        action="SHARE_CREATED",
        recipient=req.recipient,
        purpose=req.purpose,
        fields_accessed=share_obj["allowedFields"],
        assurance_status="LEVEL_2_EVIDENCE_ATTACHED",
        share_id=share_obj["id"]
    )

    return share_obj

@app.get("/api/proofs/verify/{token}")
def verify_share_proof(token: str, field: Optional[str] = None):
    """
    Deterministic Policy Engine Endpoint for Verifiers.
    Enforces scope permissions (403 OUT_OF_SCOPE) and revocations (403 SHARE_REVOKED).
    """
    status_code, msg, payload = policy_engine.access_share_proof(token, requested_field=field)
    
    if status_code != 200:
        raise HTTPException(status_code=status_code, detail=msg)

    audit_logger.log_event(
        action="PROOF_VERIFIED_BY_RECIPIENT",
        recipient="External Verifier",
        purpose="Selective Proof Verification",
        fields_accessed=list(payload.keys()) if payload else [],
        assurance_status="LEVEL_2_EVIDENCE_ATTACHED",
        share_id=token
    )

    return {
        "status": "APPROVED",
        "message": msg,
        "disclosedData": payload
    }

@app.post("/api/proofs/revoke/{share_id}")
def revoke_proof(share_id: str):
    """Revokes an active share link immediately."""
    success = policy_engine.revoke_share(share_id)
    if not success:
        raise HTTPException(status_code=404, detail="Share token or ID not found")

    audit_logger.log_event(
        action="SHARE_REVOKED",
        recipient="Vault Owner",
        purpose="User Immediate Revocation",
        fields_accessed=["ALL_SCOPED_FIELDS"],
        assurance_status="REVOKED",
        share_id=share_id
    )

    return {"status": "REVOKED", "message": "Share link revoked successfully."}

@app.get("/api/audit")
def get_audit_trail():
    """Returns tamper-evident hash-chained activity audit log."""
    integrity_ok, msg = audit_logger.verify_chain_integrity()
    return {
        "integrityVerified": integrity_ok,
        "integrityMessage": msg,
        "logs": audit_logger.get_audit_trail()
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
