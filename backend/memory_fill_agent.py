"""
SYNDEO MemoryFill Agent & Policy Enforcement Engine.

Responsibilities:
1. Receives scanned form field metadata from the Chrome Extension.
2. Maps fields deterministically against the SYNDEO Memory Schema and active GraphStore claims.
3. Enforces strict sensitivity classifications (LOW, MEDIUM, HIGH, RESTRICTED).
4. Handles ambiguities explicitly (never guesses).
5. Defends against prompt injection (treats field labels and placeholders strictly as data).
6. Generates short-lived cryptographic approval contexts for the Extension.
"""

from typing import List, Dict, Any, Optional, Tuple
import re
import uuid
import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("syndeo.memory_fill")

# Sensitivity tiers according to SYNDEO Security Architecture
SENSITIVITY_TIERS = {
    # LOW: Safe for autofill with user confirmation
    "LOW": [
        "Full Legal Name", "First Name", "Last Name", "GitHub Profile", "LinkedIn Profile",
        "Discord Profile", "Twitter / X Profile", "Portfolio Website", "Designation / Role",
        "Current Company", "College / University", "Degree & Major"
    ],
    # MEDIUM: Standard personal info
    "MEDIUM": [
        "Primary Email", "Primary Phone", "Cumulative GPA (CGPA)", "Engineering Peer & Reviewer",
        "Previous Employer"
    ],
    # HIGH: Requires explicit attention & approval
    "HIGH": [
        "Date of Birth", "Residential Address", "Monthly Salary (Payslip)", "Credit Score Band",
        "Emergency Contact & Kin", "Health Insurance Provider"
    ],
    # RESTRICTED: Never autofilled in MVP
    "RESTRICTED": [
        "Primary Tax Identifier (PAN)", "Aadhaar Number", "Social Security Number",
        "Passport Number", "Primary Salary Bank", "Blood Group", "Medical Record", "Password"
    ]
}

def get_field_sensitivity(field_name: str) -> str:
    name_clean = field_name.strip().lower()
    for tier, fields in SENSITIVITY_TIERS.items():
        for f in fields:
            if f.lower() in name_clean or name_clean in f.lower():
                return tier
    if any(k in name_clean for k in ["pan", "tax id", "ssn", "aadhaar", "bank", "password", "pin", "cvv", "secret"]):
        return "RESTRICTED"
    if any(k in name_clean for k in ["birth", "dob", "salary", "address", "kin", "insurance"]):
        return "HIGH"
    if any(k in name_clean for k in ["email", "phone", "mobile", "gpa", "cgpa"]):
        return "MEDIUM"
    return "LOW"


class MemoryFillAgent:
    """
    Deterministic MemoryFill Agent that maps web form fields to authorized Neo4j/Graph claims.
    """

    def __init__(self, graph_store):
        self.graph_store = graph_store
        # In-memory store of active short-lived approval contexts
        self.active_approvals: Dict[str, Dict[str, Any]] = {}

    def _normalize_text(self, text: Optional[str]) -> str:
        if not text:
            return ""
        return re.sub(r"[^a-zA-Z0-9\s]", " ", text).lower().strip()

    def _match_field_to_claim(
        self,
        field: Dict[str, Any],
        active_claims: List[Any]
    ) -> Tuple[Optional[Any], float, str, Optional[str]]:
        """
        Determines best matching claim for a given scanned field.
        Returns: (matched_claim, confidence, reason, ambiguity_note)
        """
        label = field.get("label", "")
        name = field.get("name", "")
        placeholder = field.get("placeholder", "")
        autocomplete = (field.get("autocomplete") or "").lower()
        input_type = (field.get("type") or "text").lower()

        combined_text = f"{label} {name} {placeholder} {autocomplete}".lower()
        combined_norm = self._normalize_text(combined_text)

        # 1. Defend against password and restricted controls
        if input_type == "password" or any(p in combined_norm for p in ["password", "passcode", "otp", "pin", "cvv"]):
            return None, 0.0, "Blocked: Password or sensitive secret field", "RESTRICTED_FIELD"

        # 2. Check Autocomplete standards first (Highest Precision)
        if autocomplete:
            if autocomplete in ["name", "username"] or "name" == autocomplete:
                c = self._find_claim(["full legal name", "name", "full name"], active_claims)
                if c: return c, 0.99, "Matched standard autocomplete='name'", None
            elif autocomplete in ["email", "username"]:
                c = self._find_claim(["primary email", "email"], active_claims)
                if c: return c, 0.99, "Matched standard autocomplete='email'", None
            elif autocomplete in ["tel", "tel-national", "tel-country-code"]:
                c = self._find_claim(["primary phone", "phone", "mobile"], active_claims)
                if c: return c, 0.98, "Matched standard autocomplete='tel'", None
            elif autocomplete in ["organization", "organization-title"]:
                c = self._find_claim(["current company", "college / university"], active_claims)
                if c: return c, 0.95, f"Matched autocomplete='{autocomplete}'", None
            elif autocomplete in ["street-address", "address-line1"]:
                c = self._find_claim(["residential address", "address"], active_claims)
                if c: return c, 0.97, "Matched standard autocomplete='address'", None

        # 3. Specific semantic pattern matching with strict disambiguation
        
        # GitHub
        if any(k in combined_norm for k in ["github", "git hub", "gh link", "github profile", "github url"]):
            c = self._find_claim(["github profile", "github"], active_claims)
            if c: return c, 0.98, "Matched GitHub profile pattern", None

        # LinkedIn
        if any(k in combined_norm for k in ["linkedin", "linked in", "linkedin profile", "linkedin url"]):
            c = self._find_claim(["linkedin profile", "linkedin"], active_claims)
            if c: return c, 0.98, "Matched LinkedIn profile pattern", None

        # Discord
        if any(k in combined_norm for k in ["discord", "discord tag", "discord username", "discord id"]):
            c = self._find_claim(["discord profile", "discord"], active_claims)
            if c: return c, 0.98, "Matched Discord handle pattern", None

        # Twitter / X
        if any(k in combined_norm for k in ["twitter", "x profile", "x handle", "tweet"]):
            c = self._find_claim(["twitter / x profile", "twitter"], active_claims)
            if c: return c, 0.98, "Matched Twitter / X pattern", None

        # Portfolio / Website
        if any(k in combined_norm for k in ["portfolio", "personal website", "personal site", "portfolio url"]):
            c = self._find_claim(["portfolio website", "portfolio"], active_claims)
            if c: return c, 0.96, "Matched Portfolio website pattern", None

        # Email
        if input_type == "email" or any(k in combined_norm for k in ["email", "mail id", "e mail", "work email"]):
            c = self._find_claim(["primary email", "email"], active_claims)
            if c: return c, 0.99, "Matched Email input type and label", None

        # Phone / Mobile (Check for Emergency Kin ambiguity)
        if input_type == "tel" or any(k in combined_norm for k in ["phone", "mobile", "contact no", "telephone"]):
            if "emergency" in combined_norm or "kin" in combined_norm:
                c = self._find_claim(["emergency contact & kin", "emergency contact"], active_claims)
                if c: return c, 0.96, "Matched Emergency Contact", None
            c = self._find_claim(["primary phone", "phone", "mobile"], active_claims)
            if c: return c, 0.95, "Matched Primary Phone", None

        # College / University / Education
        if any(k in combined_norm for k in ["college", "university", "school", "institution", "campus", "alma mater"]):
            c = self._find_claim(["college / university", "college"], active_claims)
            if c: return c, 0.97, "Matched College / University institution", None

        # Degree / Major
        if any(k in combined_norm for k in ["degree", "major", "qualification", "course of study", "branch"]):
            c = self._find_claim(["degree & major", "degree"], active_claims)
            if c: return c, 0.96, "Matched Degree and Major field", None

        # GPA / CGPA / Marks
        if any(k in combined_norm for k in ["cgpa", "gpa", "cumulative grade", "percentage"]):
            c = self._find_claim(["cumulative gpa (cgpa)", "gpa"], active_claims)
            if c: return c, 0.98, "Matched Cumulative CGPA", None

        # Current Company / Employer
        if any(k in combined_norm for k in ["current company", "company name", "organization", "employer", "workplace"]):
            if "previous" in combined_norm or "former" in combined_norm or "past" in combined_norm:
                c = self._find_claim(["previous employer"], active_claims)
                if c: return c, 0.95, "Matched Previous Employer", None
            c = self._find_claim(["current company"], active_claims)
            if c: return c, 0.97, "Matched Current Company", None

        # Designation / Role / Job Title
        if any(k in combined_norm for k in ["job title", "designation", "role", "position", "occupation"]):
            c = self._find_claim(["designation / role", "designation"], active_claims)
            if c: return c, 0.96, "Matched Professional Designation", None

        # Full Name / Legal Name
        if any(k in combined_norm for k in ["full name", "legal name", "your name", "candidate name", "applicant name"]) or (
            "name" in combined_norm.split() and not any(x in combined_norm for x in ["company", "college", "school", "file", "doc"])
        ):
            c = self._find_claim(["full legal name", "name"], active_claims)
            if c: return c, 0.98, "Matched Full Legal Name", None

        # Date of Birth
        if any(k in combined_norm for k in ["date of birth", "dob", "birth date", "birthdate"]):
            c = self._find_claim(["date of birth"], active_claims)
            if c: return c, 0.97, "Matched Date of Birth", None

        # Residential Address
        if any(k in combined_norm for k in ["residential address", "home address", "permanent address", "street address", "address"]):
            c = self._find_claim(["residential address"], active_claims)
            if c: return c, 0.95, "Matched Residential Address", None

        return None, 0.0, "No confident match in personal graph", None

    def _find_claim(self, candidate_names: List[str], claims: List[Any]) -> Optional[Any]:
        # 1. First pass: exact normalized match
        for candidate in candidate_names:
            c_norm = candidate.strip().lower()
            for claim in claims:
                if claim.field_name.strip().lower() == c_norm:
                    return claim
        # 2. Second pass: containment match
        for candidate in candidate_names:
            c_norm = candidate.strip().lower()
            if len(c_norm) >= 3:
                for claim in claims:
                    cf_norm = claim.field_name.strip().lower()
                    if c_norm in cf_norm or cf_norm in c_norm:
                        return claim
        return None

    def generate_mapping(
        self,
        origin: str,
        fields: List[Dict[str, Any]],
        user_name: str = "Indresh"
    ) -> Dict[str, Any]:
        """
        Processes scanned fields, maps against user claims, validates policy,
        and returns safe mapping preview + short-lived approval token.
        """
        active_claims = [c for c in self.graph_store.nodes.values() if c.status == "ACTIVE"]

        mappings = []
        mappable_count = 0

        for idx, field in enumerate(fields):
            field_id = field.get("id") or field.get("field_id") or f"f_{idx:03d}"
            tag = field.get("tag", "input")
            input_type = field.get("type", "text")
            label = field.get("label", "Field")

            matched_claim, confidence, reason, ambiguity = self._match_field_to_claim(field, active_claims)

            if matched_claim:
                sensitivity = get_field_sensitivity(matched_claim.field_name)

                # Policy gate: Restricted fields are never autofilled in MVP
                if sensitivity == "RESTRICTED":
                    mappings.append({
                        "field_id": field_id,
                        "field_label": label,
                        "field_type": input_type,
                        "status": "BLOCKED",
                        "reason": f"Restricted high-security attribute ({matched_claim.field_name}) cannot be autofilled.",
                        "confidence": confidence,
                        "sensitivity": sensitivity,
                        "assurance": matched_claim.assurance_level
                    })
                    continue

                mappable_count += 1
                mappings.append({
                    "field_id": field_id,
                    "field_label": label,
                    "field_type": input_type,
                    "target_claim_name": matched_claim.field_name,
                    "target_category": matched_claim.category,
                    "claim_id": matched_claim.id,
                    "memory_path": f"{matched_claim.category.capitalize()}.{matched_claim.field_name}",
                    # Redacted preview value for safe display in popup review
                    "preview_value": matched_claim.field_value if sensitivity in ["LOW", "MEDIUM"] else "••••••••",
                    "confidence": confidence,
                    "sensitivity": sensitivity,
                    "assurance": matched_claim.assurance_level,
                    "evidence_doc": matched_claim.evidence_doc_name,
                    "status": "READY",
                    "reason": reason
                })
            else:
                mappings.append({
                    "field_id": field_id,
                    "field_label": label,
                    "field_type": input_type,
                    "status": "UNMAPPED",
                    "reason": reason or "No matching attribute in your vault",
                    "confidence": 0.0,
                    "sensitivity": "LOW",
                    "assurance": "NONE"
                })

        # Create 5-minute approval context bound to this origin and fields
        approval_id = f"appr-{uuid.uuid4().hex[:12]}"
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
        
        self.active_approvals[approval_id] = {
            "approval_id": approval_id,
            "origin": origin,
            "user_name": user_name,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": expires_at.isoformat(),
            "expires_at_dt": expires_at,
            "mappings": {m["field_id"]: m for m in mappings if m.get("status") == "READY"}
        }

        # Cleanup expired contexts
        now = datetime.now(timezone.utc)
        self.active_approvals = {
            k: v for k, v in self.active_approvals.items()
            if v["expires_at_dt"] > now
        }

        return {
            "success": True,
            "origin": origin,
            "approval_id": approval_id,
            "expires_at": expires_at.isoformat(),
            "total_scanned": len(fields),
            "mappable_count": mappable_count,
            "mappings": mappings
        }

    def execute_approved_fill(
        self,
        approval_id: str,
        origin: str,
        approved_field_ids: List[str]
    ) -> Tuple[bool, str, List[Dict[str, Any]]]:
        """
        Validates user approval context and returns authorized fill values.
        """
        context = self.active_approvals.get(approval_id)
        if not context:
            return False, "Approval context expired or invalid. Please scan again.", []

        now = datetime.now(timezone.utc)
        if context["expires_at_dt"] < now:
            del self.active_approvals[approval_id]
            return False, "Approval context expired. Please re-approve.", []

        # Validate origin match
        if context["origin"].lower().rstrip("/") != origin.lower().rstrip("/"):
            return False, f"Origin mismatch: Expected {context['origin']}, received {origin}", []

        ready_mappings = context["mappings"]
        approved_fill_instructions = []

        for fid in approved_field_ids:
            mapping = ready_mappings.get(fid)
            if not mapping:
                continue

            claim_id = mapping.get("claim_id")
            claim = self.graph_store.nodes.get(claim_id)
            if not claim or claim.status != "ACTIVE":
                continue

            sensitivity = get_field_sensitivity(claim.field_name)
            if sensitivity == "RESTRICTED":
                continue

            approved_fill_instructions.append({
                "field_id": fid,
                "claim_id": claim.id,
                "memory_path": mapping["memory_path"],
                "claim_name": claim.field_name,
                "value": claim.field_value,
                "raw_numeric_value": claim.raw_numeric_value,
                "assurance": claim.assurance_level,
                "evidence_doc": claim.evidence_doc_name,
                "sensitivity": sensitivity
            })

        return True, f"Authorized {len(approved_fill_instructions)} fields for fill.", approved_fill_instructions
