import hashlib
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any

try:
    from neo4j import GraphDatabase, Driver
    NEO4J_AVAILABLE = True
except ImportError:
    NEO4J_AVAILABLE = False
    Driver = Any

logger = logging.getLogger("syndeo.graph_store")

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
        self.field_value = str(field_value)
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
    Connects to Neo4j Aura Database with automatic failover to in-memory graph mirror.
    
    Graph Topology:
      (:Person {name, person_id})
          -[:HAS_CLAIM]-> (:Claim {category, field_name, field_value, confidence, assurance_level, status})
          -[:BACKED_BY]-> (:Document {name, sha256_hash, file_size, upload_date})
    """
    def __init__(self, user_name: str = "Indresh"):
        self.user_name = user_name
        self.person_id = f"person-syndeo-{user_name.lower()}"
        self.nodes: Dict[str, GraphNode] = {}
        self.documents: Dict[str, EvidenceDocument] = {}
        self.history: List[Dict[str, Any]] = []
        self.conflicts: List[Dict[str, Any]] = []
        
        # Neo4j Driver & State
        self.neo4j_driver: Optional[Driver] = None
        self.neo4j_connected: bool = False
        self.neo4j_error: Optional[str] = None
        
        self._init_neo4j_driver()
        self._seed_initial_data()
        if self.neo4j_connected:
            self._sync_seed_to_neo4j()

    def _init_neo4j_driver(self):
        """Initializes Neo4j Aura Connection from environment variables."""
        if not NEO4J_AVAILABLE:
            self.neo4j_error = "neo4j python package not installed"
            logger.warning(self.neo4j_error)
            return

        uri = os.getenv("NEO4J_URI", "neo4j+s://c4374f30.databases.neo4j.io")
        user = os.getenv("NEO4J_USERNAME", "c4374f30")
        password = os.getenv("NEO4J_PASSWORD", "46sTtsx8Sem6UMTwevvhLYA7ipw9rZEQbKpxBP_J3Xg")

        if not uri or not password:
            self.neo4j_error = "NEO4J_URI or NEO4J_PASSWORD not configured"
            logger.info("Neo4j running in local in-memory graph mode.")
            return

        try:
            driver = GraphDatabase.driver(uri, auth=(user, password))
            driver.verify_connectivity()
            self.neo4j_driver = driver
            self.neo4j_connected = True
            self.neo4j_error = None
            logger.info(f"Connected to Neo4j database at {uri}")
            self._init_neo4j_schema()
        except Exception as e:
            self.neo4j_connected = False
            self.neo4j_error = str(e)
            logger.warning(f"Neo4j connection failed ({e}). Fallback to in-memory graph store.")

    def _init_neo4j_schema(self):
        """Creates unique constraints and indexes in Neo4j."""
        if not self.neo4j_driver or not self.neo4j_connected:
            return
        cypher_queries = [
            "CREATE CONSTRAINT unique_person_id IF NOT EXISTS FOR (p:Person) REQUIRE p.person_id IS UNIQUE;",
            "CREATE CONSTRAINT unique_claim_id IF NOT EXISTS FOR (c:Claim) REQUIRE c.id IS UNIQUE;",
            "CREATE CONSTRAINT unique_document_hash IF NOT EXISTS FOR (d:Document) REQUIRE d.sha256_hash IS UNIQUE;"
        ]
        try:
            with self.neo4j_driver.session() as session:
                for q in cypher_queries:
                    try:
                        session.run(q)
                    except Exception as err:
                        logger.debug(f"Schema query info: {err}")
        except Exception as e:
            logger.warning(f"Failed to apply Neo4j schema: {e}")

    def _sync_seed_to_neo4j(self):
        """Syncs in-memory seed data to Neo4j graph on startup."""
        if not self.neo4j_driver or not self.neo4j_connected:
            return
        try:
            with self.neo4j_driver.session() as session:
                # Merge Person
                session.run(
                    "MERGE (p:Person {person_id: $person_id}) ON CREATE SET p.name = $name",
                    person_id=self.person_id, name=self.user_name
                )
                # Merge Documents
                for doc in self.documents.values():
                    session.run(
                        """
                        MERGE (d:Document {sha256_hash: $sha256_hash})
                        SET d.id = $id, d.name = $name, d.category = $category,
                            d.file_size = $file_size, d.status = $status, d.upload_date = $upload_date
                        """,
                        id=doc.id, name=doc.name, category=doc.category,
                        file_size=doc.file_size, sha256_hash=doc.sha256_hash,
                        status=doc.status, upload_date=doc.upload_date
                    )
                # Merge Claims
                for node in self.nodes.values():
                    session.run(
                        """
                        MATCH (p:Person {person_id: $person_id})
                        MERGE (c:Claim {id: $id})
                        SET c.category = $category, c.field_name = $field_name,
                            c.field_value = $field_value, c.source = $source,
                            c.confidence = $confidence, c.assurance_level = $assurance_level,
                            c.is_singular = $is_singular, c.is_sensitive = $is_sensitive,
                            c.status = $status, c.last_updated = $last_updated
                        MERGE (p)-[:HAS_CLAIM]->(c)
                        """,
                        person_id=self.person_id, id=node.id, category=node.category,
                        field_name=node.field_name, field_value=node.field_value,
                        source=node.source, confidence=node.confidence,
                        assurance_level=node.assurance_level, is_singular=node.is_singular,
                        is_sensitive=node.is_sensitive, status=node.status,
                        last_updated=node.last_updated
                    )
                    if node.evidence_doc_hash:
                        session.run(
                            """
                            MATCH (c:Claim {id: $claim_id})
                            MATCH (d:Document {sha256_hash: $doc_hash})
                            MERGE (c)-[:BACKED_BY]->(d)
                            """,
                            claim_id=node.id, doc_hash=node.evidence_doc_hash
                        )
            logger.info("Successfully synced seed claims to Neo4j graph.")
        except Exception as e:
            logger.warning(f"Neo4j seed sync warning: {e}")

    def _seed_initial_data(self):
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
        Commits claim to Graph Store and mirrors to Neo4j.
        Detects singular conflicts and maintains full audit history.
        """
        existing_node = None
        for n in self.nodes.values():
            if n.category == category and n.field_name.strip().lower() == field_name.strip().lower() and n.status == "ACTIVE":
                existing_node = n
                break

        confidence = "evidence-backed" if source == "Extracted from document" else "user-confirmed"
        assurance = "LEVEL_2_EVIDENCE_ATTACHED" if source == "Extracted from document" else "LEVEL_1_USER_ASSERTED"

        if existing_node:
            if existing_node.is_singular and existing_node.field_value.strip().lower() != field_value.strip().lower():
                conflict_record = {
                    "id": f"conflict-{uuid.uuid4().hex[:8]}",
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

            self.history.append({
                "id": f"hist-{uuid.uuid4().hex[:8]}",
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

            self._persist_claim_to_neo4j(existing_node)
            return existing_node, None

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
        self._persist_claim_to_neo4j(new_node)
        return new_node, None

    def _persist_claim_to_neo4j(self, node: GraphNode):
        if not self.neo4j_driver or not self.neo4j_connected:
            return
        try:
            with self.neo4j_driver.session() as session:
                session.run(
                    """
                    MATCH (p:Person {person_id: $person_id})
                    MERGE (c:Claim {id: $id})
                    SET c.category = $category, c.field_name = $field_name,
                        c.field_value = $field_value, c.source = $source,
                        c.confidence = $confidence, c.assurance_level = $assurance_level,
                        c.is_singular = $is_singular, c.is_sensitive = $is_sensitive,
                        c.status = $status, c.last_updated = $last_updated
                    MERGE (p)-[:HAS_CLAIM]->(c)
                    """,
                    person_id=self.person_id, id=node.id, category=node.category,
                    field_name=node.field_name, field_value=node.field_value,
                    source=node.source, confidence=node.confidence,
                    assurance_level=node.assurance_level, is_singular=node.is_singular,
                    is_sensitive=node.is_sensitive, status=node.status,
                    last_updated=node.last_updated
                )
                if node.evidence_doc_hash:
                    session.run(
                        """
                        MATCH (c:Claim {id: $claim_id})
                        MATCH (d:Document {sha256_hash: $doc_hash})
                        MERGE (c)-[:BACKED_BY]->(d)
                        """,
                        claim_id=node.id, doc_hash=node.evidence_doc_hash
                    )
        except Exception as e:
            logger.warning(f"Neo4j claim persistence warning: {e}")

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

        if self.neo4j_driver and self.neo4j_connected:
            try:
                with self.neo4j_driver.session() as session:
                    session.run(
                        """
                        MERGE (d:Document {sha256_hash: $sha256_hash})
                        SET d.id = $id, d.name = $name, d.category = $category,
                            d.file_size = $file_size, d.status = $status, d.upload_date = $upload_date
                        """,
                        id=doc.id, name=doc.name, category=doc.category,
                        file_size=doc.file_size, sha256_hash=doc.sha256_hash,
                        status=doc.status, upload_date=doc.upload_date
                    )
            except Exception as e:
                logger.warning(f"Neo4j document sync error: {e}")

        return doc

    def query_graph_by_keyword(self, query: str) -> List[GraphNode]:
        q = query.lower()
        # First try Cypher if connected
        if self.neo4j_driver and self.neo4j_connected:
            try:
                with self.neo4j_driver.session() as session:
                    result = session.run(
                        """
                        MATCH (p:Person {person_id: $person_id})-[:HAS_CLAIM]->(c:Claim)
                        WHERE c.status = 'ACTIVE' AND (
                            toLower(c.field_name) CONTAINS $q OR
                            toLower(c.field_value) CONTAINS $q OR
                            toLower(c.category) CONTAINS $q
                        )
                        OPTIONAL MATCH (c)-[:BACKED_BY]->(d:Document)
                        RETURN c.id AS id, c.category AS category, c.field_name AS field_name,
                               c.field_value AS field_value, c.source AS source,
                               c.confidence AS confidence, c.assurance_level AS assurance_level,
                               d.name AS evidence_doc_name, d.sha256_hash AS evidence_doc_hash,
                               c.is_singular AS is_singular, c.is_sensitive AS is_sensitive
                        """,
                        person_id=self.person_id, q=q
                    )
                    cypher_nodes = []
                    for record in result:
                        cypher_nodes.append(GraphNode(
                            node_id=record["id"],
                            category=record["category"],
                            field_name=record["field_name"],
                            field_value=record["field_value"],
                            source=record["source"] or "Confirmed by you",
                            confidence=record["confidence"] or "user-confirmed",
                            assurance_level=record["assurance_level"] or "LEVEL_1_USER_ASSERTED",
                            evidence_doc_name=record["evidence_doc_name"],
                            evidence_doc_hash=record["evidence_doc_hash"],
                            is_singular=bool(record["is_singular"]),
                            is_sensitive=bool(record["is_sensitive"])
                        ))
                    if cypher_nodes:
                        return cypher_nodes
            except Exception as e:
                logger.warning(f"Cypher query fallback: {e}")

        # In-memory graph search
        matched = []
        for node in self.nodes.values():
            if node.status != "ACTIVE":
                continue
            if (q in node.field_name.lower() or 
                q in node.field_value.lower() or 
                q in node.category.lower() or 
                (node.evidence_doc_name and q in node.evidence_doc_name.lower())):
                matched.append(node)
        return matched

    def get_all_records(self) -> List[Dict[str, Any]]:
        return [n.to_dict() for n in self.nodes.values() if n.status == "ACTIVE"]

    def get_all_documents(self) -> List[Dict[str, Any]]:
        return [d.to_dict() for d in self.documents.values()]

    def verify_document_integrity(self, node_id: str) -> Tuple[bool, str]:
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

    def get_neo4j_status(self) -> Dict[str, Any]:
        return {
            "driverConfigured": NEO4J_AVAILABLE,
            "connected": self.neo4j_connected,
            "uri": os.getenv("NEO4J_URI", "neo4j+s://c4374f30.databases.neo4j.io"),
            "username": os.getenv("NEO4J_USERNAME", "c4374f30"),
            "errorMessage": self.neo4j_error,
            "activeNodes": len(self.nodes),
            "sourceDocs": len(self.documents)
        }

    def get_graph_topology(self) -> Dict[str, Any]:
        """
        Generates real nodes and links directly from the active Neo4j / Graph memory model.
        Returns:
          nodes: [Root, Category Hubs, Verified Claims, Source Evidence Documents]
          links: [Root -> Hubs, Hubs -> Claims, Claims -> Documents, Cross-Links]
        """
        nodes = []
        links = []
        
        # 1. Root Person Node
        nodes.append({
            "id": "root-user",
            "label": self.user_name,
            "sublabel": "Personal Identity Root",
            "type": "root",
            "radius": 36,
            "color": "#38bdf8"
        })

        # 2. Category Hubs
        categories = ["identity", "education", "employment", "finance", "healthcare"]
        cat_colors = {
            "identity": "#f43f5e",
            "education": "#a855f7",
            "employment": "#ec4899",
            "finance": "#94a3b8",
            "healthcare": "#fb7185"
        }
        for cat in categories:
            cat_id = f"hub-{cat}"
            nodes.append({
                "id": cat_id,
                "label": cat.capitalize(),
                "type": "category",
                "category": cat,
                "radius": 24,
                "color": cat_colors.get(cat, "#64748b")
            })
            links.append({
                "source": "root-user",
                "target": cat_id,
                "type": "root-to-cat",
                "color": "rgba(56, 189, 248, 0.4)"
            })

        # 3. Claims
        for claim in self.nodes.values():
            if claim.status != "ACTIVE":
                continue
            nodes.append({
                "id": claim.id,
                "label": claim.field_name,
                "value": claim.field_value,
                "sublabel": claim.field_value,
                "type": "record",
                "category": claim.category,
                "confidence": claim.confidence,
                "assuranceLevel": claim.assurance_level,
                "evidenceDoc": claim.evidence_doc_name,
                "evidenceDocHash": claim.evidence_doc_hash,
                "isSensitive": claim.is_sensitive,
                "radius": 16,
                "color": cat_colors.get(claim.category, "#a855f7")
            })
            links.append({
                "source": f"hub-{claim.category}",
                "target": claim.id,
                "type": "cat-to-rec",
                "color": "rgba(168, 85, 247, 0.3)"
            })
            if claim.evidence_doc_name:
                # Link to evidence document
                for doc in self.documents.values():
                    if doc.name == claim.evidence_doc_name:
                        links.append({
                            "source": claim.id,
                            "target": doc.id,
                            "type": "doc-to-rec",
                            "color": "rgba(16, 185, 129, 0.4)"
                        })
                        break

        # 4. Evidence Documents
        for doc in self.documents.values():
            nodes.append({
                "id": doc.id,
                "label": doc.name,
                "sublabel": f"{doc.file_size} · SHA-256",
                "type": "document",
                "category": doc.category,
                "sha256Hash": doc.sha256_hash,
                "radius": 18,
                "color": "#10b981"
            })

        return {
            "nodes": nodes,
            "links": links,
            "neo4jConnected": self.neo4j_connected,
            "activeRecordsCount": len([n for n in nodes if n["type"] == "record"]),
            "documentsCount": len(self.documents)
        }
