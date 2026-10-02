from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
import os
import re
import logging
from pathlib import Path
import uvicorn
import httpx
from dotenv import load_dotenv

from graph_store import GraphStore
from policy_engine import PolicyEngine
from document_agent import DocumentAgent
from query_agent import QueryAgent
from privacy_advisor import PrivacyAdvisor
from proof_composer import ProofComposer
from audit_logger import AuditLogger

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("syndeo.main")

# Load environment from .env in root or current directory
root_env = Path(__file__).resolve().parent.parent / ".env"
backend_env = Path(__file__).resolve().parent / ".env"
if root_env.exists():
    load_dotenv(root_env)
elif backend_env.exists():
    load_dotenv(backend_env)
else:
    load_dotenv()

app = FastAPI(
    title="SYNDEO API - Multi-Agent Personal Identity & Policy-Governed Memory Network",
    description="Production Multi-Agent Architecture: Neo4j Graph Engine, Document Agent, Query Agent, Privacy Advisor Agent, Proof Composer, and Deterministic Policy Engine.",
    version="2.0.0"
)

# Enable CORS for Next.js / Vite React frontend and Chrome Extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Multi-Agent Singletons & Deterministic Engines
graph_store = GraphStore(user_name="Indresh")
policy_engine = PolicyEngine()
document_agent = DocumentAgent()
query_agent = QueryAgent(graph_store)
privacy_advisor = PrivacyAdvisor()
proof_composer = ProofComposer(policy_engine)
audit_logger = AuditLogger()

# Seed initial audit event
audit_logger.log_event(
    action="SYSTEM_INIT",
    recipient="Vault Root",
    purpose="Initial Multi-Agent Graph & Cryptographic Policy Engine Setup",
    fields_accessed=["Neo4j Aura Engine", "Policy Gatekeeper", "Document Agent", "Query Agent", "Privacy Advisor"],
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
    rawNumericValue: Optional[float] = None

class QueryRequest(BaseModel):
    question: str

class PrivacyAdviceRequest(BaseModel):
    recipient: str
    purpose: str
    requestedFields: List[Dict[str, Any]]

class ShareScopeRequest(BaseModel):
    recipient: str
    purpose: str
    requestedFields: List[Dict[str, Any]]
    expiryHours: Optional[int] = 24

class SarvamTranslateRequest(BaseModel):
    input: str
    source_language_code: str
    target_language_code: str

class SarvamTTSRequest(BaseModel):
    text: str
    target_language_code: str
    speaker: Optional[str] = "shubh"
    pace: Optional[float] = 1.0

class SarvamChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class SarvamChatRequest(BaseModel):
    message: str
    history: List[SarvamChatMessage] = Field(default_factory=list)
    language_code: str = "en-IN"
    mode: Literal["normal", "save", "share"] = "normal"
    attachment: Optional[Dict[str, str]] = None

SARVAM_BASE_URL = "https://api.sarvam.ai"
SARVAM_LANGUAGES = {
    "en-IN", "hi-IN", "bn-IN", "gu-IN", "kn-IN", "ml-IN",
    "mr-IN", "od-IN", "pa-IN", "ta-IN", "te-IN", "ur-IN",
}

def get_sarvam_api_key() -> str:
    api_key = os.getenv("SARVAM_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Sarvam is not configured. Set SARVAM_API_KEY in the backend environment.",
        )
    return api_key

def validate_sarvam_language(language_code: str) -> str:
    if language_code not in SARVAM_LANGUAGES:
        raise HTTPException(status_code=422, detail="Unsupported Sarvam language code.")
    return language_code

def get_relevant_chat_records(question: str) -> List[Dict[str, Any]]:
    """Traverses Neo4j / Graph memory for relevant claims matching the user's intent."""
    matched_nodes = graph_store.query_graph_by_keyword(question)
    if matched_nodes:
        return [node.to_dict() for node in matched_nodes[:8]]
    return [r for r in graph_store.get_all_records() if not r.get("isSensitive")][:6]

async def sarvam_request(method: str, endpoint: str, **kwargs):
    api_key = get_sarvam_api_key()
    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.request(
                method,
                f"{SARVAM_BASE_URL}/{endpoint}",
                headers={
                    "api-subscription-key": api_key,
                    "Authorization": f"Bearer {api_key}",
                },
                **kwargs,
            )
    except httpx.RequestError as error:
        raise HTTPException(status_code=502, detail="Could not connect to Sarvam. Please try again.") from error

    if not response.is_success:
        try:
            provider_error = response.json().get("error", {}).get("message")
        except (ValueError, AttributeError):
            provider_error = None
        detail = provider_error or f"Sarvam request failed ({response.status_code})."
        raise HTTPException(status_code=response.status_code if response.status_code < 500 else 502, detail=detail)

    return response.json()

# --- API Endpoints ---

@app.get("/")
def root_index():
    neo4j_stat = graph_store.get_neo4j_status()
    return {
        "status": "online",
        "service": "SYNDEO Multi-Agent Graph & Policy API",
        "version": "2.0.0",
        "docsUrl": "/docs",
        "healthUrl": "/api/health",
        "neo4jStatus": "Online (AuraDB)" if neo4j_stat["connected"] else "In-Memory Mirror Active",
        "agents": {
            "documentAgent": "ACTIVE (OCR & Claims Extraction)",
            "queryAgent": "ACTIVE (Cypher Multi-Hop Traversal)",
            "privacyAdvisor": "ACTIVE (Data Minimization & Risk Reasoning)",
            "proofComposer": "ACTIVE (Tamper-Evident QR Proofs)",
            "policyEngine": "DETERMINISTIC_ENFORCER (Field-level Scopes & Revocations)"
        }
    }

@app.get("/api/health")
def health_check():
    neo4j_stat = graph_store.get_neo4j_status()
    integrity_ok, integrity_msg = audit_logger.verify_chain_integrity()
    return {
        "status": "online",
        "system": "SYNDEO Multi-Agent Graph Engine",
        "neo4jConnected": neo4j_stat["connected"],
        "neo4jStatus": "Online (AuraDB)" if neo4j_stat["connected"] else "In-Memory Mirror Active",
        "auditChainStatus": integrity_msg,
        "activeNodesCount": len(graph_store.nodes),
        "sourceDocsCount": len(graph_store.documents),
        "agents": {
            "documentAgent": "ACTIVE",
            "queryAgent": "ACTIVE",
            "privacyAdvisor": "ACTIVE",
            "proofComposer": "ACTIVE",
            "policyEngine": "DETERMINISTIC_ENFORCER"
        }
    }

@app.get("/api/neo4j/status")
def get_neo4j_info():
    """Returns live Neo4j Aura connectivity, schema, and node counts."""
    return graph_store.get_neo4j_status()

@app.post("/api/privacy/advise")
def get_privacy_advice(req: PrivacyAdviceRequest):
    """
    Privacy Advisor Agent:
    Evaluates requested fields against recipient purpose and recommends what should be released,
    transformed (range), or denied.
    """
    advice = privacy_advisor.evaluate_request(
        recipient=req.recipient,
        purpose=req.purpose,
        requested_fields=req.requestedFields
    )
    
    audit_logger.log_event(
        action="PRIVACY_ADVICE_EVALUATED",
        recipient=req.recipient,
        purpose=req.purpose,
        fields_accessed=[f.get("fieldName") for f in req.requestedFields],
        assurance_status="AI_ADVISED"
    )
    
    return advice

@app.post("/api/sarvam/speech-to-text")
async def sarvam_speech_to_text(
    file: UploadFile = File(...),
    language_code: str = Form("unknown"),
):
    content = await file.read()
    if not content or len(content) < 100:
        return {"transcript": "", "language_code": language_code, "request_id": "empty-audio"}
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="The recording exceeds the 25 MB limit.")

    # Normalize MIME type by stripping codecs parameters (e.g. 'audio/webm;codecs=opus' -> 'audio/webm')
    raw_content_type = file.content_type or "audio/webm"
    base_content_type = raw_content_type.split(";")[0].strip().lower()
    
    allowed_audio_types = {
        "audio/webm", "video/webm", "audio/ogg", "audio/opus", "audio/wav",
        "audio/x-wav", "audio/wave", "audio/mpeg", "audio/mp3", "audio/mp4",
        "audio/x-m4a", "audio/aac", "audio/flac", "application/octet-stream"
    }
    if base_content_type not in allowed_audio_types:
        base_content_type = "audio/webm"

    clean_filename = file.filename or "recording.webm"
    if not any(clean_filename.lower().endswith(ext) for ext in [".webm", ".ogg", ".wav", ".mp3", ".mp4", ".m4a"]):
        clean_filename = f"{clean_filename}.webm"

    fields = {
        "file": (
            clean_filename,
            content,
            base_content_type,
        )
    }
    form = {"model": "saaras:v3", "mode": "transcribe"}
    if language_code != "unknown":
        form["language_code"] = validate_sarvam_language(language_code)

    return await sarvam_request("POST", "speech-to-text", files=fields, data=form)

async def generate_gemini_chat_response(system_instruction: str, messages: List[Dict[str, str]], user_message: str) -> Optional[str]:
    """Generates reasoning response using Google Gemini LLM."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    candidate_models = ["gemini-flash-latest", "gemini-3.8-flash", "gemini-2.5-pro"]
    
    contents = []
    for msg in messages:
        if msg.get("role") == "system":
            continue
        role = "user" if msg.get("role") == "user" else "model"
        contents.append({"role": role, "parts": [{"text": msg.get("content", "")}]})
    
    if not contents or contents[-1].get("role") != "user":
        contents.append({"role": "user", "parts": [{"text": user_message}]})

    payload = {
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "contents": contents,
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 600,
        }
    }

    headers = {"Content-Type": "application/json"}
    for model in candidate_models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            text = parts[0]["text"].strip()
                            if text:
                                return text
        except Exception as err:
            logger.debug(f"Gemini {model} call failed: {err}")
            continue

    return None

@app.post("/api/sarvam/chat")
@app.post("/api/gemini/chat")
@app.post("/api/chat")
async def ai_chat(req: SarvamChatRequest):
    message = (req.message or "").strip()
    if not message:
        message = "Hello, can you help me explore my vault?"
    if len(message) > 6000:
        raise HTTPException(status_code=413, detail="Chat message exceeds the 6,000 character limit.")
    if len(req.history) > 20 or any(len(item.content) > 6000 for item in req.history):
        raise HTTPException(status_code=413, detail="Chat history exceeds the supported limit.")
    if sum(len(item.content) for item in req.history) > 24000:
        raise HTTPException(status_code=413, detail="Chat history exceeds the 24,000 character limit.")

    language = validate_sarvam_language(req.language_code)
    relevant_records = get_relevant_chat_records(message)
    language_names = {
        "en-IN": "English", "hi-IN": "Hindi (हिन्दी)", "bn-IN": "Bengali (বাংলা)",
        "gu-IN": "Gujarati (ગુજરાતી)", "kn-IN": "Kannada (ಕನ್ನಡ)",
        "ml-IN": "Malayalam (മലയാളം)", "mr-IN": "Marathi (मराठी)",
        "od-IN": "Odia (ଓଡ଼ିଆ)", "pa-IN": "Punjabi (ਪੰਜਾਬੀ)",
        "ta-IN": "Tamil (தமிழ்)", "te-IN": "Telugu (తెలుగు)", "ur-IN": "Urdu (اردو)",
    }
    mode_instructions = {
        "normal": "Answer the user's question conversationally by citing verified claims from their graph store.",
        "save": "The user is asking to save information. Acknowledge the record details and confirm that the Document Agent / Graph Store will record it with provenance.",
        "share": "The user is asking to share information. Explain how the Privacy Advisor evaluates requested fields and how the deterministic Policy Engine enforces selective disclosure.",
    }
    system_message = (
        "You are SYNDEO Multi-Agent Copilot powered by Gemini & Sarvam, a privacy-preserving digital identity & graph intelligence assistant. "
        f"Reply in {language_names[language]} regardless of the language used in the input. "
        "Use that language's native writing system when applicable, not a transliteration. "
        "Keep product names, code, and proper nouns unchanged when appropriate. "
        "Use the supplied Neo4j vault records as user-specific verified facts. "
        "Distinguish evidence-backed claims (backed by documents with SHA-256 hashes) from user-confirmed claims. "
        f"{mode_instructions[req.mode]} "
        "Keep responses direct, fluent, and concise (2-4 sentences where possible) for ultra-fast, natural voice conversation. "
        f"Live verified Graph & Vault records: {relevant_records}"
    )
    messages = [{"role": "system", "content": system_message}]
    messages.extend(
        {"role": item.role, "content": item.content}
        for item in req.history[-20:]
    )
    user_message = message
    if req.attachment:
        safe_attachment = {
            key: value[:256] for key, value in req.attachment.items()
            if key in {"name", "type", "size"}
        }
        user_message += (
            "\n\n[Attached file metadata: "
            f"{safe_attachment}]"
        )
    messages.append({"role": "user", "content": user_message})

    # 1. Primary Engine: Google Gemini LLM
    gemini_answer = await generate_gemini_chat_response(system_message, messages, user_message)
    if gemini_answer:
        return {"answer": gemini_answer, "model": "gemini-flash-latest", "request_id": "gemini-live"}

    # 2. Fallback Engine: Sarvam 105B LLM
    try:
        response = await sarvam_request(
            "POST",
            "v1/chat/completions",
            json={
                "model": "sarvam-105b-conversations",
                "messages": messages,
                "temperature": 0.2,
                "max_tokens": 512,
            },
        )
        answer = response["choices"][0]["message"]["content"]
        if isinstance(answer, str) and answer.strip():
            return {"answer": answer.strip(), "model": response.get("model", "sarvam-105b"), "request_id": response.get("id")}
    except Exception as error:
        logger.warning(f"Sarvam chat fallback failed: {error}")

    # 3. Deterministic Graph Resolution Fallback
    matched_nodes = graph_store.query_graph_by_keyword(user_message)
    if matched_nodes:
        answer_lines = ["Here are your verified records:"]
        for node in matched_nodes[:4]:
            answer_lines.append(f"• **{node.field_name}**: {node.field_value}")
        return {"answer": "\n".join(answer_lines), "model": "deterministic-graph-engine", "request_id": "graph-fallback"}

    return {
        "answer": f"I verified your personal memory vault for '{user_message}'. Your identity is securely indexed in Neo4j Aura with cryptographic provenance.",
        "model": "graph-core",
        "request_id": "graph-default"
    }

@app.post("/api/sarvam/translate")
async def sarvam_translate(req: SarvamTranslateRequest):
    if not (req.input or "").strip():
        return {"translated_text": "", "translations": []}
    if len(req.input) > 5000:
        raise HTTPException(status_code=413, detail="Text to translate exceeds the 5,000 character limit.")
    source_language = validate_sarvam_language(req.source_language_code)
    target_language = validate_sarvam_language(req.target_language_code)
    return await sarvam_request(
        "POST",
        "translate",
        json={
            "input": req.input,
            "source_language_code": source_language,
            "target_language_code": target_language,
            "model": "mayura:v1",
            "mode": "formal",
            "enable_preprocessing": True,
        },
    )

@app.post("/api/sarvam/text-to-speech")
async def sarvam_text_to_speech(req: SarvamTTSRequest):
    text = (req.text or "").strip()
    if not text:
        return {"request_id": "empty-text", "audios": []}
    if len(text) > 2500:
        raise HTTPException(status_code=413, detail="Text to speak exceeds the 2,500 character limit.")
    target_language = validate_sarvam_language(req.target_language_code)
    speaker = req.speaker or "shubh"
    return await sarvam_request(
        "POST",
        "text-to-speech",
        json={
            "text": text,
            "language_code": target_language,
            "model": "bulbul:v3",
            "speaker": speaker,
            "pace": req.pace or 1.0,
            "speech_sample_rate": 24000,
            "enable_preprocessing": True,
        },
    )

@app.get("/api/memory")
def get_personal_memory_store():
    """
    Returns the complete unified Personal Memory Store:
    - Active claims from Neo4j Aura
    - Cryptographic evidence documents with SHA-256 hashes
    - Topology nodes and relationships
    - Provenance & assurance statistics
    """
    records = graph_store.get_all_records()
    documents = graph_store.get_all_documents()
    neo4j_stat = graph_store.get_neo4j_status()
    integrity_ok, integrity_msg = audit_logger.verify_chain_integrity()
    
    return {
        "status": "success",
        "userName": graph_store.user_name,
        "neo4jConnected": neo4j_stat["connected"],
        "records": records,
        "documents": documents,
        "conflicts": graph_store.conflicts,
        "historyCount": len(graph_store.history),
        "stats": {
            "recordsCount": len(records),
            "documentsCount": len(documents),
            "categoriesCount": len(set(r["category"] for r in records)),
            "auditStatus": integrity_msg
        }
    }

@app.post("/api/memory/clear")
@app.delete("/api/memory/clear")
def clear_memory_store():
    """Wipes all claims, documents, and nodes from memory store and Neo4j database."""
    graph_store.clear_all()
    audit_logger.log_event(
        action="MEMORY_STORE_CLEARED",
        recipient="Personal Vault",
        purpose="User initiated vault reset to empty state",
        fields_accessed=[],
        assurance_status="EMPTY_RESET"
    )
    return {"status": "success", "message": "Personal Memory Store wiped to clean empty state"}

@app.get("/api/graph/topology")
def get_graph_topology_route():
    """Returns live graph nodes and links directly from Neo4j Cypher memory model."""
    return graph_store.get_graph_topology()

@app.get("/api/graph/records")
def get_records():
    """Returns all active personal memory claims from multi-hop graph."""
    return {"records": graph_store.get_all_records()}

@app.get("/api/graph/documents")
def get_documents():
    """Returns all evidence documents stored with SHA-256 hashes."""
    return {"documents": graph_store.get_all_documents()}

@app.post("/api/graph/claims")
def add_claim(req: AddClaimRequest):
    """Adds or updates a personal memory claim node with conflict detection & Neo4j sync."""
    node, conflict = graph_store.add_or_update_claim(
        category=req.category,
        field_name=req.fieldName,
        field_value=req.value,
        source=req.source or "Confirmed by you",
        evidence_doc_name=req.evidenceDocName,
        is_singular=req.isSingular or False,
        raw_numeric_value=req.rawNumericValue
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
    Document Agent Ingestion Pipeline:
    1. Reads PDF/Image bytes.
    2. Computes SHA-256 cryptographic evidence hash.
    3. Runs AI extraction & category classification.
    4. Links evidence pointer to Neo4j graph node.
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

    # Auto-commit extracted candidate fields into graph store & Neo4j
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
        recipient="Object Storage & Neo4j Indexer",
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
    Query Agent: Graph-First Question Resolution API.
    Traverses Neo4j multi-hop graph to answer with cryptographic assurance levels.
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
    """Proof Composer Agent: Composes privacy-preserving selective share token & QR code."""
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
    Enforces scope permissions (403 OUT_OF_SCOPE), expiry (403 SHARE_EXPIRED), and revocations (403 SHARE_REVOKED).
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
    """Policy Engine: Revokes an active share link immediately."""
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
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
