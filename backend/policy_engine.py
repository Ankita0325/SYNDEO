import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Tuple

class PolicyEngine:
    """
    Deterministic Security & Privacy Policy Engine (Authority).
    NOTE: This is NOT an AI Agent. It is a strictly deterministic gatekeeper that enforces:
    - Field-level scope boundary (403 OUT_OF_SCOPE)
    - Revocation status (403 SHARE_REVOKED)
    - Expiry duration (403 SHARE_EXPIRED)
    - Privacy-preserving range transformations for sensitive financial data
    - Principle: Agents reason, Policy Engine decides and enforces.
    """
    def __init__(self):
        self.shares: Dict[str, Dict[str, Any]] = {}

    def transform_financial_value(self, raw_value: float) -> str:
        """Transforms exact salary/income to privacy-preserving range."""
        if raw_value < 25000:
            return "Below ₹25,000"
        elif raw_value <= 50000:
            return "₹25k–₹50k"
        elif raw_value <= 75000:
            return "₹50k–₹75k"
        elif raw_value <= 100000:
            return "₹75k–₹100k"
        else:
            return "Above ₹1,00,000"

    def create_share_scope(
        self,
        recipient: str,
        purpose: str,
        allowed_fields: List[Dict[str, Any]],
        expiry_duration_hours: Optional[int] = 24
    ) -> Dict[str, Any]:
        share_id = f"share-{uuid.uuid4().hex[:8]}"
        share_token = f"SYN-PROOF-{uuid.uuid4().hex[:12].upper()}"
        
        now = datetime.now(timezone.utc)
        if expiry_duration_hours:
            expiry_time = now + timedelta(hours=expiry_duration_hours)
            expiry_str = f"Expires in {expiry_duration_hours} hours ({expiry_time.strftime('%d %b %Y, %I:%M %p')})"
        else:
            expiry_time = now + timedelta(days=3650) # Permanent until revoked
            expiry_str = "Permanent (Until revoked)"

        # Pre-compute transformed scoped payload
        scoped_payload = {}
        for f in allowed_fields:
            key = f.get("fieldName") or f.get("key") or f.get("name")
            if not key:
                continue
            val = f.get("value") or f.get("defaultValue") or "Verified on SYNDEO Graph"
            raw_num = f.get("rawNumericValue")

            # Apply financial privacy transformation if income
            if any(w in key.lower() for w in ["salary", "income", "payslip", "compensation"]):
                if raw_num is not None:
                    try:
                        val = self.transform_financial_value(float(raw_num))
                    except Exception:
                        val = "₹50k–₹75k (Transformed)"
                else:
                    val = "₹50k–₹75k (Transformed)"

            scoped_payload[key] = {
                "value": val,
                "confidence": f.get("confidence", "evidence-backed"),
                "assuranceLevel": f.get("assuranceLevel", "LEVEL_2_EVIDENCE_ATTACHED"),
                "evidenceDocName": f.get("evidenceDocName")
            }

        share_obj = {
            "id": share_id,
            "shareToken": share_token,
            "recipient": recipient,
            "purpose": purpose,
            "allowedFields": list(scoped_payload.keys()),
            "scopedPayload": scoped_payload,
            "createdAt": now.isoformat(),
            "expiryTime": expiry_time.isoformat(),
            "expiry": expiry_str,
            "status": "Active",
            "accessCount": 0
        }

        self.shares[share_id] = share_obj
        self.shares[share_token] = share_obj
        return share_obj

    def access_share_proof(self, share_token_or_id: str, requested_field: Optional[str] = None) -> Tuple[int, str, Optional[Dict[str, Any]]]:
        """
        Backend Scope & Security Enforcement.
        """
        share = self.shares.get(share_token_or_id)
        if not share:
            return 404, "SHARE_NOT_FOUND: Invalid or non-existent share link", None

        if share["status"] == "Revoked":
            return 403, "403 SHARE_REVOKED: The user has revoked access to this information", None

        # Check Expiration
        expiry_dt = datetime.fromisoformat(share["expiryTime"])
        if datetime.now(timezone.utc) > expiry_dt:
            share["status"] = "Expired"
            return 403, "403 SHARE_EXPIRED: Access token has expired", None

        # If requesting specific field, strictly enforce scope boundary
        if requested_field:
            matched_key = None
            for key in share["allowedFields"]:
                if key.strip().lower() == requested_field.strip().lower():
                    matched_key = key
                    break
            
            if not matched_key:
                return 403, f"403 OUT_OF_SCOPE: Requester asked for '{requested_field}' which is outside the approved share scope", None

        share["accessCount"] += 1
        return 200, "SUCCESS: Proof verified by Policy Engine", share["scopedPayload"]

    def revoke_share(self, share_id_or_token: str) -> bool:
        share = self.shares.get(share_id_or_token)
        if not share:
            return False
        share["status"] = "Revoked"
        share["expiry"] = "Revoked by user"
        return True

    def get_all_shares(self) -> List[Dict[str, Any]]:
        seen = set()
        res = []
        for s in self.shares.values():
            if s["id"] not in seen:
                seen.add(s["id"])
                res.append(s)
        return res
