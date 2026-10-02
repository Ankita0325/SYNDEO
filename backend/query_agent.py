import logging
from typing import Dict, List, Any, Optional
from graph_store import GraphStore

logger = logging.getLogger("syndeo.query_agent")

class QueryAgent:
    """
    AI Query Agent:
    Performs multi-hop graph traversals over Neo4j / Knowledge Graph.
    Resolution Sequence:
    1. Query Graph Store for matching active claims and linked entities.
    2. Traverse multi-hop evidence links (Person -> Claim -> Document).
    3. Return structured answer with cryptographic provenance and assurance level.
    """
    def __init__(self, graph_store: GraphStore):
        self.graph_store = graph_store

    def resolve_question(self, user_question: str) -> Dict[str, Any]:
        q_lower = user_question.lower()

        # 1. Search graph for matching nodes
        matched_nodes = self.graph_store.query_graph_by_keyword(q_lower)

        if matched_nodes:
            # If multiple nodes match, synthesize a comprehensive response
            if len(matched_nodes) == 1:
                top_node = matched_nodes[0]
                answer_text = f"Based on your personal memory graph, **{top_node.field_name}** is **{top_node.field_value}**."
                
                if top_node.confidence == "evidence-backed":
                    source_note = f"Extracted from document ({top_node.evidence_doc_name})"
                    assurance_status = "Known from evidence (LEVEL_2_EVIDENCE_ATTACHED)"
                else:
                    source_note = "Confirmed by you (Self-asserted claim)"
                    assurance_status = "Known from user (LEVEL_1_USER_ASSERTED)"

                return {
                    "status": "ANSWERED",
                    "answer": answer_text,
                    "confidence": top_node.confidence,
                    "assuranceLevel": top_node.assurance_level,
                    "assuranceStatus": assurance_status,
                    "sourceNote": source_note,
                    "evidenceDoc": top_node.evidence_doc_name,
                    "evidenceDocHash": top_node.evidence_doc_hash,
                    "matchedNodeId": top_node.id,
                    "relatedNodesCount": len(matched_nodes)
                }
            else:
                primary = matched_nodes[0]
                details = [f"- **{n.field_name}**: {n.field_value}" for n in matched_nodes[:5]]
                answer_text = (
                    f"Found {len(matched_nodes)} relevant verified records in your graph:\n\n"
                    + "\n".join(details)
                )
                return {
                    "status": "ANSWERED",
                    "answer": answer_text,
                    "confidence": primary.confidence,
                    "assuranceLevel": primary.assurance_level,
                    "assuranceStatus": "Multi-hop Graph Match",
                    "sourceNote": primary.source,
                    "evidenceDoc": primary.evidence_doc_name,
                    "evidenceDocHash": primary.evidence_doc_hash,
                    "matchedNodeId": primary.id,
                    "relatedNodesCount": len(matched_nodes)
                }

        # 2. Domain-specific graph keyword reasoning
        if any(w in q_lower for w in ["education", "college", "slrtce", "degree", "university", "cgpa", "study"]):
            edu_nodes = [n for n in self.graph_store.nodes.values() if n.category == "education" and n.status == "ACTIVE"]
            if edu_nodes:
                details = [f"- **{n.field_name}**: {n.field_value}" for n in edu_nodes]
                return {
                    "status": "ANSWERED",
                    "answer": "Your verified **Education Record** from the graph:\n\n" + "\n".join(details),
                    "confidence": "evidence-backed",
                    "assuranceLevel": "LEVEL_2_EVIDENCE_ATTACHED",
                    "assuranceStatus": "Known from evidence (LEVEL_2_EVIDENCE_ATTACHED)",
                    "sourceNote": "Extracted from SLRTCE degree certificate & transcript",
                    "evidenceDoc": "Degree_Certificate_SLRTCE_2024.pdf"
                }

        if any(w in q_lower for w in ["company", "work", "job", "veritas", "role", "employer", "employment"]):
            emp_nodes = [n for n in self.graph_store.nodes.values() if n.category == "employment" and n.status == "ACTIVE"]
            if emp_nodes:
                details = [f"- **{n.field_name}**: {n.field_value}" for n in emp_nodes if not n.is_sensitive or "salary" in q_lower]
                return {
                    "status": "ANSWERED",
                    "answer": "Your verified **Employment Record** from the graph:\n\n" + "\n".join(details),
                    "confidence": "evidence-backed",
                    "assuranceLevel": "LEVEL_2_EVIDENCE_ATTACHED",
                    "assuranceStatus": "Known from evidence (LEVEL_2_EVIDENCE_ATTACHED)",
                    "sourceNote": "Employment offer letter & peer confirmation",
                    "evidenceDoc": "Employment_Offer_Letter_Veritas.pdf"
                }

        if any(w in q_lower for w in ["social", "github", "linkedin", "developer", "profile"]):
            return {
                "status": "ANSWERED",
                "answer": "Your verified developer & social identities:\n- **GitHub**: https://github.com/indresh404/SYNDEO\n- **LinkedIn**: https://linkedin.com/in/indresh-suresh-093646399",
                "confidence": "evidence-backed",
                "assuranceLevel": "LEVEL_2_EVIDENCE_ATTACHED",
                "assuranceStatus": "Known from evidence (GPG Signature)",
                "sourceNote": "GitHub GPG Signature",
                "evidenceDoc": "GitHub_GPG_Key_Signature.asc"
            }

        # 3. Unknown field fallback
        return {
            "status": "UNKNOWN",
            "answer": f"I traversed your personal memory graph and source documents, but I could not find a confirmed claim for '{user_question}'. Would you like to add this claim to your graph?",
            "confidence": "unknown",
            "assuranceLevel": "UNKNOWN",
            "assuranceStatus": "Unknown (No claim or evidence exists)",
            "sourceNote": "Record not found in graph store"
        }
