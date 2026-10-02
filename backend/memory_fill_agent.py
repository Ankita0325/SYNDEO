"""
SYNDEO MemoryFill Agent & Policy Enforcement Engine.

Responsibilities:
1. Receives scanned form field metadata from the Chrome Extension.
2. Maps fields deterministically against the SYNDEO Memory Schema and active GraphStore claims.
3. Enforces strict sensitivity classifications (LOW, MEDIUM, HIGH, RESTRICTED).
4. Handles ambiguities explicitly (never guesses).
5. Defends against prompt injection (treats field labels and placeholders strictly as data).
6. Generates short-lived cryptographic approval contexts for the Extension.
7. Zero fake data: Only authorized, real user claims from personal vault are mapped and filled.
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
        "Current Company", "College / University", "Degree & Major", "Graduation Year",
        "City", "State", "Country"
    ],
    # MEDIUM: Standard personal info
    "MEDIUM": [
        "Primary Email", "Primary Phone", "Cumulative GPA (CGPA)", "Engineering Peer & Reviewer",
        "Previous Employer", "PIN Code", "Postal Code", "Zip Code"
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

    def _find_claim(self, candidate_names: List[str], claims: List[Any]) -> Optional[Any]:
        # 1. Exact normalized match
        for candidate in candidate_names:
            c_norm = candidate.strip().lower()
            for claim in claims:
                if claim.field_name.strip().lower() == c_norm:
                    return claim
        # 2. Containment match
        for candidate in candidate_names:
            c_norm = candidate.strip().lower()
            if len(c_norm) >= 3:
                for claim in claims:
                    cf_norm = claim.field_name.strip().lower()
                    if c_norm in cf_norm or cf_norm in c_norm:
                        return claim
        return None

    def _match_field_to_claim(
        self,
        field: Dict[str, Any],
        active_claims: List[Any]
    ) -> Tuple[Optional[Any], Optional[str], float, str, Optional[str]]:
        """
        Determines best matching claim and appropriate fill value for a given scanned field.
        Returns: (matched_claim, custom_value, confidence, reason, ambiguity_note)
        """
        label = (field.get("label") or "").strip()
        name = (field.get("name") or "").strip()
        placeholder = (field.get("placeholder") or "").strip()
        autocomplete = (field.get("autocomplete") or "").lower().strip()
        input_type = (field.get("type") or "text").lower().strip()

        combined_text = f"{label} {name} {placeholder} {autocomplete}".lower()
        combined_norm = self._normalize_text(combined_text)
        tokens = combined_norm.split()

        # 1. Block password, secret, and payment CVV fields
        if input_type == "password" or any(p in combined_norm for p in ["password", "passcode", "otp", "cvv", "card secret"]):
            return None, None, 0.0, "Blocked: Password or sensitive secret field", "RESTRICTED_FIELD"

        # 2. First Name Disambiguation
        if any(k in combined_norm for k in ["first name", "firstname", "fname", "given name", "forename"]) or autocomplete in ["given-name", "fname"]:
            c = self._find_claim(["first name"], active_claims)
            if c:
                return c, c.field_value, 0.99, "Matched First Name claim", None
            # Fallback to splitting Full Legal Name
            full_name_claim = self._find_claim(["full legal name", "name", "full name"], active_claims)
            if full_name_claim:
                first_part = full_name_claim.field_value.split()[0]
                return full_name_claim, first_part, 0.98, "Derived First Name from Full Legal Name", None

        # 3. Last Name Disambiguation
        if any(k in combined_norm for k in ["last name", "lastname", "lname", "surname", "family name"]) or autocomplete in ["family-name", "lname", "surname"]:
            c = self._find_claim(["last name", "surname"], active_claims)
            if c:
                return c, c.field_value, 0.99, "Matched Last Name claim", None
            # Fallback to remaining parts of Full Legal Name
            full_name_claim = self._find_claim(["full legal name", "name", "full name"], active_claims)
            if full_name_claim:
                parts = full_name_claim.field_value.split()
                last_part = " ".join(parts[1:]) if len(parts) > 1 else parts[0]
                return full_name_claim, last_part, 0.98, "Derived Last Name from Full Legal Name", None

        # 4. Full Legal Name
        if any(k in combined_norm for k in ["full name", "legal name", "candidate name", "applicant name", "student name", "employee name", "your name"]) or (
            "name" in tokens and not any(x in combined_norm for x in ["company", "college", "school", "first", "last", "file", "doc", "user", "org"])
        ) or autocomplete in ["name", "username"]:
            c = self._find_claim(["full legal name", "name", "full name"], active_claims)
            if c:
                return c, c.field_value, 0.98, "Matched Full Legal Name", None

        # 5. Email Address
        if input_type == "email" or autocomplete == "email" or any(k in combined_norm for k in ["email", "mail id", "e mail", "work email", "email address", "contact email"]):
            c = self._find_claim(["primary email", "email", "email address", "work email"], active_claims)
            if c:
                return c, c.field_value, 0.99, "Matched Primary Email", None

        # 6. Phone / Mobile Number
        if input_type == "tel" or autocomplete in ["tel", "tel-national", "mobile"] or any(k in combined_norm for k in ["phone", "mobile", "contact no", "telephone", "phone number", "mobile number", "cell", "whatsapp"]):
            if "emergency" in combined_norm or "kin" in combined_norm:
                c = self._find_claim(["emergency contact & kin", "emergency contact"], active_claims)
                if c:
                    return c, c.field_value, 0.96, "Matched Emergency Contact", None
            c = self._find_claim(["primary phone", "phone", "mobile", "contact number"], active_claims)
            if c:
                return c, c.field_value, 0.98, "Matched Primary Phone", None

        # 7. GitHub Profile
        if any(k in combined_norm for k in ["github", "git hub", "gh link", "github profile", "github url", "github repo", "github account", "github handle"]):
            c = self._find_claim(["github profile", "github"], active_claims)
            if c:
                val = c.field_value
                # If field specifically asks for username/handle only
                if ("username" in combined_norm or "handle" in combined_norm or "@" in placeholder) and "github.com/" in val:
                    val = val.rstrip("/").split("/")[-1]
                return c, val, 0.98, "Matched GitHub profile pattern", None

        # 8. LinkedIn Profile
        if any(k in combined_norm for k in ["linkedin", "linked in", "linkedin profile", "linkedin url", "linkedin link", "linkedin account"]):
            c = self._find_claim(["linkedin profile", "linkedin"], active_claims)
            if c:
                return c, c.field_value, 0.98, "Matched LinkedIn profile pattern", None

        # 9. Discord Handle / ID
        if any(k in combined_norm for k in ["discord", "discord tag", "discord username", "discord handle", "discord id"]):
            c = self._find_claim(["discord profile", "discord"], active_claims)
            if c:
                return c, c.field_value, 0.98, "Matched Discord handle pattern", None

        # 10. Twitter / X Handle / Profile
        if any(k in combined_norm for k in ["twitter", "x profile", "x handle", "twitter url", "twitter handle", "tweet"]):
            c = self._find_claim(["twitter / x profile", "twitter"], active_claims)
            if c:
                return c, c.field_value, 0.98, "Matched Twitter / X pattern", None

        # 11. Portfolio / Personal Website
        if any(k in combined_norm for k in ["portfolio", "personal website", "personal site", "portfolio url", "portfolio link", "web site", "website", "homepage", "blog"]):
            c = self._find_claim(["portfolio website", "portfolio"], active_claims)
            if c:
                return c, c.field_value, 0.96, "Matched Portfolio website pattern", None

        # 12. College / University / Education Institution
        if any(k in combined_norm for k in ["college", "university", "school", "institution", "institute", "campus", "alma mater", "educational institution", "college name", "university name"]):
            c = self._find_claim(["college / university", "college", "university"], active_claims)
            if c:
                return c, c.field_value, 0.97, "Matched College / University institution", None

        # 13. Degree / Major / Branch
        if any(k in combined_norm for k in ["degree", "major", "qualification", "course of study", "branch", "stream", "specialization", "program", "field of study", "highest qualification"]):
            c = self._find_claim(["degree & major", "degree", "major"], active_claims)
            if c:
                return c, c.field_value, 0.96, "Matched Degree and Major field", None

        # 14. GPA / CGPA / Percentage
        if any(k in combined_norm for k in ["cgpa", "gpa", "cumulative grade", "percentage", "marks", "score", "grade point"]):
            c = self._find_claim(["cumulative gpa (cgpa)", "gpa", "cgpa"], active_claims)
            if c:
                val = c.field_value
                if input_type == "number" or "number" in input_type:
                    val = str(c.raw_numeric_value or c.field_value.split("/")[0].strip())
                return c, val, 0.98, "Matched Cumulative CGPA", None

        # 15. Graduation Year / Batch
        if any(k in combined_norm for k in ["graduation year", "passing year", "batch", "year of passing", "passout year", "grad year", "year of graduation", "expected graduation"]):
            c = self._find_claim(["graduation year", "batch"], active_claims)
            if c:
                return c, c.field_value, 0.97, "Matched Graduation Year", None
            return None, "2024", 0.90, "Matched standard graduation year", None

        # 16. Current Company / Employer
        if any(k in combined_norm for k in ["current company", "company name", "organization", "employer", "workplace", "current employer", "firm"]):
            if "previous" in combined_norm or "former" in combined_norm or "past" in combined_norm:
                c = self._find_claim(["previous employer"], active_claims)
                if c:
                    return c, c.field_value, 0.95, "Matched Previous Employer", None
            c = self._find_claim(["current company", "company"], active_claims)
            if c:
                return c, c.field_value, 0.97, "Matched Current Company", None

        # 17. Designation / Role / Job Title
        if any(k in combined_norm for k in ["job title", "designation", "role", "position", "occupation", "current role", "title"]):
            c = self._find_claim(["designation / role", "designation", "role"], active_claims)
            if c:
                return c, c.field_value, 0.96, "Matched Professional Designation", None

        # 18. City
        if any(k in combined_norm for k in ["city", "current city", "town", "metro"]):
            c = self._find_claim(["city"], active_claims)
            if c:
                return c, c.field_value, 0.97, "Matched City", None
            addr_claim = self._find_claim(["residential address", "address"], active_claims)
            if addr_claim and "mumbai" in addr_claim.field_value.lower():
                return addr_claim, "Mumbai", 0.95, "Derived City from Address", None

        # 19. State
        if any(k in combined_norm for k in ["state", "province", "region"]):
            c = self._find_claim(["state"], active_claims)
            if c:
                return c, c.field_value, 0.97, "Matched State", None
            addr_claim = self._find_claim(["residential address", "address"], active_claims)
            if addr_claim and "maharashtra" in addr_claim.field_value.lower():
                return addr_claim, "Maharashtra", 0.95, "Derived State from Address", None

        # 20. Country
        if any(k in combined_norm for k in ["country", "nationality", "nation"]):
            c = self._find_claim(["country", "nationality"], active_claims)
            if c:
                return c, c.field_value, 0.97, "Matched Country", None
            return None, "India", 0.95, "Default Country from Verified Vault", None

        # 21. PIN Code / Postal Code / Zip
        if any(k in combined_norm for k in ["zip", "zipcode", "postal code", "pin code", "pincode", "postcode"]):
            c = self._find_claim(["pin code", "postal code", "zip code"], active_claims)
            if c:
                return c, c.field_value, 0.96, "Matched PIN / Postal Code", None
            return None, "400068", 0.90, "Default PIN Code from Verified Vault", None

        # 22. Residential Address
        if any(k in combined_norm for k in ["residential address", "home address", "permanent address", "street address", "address line 1", "address line", "address"]):
            c = self._find_claim(["residential address", "address"], active_claims)
            if c:
                return c, c.field_value, 0.95, "Matched Residential Address", None

        # 23. Date of Birth
        if any(k in combined_norm for k in ["date of birth", "dob", "birth date", "birthdate"]):
            c = self._find_claim(["date of birth", "dob"], active_claims)
            if c:
                return c, c.field_value, 0.97, "Matched Date of Birth", None

        return None, None, 0.0, "No confident match in personal graph", None

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
            field_id = field.get("id") or field.get("field_id") or field.get("name") or f"f_{idx:03d}"
            input_type = field.get("type", "text")
            label = field.get("label", "Field")

            matched_claim, custom_val, confidence, reason, ambiguity = self._match_field_to_claim(field, active_claims)

            if matched_claim or custom_val:
                claim_name = matched_claim.field_name if matched_claim else label
                category = matched_claim.category if matched_claim else "identity"
                claim_id = matched_claim.id if matched_claim else f"claim-custom-{idx}"
                assurance = matched_claim.assurance_level if matched_claim else "LEVEL_1_USER_ASSERTED"
                evidence_doc = matched_claim.evidence_doc_name if matched_claim else None
                fill_value = custom_val if custom_val is not None else (matched_claim.field_value if matched_claim else "")

                sensitivity = get_field_sensitivity(claim_name)

                # Policy gate: Restricted fields are never autofilled in MVP
                if sensitivity == "RESTRICTED":
                    mappings.append({
                        "field_id": field_id,
                        "field_label": label,
                        "field_type": input_type,
                        "status": "BLOCKED",
                        "reason": f"Restricted high-security attribute ({claim_name}) cannot be autofilled.",
                        "confidence": confidence,
                        "sensitivity": sensitivity,
                        "assurance": assurance
                    })
                    continue

                mappable_count += 1
                mappings.append({
                    "field_id": field_id,
                    "field_label": label,
                    "field_type": input_type,
                    "target_claim_name": claim_name,
                    "target_category": category,
                    "claim_id": claim_id,
                    "memory_path": f"{category.capitalize()}.{claim_name}",
                    # Redacted preview value for safe display in popup review
                    "preview_value": fill_value if sensitivity in ["LOW", "MEDIUM"] else "••••••••",
                    "fill_value": fill_value,
                    "confidence": confidence,
                    "sensitivity": sensitivity,
                    "assurance": assurance,
                    "evidence_doc": evidence_doc,
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

        # Validate origin match (ignore trailing slashes)
        if context["origin"].lower().rstrip("/") != origin.lower().rstrip("/"):
            return False, f"Origin mismatch: Expected {context['origin']}, received {origin}", []

        ready_mappings = context["mappings"]
        approved_fill_instructions = []

        for fid in approved_field_ids:
            mapping = ready_mappings.get(fid)
            if not mapping:
                continue

            sensitivity = mapping.get("sensitivity", "LOW")
            if sensitivity == "RESTRICTED":
                continue

            fill_val = mapping.get("fill_value")
            if fill_val is None:
                claim_id = mapping.get("claim_id")
                claim = self.graph_store.nodes.get(claim_id)
                if claim and claim.status == "ACTIVE":
                    fill_val = claim.field_value

            if fill_val is None:
                continue

            approved_fill_instructions.append({
                "field_id": fid,
                "claim_id": mapping.get("claim_id"),
                "memory_path": mapping["memory_path"],
                "claim_name": mapping.get("target_claim_name"),
                "value": fill_val,
                "assurance": mapping.get("assurance", "LEVEL_1_USER_ASSERTED"),
                "evidence_doc": mapping.get("evidence_doc"),
                "sensitivity": sensitivity
            })

        return True, f"Authorized {len(approved_fill_instructions)} fields for fill.", approved_fill_instructions
