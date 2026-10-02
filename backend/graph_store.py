import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any

class GraphNode:
    def __init__(
        self,
        node_id: str,
        category: str,
        field_name: str,
        field_value: str,
        source: str = "Confirmed by you",
        confidence: str = "user-confirmed",
        assurance_level: str = "LEVEL_1_USER_ASSERTED",
        evidence_doc_name: Optional[str] = None,
        evidence_doc_hash: Optional[str] = None,
        is_singular: bool = False,
        is_sensitive: bool = False,
        raw_numeric_value: Optional[float] = None
    ):
        self.id = node_id
        self.category = category
        self.field_name = field_name
        self.field_value = field_value
        self.source = source
        self.confidence = confidence
        self.assurance_level = assurance_level
        self.evidence_doc_name = evidence_doc_name
        self.evidence_doc_hash = evidence_doc_hash
        self.is_singular = is_singular
        self.is_sensitive = is_sensitive
        self.raw_numeric_value = raw_numeric_value
        self.status = "ACTIVE"
        self.last_updated = datetime.now(timezone.utc).strftime("%d %b %Y")
        self.created_at = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "category": self.category,
            "fieldName": self.field_name,
            "value": self.field_value,
            "source": self.source,
            "confidence": self.confidence,
            "assuranceLevel": self.assurance_level,
            "evidenceDocName": self.evidence_doc_name,
            "evidenceDocHash": self.evidence_doc_hash,
            "isSingular": self.is_singular,
            "isSensitive": self.is_sensitive,
            "rawNumericValue": self.raw_numeric_value,
            "status": self.status,
            "lastUpdated": self.last_updated
        }

class EvidenceDocument:
    def __init__(
        self,
        doc_id: str,
        file_name: str,
        category: str,
        file_size: str,
        sha256_hash: str,
        extracted_fields_count: int = 0,
        status: str = "Parsed"
    ):
        self.id = doc_id
        self.name = file_name
        self.category = category
        self.file_type = "PDF" if file_name.lower().endswith(".pdf") else "IMAGE"
        self.file_size = file_size
        self.sha256_hash = sha256_hash
        self.upload_date = datetime.now(timezone.utc).strftime("%d %b %Y")
        self.extracted_fields_count = extracted_fields_count
        self.status = status

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "fileType": self.file_type,
            "fileSize": self.file_size,
            "sha256Hash": self.sha256_hash,
            "uploadDate": self.upload_date,
            "extractedFieldsCount": self.extracted_fields_count,
            "status": self.status
        }

class GraphStore:
    """
    Production Multi-Hop Graph Storage Engine.
    Implements:
    - Multi-hop Person -> Category -> Claim -> Evidence & Entity relationships
    - Singular field conflict detection vs time-versioned history
    - SHA-256 evidence integrity validation
    - Graph-first resolution queries
    """
    def __init__(self, user_name: str = "Indresh"):
        self.user_name = user_name
        self.person_id = f"person-{uuid.uuid4()}"
        self.nodes: Dict[str, GraphNode] = {}
        self.documents: Dict[str, EvidenceDocument] = {}
        self.history: List[Dict[str, Any]] = []
        self.conflicts: List[Dict[str, Any]] = []
        self._seed_initial_data()

    def _seed_initial_data(self):
        # Initial documents with cryptographic hashes
        doc1_hash = hashlib.sha256(b"Degree_Certificate_SLRTCE_2024").hexdigest()
        doc2_hash = hashlib.sha256(b"Final_Semester_Transcript_SLRTCE").hexdigest()
        doc3_hash = hashlib.sha256(b"Employment_Offer_Letter_Veritas").hexdigest()
        doc4_hash = hashlib.sha256(b"Annual_Health_Checkup_LabReport").hexdigest()

        d1 = EvidenceDocument("doc-1", "Degree_Certificate_SLRTCE_2024.pdf", "education", "1.4 MB", doc1_hash, 3)
        d2 = EvidenceDocument("doc-2", "Final_Semester_Transcript_SLRTCE.pdf", "education", "2.8 MB", doc2_hash, 2)
        d3 = EvidenceDocument("doc-3", "Employment_Offer_Letter_Veritas.pdf", "employment", "940 KB", doc3_hash, 3)
        d4 = EvidenceDocument("doc-4", "Annual_Health_Checkup_LabReport.pdf", "healthcare", "3.1 MB", doc4_hash, 4)

        for d in [d1, d2, d3, d4]:
            self.documents[d.id] = d

        # Seed Claims
        seed_claims = [
            # Identity
            GraphNode("id-1", "identity", "Full Legal Name", self.user_name, "Extracted from document", "evidence-backed", "LEVEL_2_EVIDENCE_ATTACHED", "Passport_2024_Scan.pdf", hashlib.sha256(b"Passport").hexdigest(), is_singular=True),
            GraphNode("id-2", "identity", "Date of Birth", "14 August 2002", "Extracted from document", "evidence-backed", "LEVEL_2_EVIDENCE_ATTACHED", "Birth_Certificate_Official.pdf", hashlib.sha256(b"Birth").hexdigest(), is_singular=True),
            GraphNode("id-3", "identity", "Primary Email", "indresh@example.com", "Confirmed by you", "user-confirmed", "LEVEL_1_USER_ASSERTED"),
            GraphNode("id-4", "identity", "Residential Address", "402 Cyber Heights, Tech Boulevard, Mumbai, MH 400076", "Extracted from document", "evidence-backed", "LEVEL_2_EVIDENCE_ATTACHED", "Utility_Bill_Electricity_Aug2024.pdf", hashlib.sha256(b"Utility").hexdigest()),
            GraphNode("id-6", "identity", "GitHub Profile", "https://github.com/indresh404/SYNDEO", "Extracted from document", "evidence-backed", "LEVEL_2_EVIDENCE_ATTACHED", "GitHub_GPG_Key_Signature.asc", hashlib.sha256(b"GPG").hexdigest()),
            GraphNode("id-7", "identity", "LinkedIn Profile", "https://linkedin.com/in/indresh-suresh-093646399", "Confirmed by you", "user-confirmed", "LEVEL_1_USER_ASSERTED"),

            # Education
            GraphNode("edu-1", "education", "College / University", "SLRTCE (Shree L. R. Tiwari College of Engineering)", "Extracted from document", "evidence-backed", "LEVEL_2_EVIDENCE_ATTACHED", d1.name, d1.sha256_hash),
            GraphNode("edu-2", "education", "Degree & Major", "Bachelor of Engineering in Computer Science", "Extracted from document", "evidence-backed", "LEVEL_2_EVIDENCE_ATTACHED", d1.name, d1.sha256_hash),
            GraphNode("edu-3", "education", "Cumulative GPA (CGPA)", "8.45 / 10.0", "Extracted from document", "evidence-backed", "LEVEL_2_EVIDENCE_ATTACHED", d2.name, d2.sha256_hash, raw_numeric_value=8.45),
            GraphNode("edu-4", "education", "Capstone Project Collaborator", "Divya (Lead System Architect, SLRTCE)", "Extracted from document", "evidence-backed", "LEVEL_2_EVIDENCE_ATTACHED", d1.name, d1.sha256_hash),

            # Employment
            GraphNode("emp-1", "employment", "Current Company", "Veritas Technologies", "Extracted from document", "evidence-backed", "LEVEL_2_EVIDENCE_ATTACHED", d3.name, d3.sha256_hash),
            GraphNode("emp-2", "employment", "Designation / Role", "Systems & Cloud Engineer", "Confirmed by you", "user-confirmed", "LEVEL_1_USER_ASSERTED"),
            GraphNode("emp-3", "employment", "Engineering Peer & Reviewer", "Monish (Senior DevOps Engineer, Veritas)", "Confirmed by you", "user-confirmed", "LEVEL_1_USER_ASSERTED"),
            GraphNode("emp-4", "employment", "Previous Employer", "Nexus Data Labs", "Extracted from document", "evidence-backed", "LEVEL_2_EVIDENCE_ATTACHED"),
            GraphNode("emp-5", "employment", "Monthly Salary (Payslip)", "₹62,340", "Extracted from document", "evidence-backed", "LEVEL_2_EVIDENCE_ATTACHED", d3.name, d3.sha256_hash, is_sensitive=True, raw_numeric_value=62340),

            # Finance
            GraphNode("fin-1", "finance", "Primary Tax Identifier (PAN)", "ABCPS9821K", "Extracted from document", "evidence-backed", "LEVEL_2_EVIDENCE_ATTACHED", is_sensitive=True, is_singular=True),
            GraphNode("fin-2", "finance", "Primary Salary Bank", "HDFC Bank (IFSC: HDFC0000128)", "Extracted from document", "evidence-backed", "LEVEL_2_EVIDENCE_ATTACHED", is_sensitive=True),
            GraphNode("fin-3", "finance", "Credit Score Band", "782 (Excellent)", "Confirmed by you", "user-confirmed", "LEVEL_1_USER_ASSERTED", raw_numeric_value=782),

            # Healthcare
            GraphNode("hlth-1", "healthcare", "Blood Group", "O Positive (O+)", "Extracted from document", "evidence-backed", "LEVEL_2_EVIDENCE_ATTACHED", d4.name, d4.sha256_hash, is_singular=True),
            GraphNode("hlth-2", "healthcare", "Emergency Contact & Kin", "Ankita (Primary Contact: +91 98201 55910)", "Confirmed by you", "user-confirmed", "LEVEL_1_USER_ASSERTED"),
            GraphNode("hlth-3", "healthcare", "Health Insurance Provider", "Star Health & Allied — Policy #SH-88921-99", "Extracted from document", "evidence-backed", "LEVEL_2_EVIDENCE_ATTACHED", d4.name, d4.sha256_hash)
        ]

        for claim in seed_claims:
            self.nodes[claim.id] = claim

    def add_or_update_claim(
        self,
        category: str,
        field_name: str,
        field_value: str,
        source: str = "Confirmed by you",
        evidence_doc_name: Optional[str] = None,
        evidence_doc_hash: Optional[str] = None,
        is_singular: bool = False,
        raw_numeric_value: Optional[float] = None
    ) -> Tuple[GraphNode, Optional[Dict[str, Any]]]:
        """
        Production Graph Commit with Conflict Detection & Time-Versioning.
        """
        existing_node = None
        for n in self.nodes.values():
            if n.category == category and n.field_name.strip().lower() == field_name.strip().lower() and n.status == "ACTIVE":
                existing_node = n
                break

        confidence = "evidence-backed" if source == "Extracted from document" else "user-confirmed"
        assurance = "LEVEL_2_EVIDENCE_ATTACHED" if source == "Extracted from document" else "LEVEL_1_USER_ASSERTED"

        if existing_node:
            # Check singular conflict
            if existing_node.is_singular and existing_node.field_value.strip().lower() != field_value.strip().lower():
                conflict_record = {
                    "id": f"conflict-{uuid.uuid4()}",
                    "fieldName": field_name,
                    "existingValue": existing_node.field_value,
                    "existingSource": existing_node.source,
                    "conflictingValue": field_value,
                    "conflictingSource": source,
                    "status": "NEEDS_REVIEW",
                    "createdAt": datetime.now(timezone.utc).isoformat()
                }
                self.conflicts.append(conflict_record)
                existing_node.status = "NEEDS_REVIEW"
                return existing_node, conflict_record

            # Mutable update -> save history and update current value
            self.history.append({
                "id": f"hist-{uuid.uuid4()}",
                "nodeId": existing_node.id,
                "fieldName": field_name,
                "previousValue": existing_node.field_value,
                "newValue": field_value,
                "changedAt": datetime.now(timezone.utc).isoformat()
            })

            existing_node.field_value = field_value
            existing_node.source = source
            existing_node.confidence = confidence
            existing_node.assurance_level = assurance
            if evidence_doc_name:
                existing_node.evidence_doc_name = evidence_doc_name
            if evidence_doc_hash:
                existing_node.evidence_doc_hash = evidence_doc_hash
            if raw_numeric_value is not None:
                existing_node.raw_numeric_value = raw_numeric_value
            existing_node.last_updated = datetime.now(timezone.utc).strftime("%d %b %Y")
            return existing_node, None

        # Create new claim node
        new_id = f"rec-{uuid.uuid4().hex[:8]}"
        new_node = GraphNode(
            node_id=new_id,
            category=category,
            field_name=field_name,
            field_value=field_value,
            source=source,
            confidence=confidence,
            assurance_level=assurance,
            evidence_doc_name=evidence_doc_name,
            evidence_doc_hash=evidence_doc_hash,
            is_singular=is_singular,
            raw_numeric_value=raw_numeric_value
        )
        self.nodes[new_id] = new_node
        return new_node, None

    def add_document(self, file_name: str, category: str, file_size: str, content_bytes: bytes) -> EvidenceDocument:
        sha256_hash = hashlib.sha256(content_bytes).hexdigest()
        doc_id = f"doc-{uuid.uuid4().hex[:8]}"
        doc = EvidenceDocument(
            doc_id=doc_id,
            file_name=file_name,
            category=category,
            file_size=file_size,
            sha256_hash=sha256_hash,
            extracted_fields_count=0,
            status="Parsed"
        )
        self.documents[doc_id] = doc
        return doc

    def query_graph_by_keyword(self, query: str) -> List[GraphNode]:
        q = query.lower()
        matched = []
        for node in self.nodes.values():
            if node.status != "ACTIVE":
                continue
            if q in node.field_name.lower() or q in node.field_value.lower() or (node.evidence_doc_name and q in node.evidence_doc_name.lower()):
                matched.append(node)
        return matched

    def get_all_records(self) -> List[Dict[str, Any]]:
        return [n.to_dict() for n in self.nodes.values() if n.status == "ACTIVE"]

    def get_all_documents(self) -> List[Dict[str, Any]]:
        return [d.to_dict() for d in self.documents.values()]

    def verify_document_integrity(self, node_id: str) -> Tuple[bool, str]:
        """
        Cryptographically verifies that displayed claim node matches source document hash.
        """
        node = self.nodes.get(node_id)
        if not node or not node.evidence_doc_name:
            return False, "No evidence document linked"

        matching_doc = None
        for d in self.documents.values():
            if d.name == node.evidence_doc_name:
                matching_doc = d
                break

        if not matching_doc:
            return False, "Linked source document not found in object storage"

        if node.evidence_doc_hash and node.evidence_doc_hash != matching_doc.sha256_hash:
            return False, "INTEGRITY_MISMATCH: Claim hash does not match source PDF hash"

        return True, "VERIFIED: Document hash matches stored evidence claim"
