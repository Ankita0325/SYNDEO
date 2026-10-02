import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, List, Any, Tuple

class AuditLogger:
    """
    Tamper-Evident Hash-Chained Audit Log Engine.
    Formula: current_hash = SHA-256(previous_hash + action + recipient + purpose + timestamp)
    Ensures log history cannot be silently edited or altered.
    """
    def __init__(self):
        self.logs: List[Dict[str, Any]] = []
        self.last_hash: str = "GENESIS_HASH_00000000000000000000000000000000"

    def log_event(
        self,
        action: str,
        recipient: str,
        purpose: str,
        fields_accessed: List[str],
        assurance_status: str = "LEVEL_2_EVIDENCE_ATTACHED",
        share_id: str = "DIRECT"
    ) -> Dict[str, Any]:
        
        now_str = datetime.now(timezone.utc).strftime("%d %b %Y, %I:%M %p")
        raw_payload = f"{self.last_hash}:{action}:{recipient}:{purpose}:{json.dumps(fields_accessed)}:{now_str}"
        current_hash = hashlib.sha256(raw_payload.encode()).hexdigest()

        log_entry = {
            "id": f"log-{len(self.logs) + 1}",
            "shareId": share_id,
            "action": action,
            "recipient": recipient,
            "purpose": purpose,
            "fieldsAccessed": fields_accessed,
            "assuranceStatus": assurance_status,
            "previousHash": self.last_hash,
            "currentHash": current_hash,
            "timestamp": now_str
        }

        self.last_hash = current_hash
        self.logs.append(log_entry)
        return log_entry

    def get_audit_trail(self) -> List[Dict[str, Any]]:
        return self.logs

    def verify_chain_integrity(self) -> Tuple[bool, str]:
        prev = "GENESIS_HASH_00000000000000000000000000000000"
        for idx, entry in enumerate(self.logs):
            if entry["previousHash"] != prev:
                return False, f"TAMPER_DETECTED: Chain broken at log entry #{entry['id']}"
            raw_payload = f"{prev}:{entry['action']}:{entry['recipient']}:{entry['purpose']}:{json.dumps(entry['fieldsAccessed'])}:{entry['timestamp']}"
            expected_hash = hashlib.sha256(raw_payload.encode()).hexdigest()
            if entry["currentHash"] != expected_hash:
                return False, f"TAMPER_DETECTED: Hash mismatch at log entry #{entry['id']}"
            prev = entry["currentHash"]
        return True, "VERIFIED: Audit log hash chain intact and tamper-evident"
