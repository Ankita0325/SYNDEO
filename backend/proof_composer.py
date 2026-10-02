import base64
import io
from typing import Dict, List, Any
import qrcode
from policy_engine import PolicyEngine

class ProofComposer:
    """
    Proof Composer & Verification Engine.
    Maps a request (e.g. Acme University admissions) to required claims, applies privacy minimization via PolicyEngine,
    composes scoped proof tokens, and outputs QR code data URLs.
    """
    def __init__(self, policy_engine: PolicyEngine):
        self.policy_engine = policy_engine

    def compose_proof(
        self,
        recipient: str,
        purpose: str,
        requested_fields: List[Dict[str, Any]],
        expiry_hours: int = 24
    ) -> Dict[str, Any]:
        
        share_obj = self.policy_engine.create_share_scope(
            recipient=recipient,
            purpose=purpose,
            allowed_fields=requested_fields,
            expiry_duration_hours=expiry_hours
        )

        # Generate QR code Data URI
        qr_data_url = self.generate_qr_code(share_obj["shareToken"])
        share_obj["qrDataUrl"] = qr_data_url

        return share_obj

    def generate_qr_code(self, token_or_url: str) -> str:
        try:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_M,
                box_size=8,
                border=2,
            )
            qr.add_data(token_or_url)
            qr.make(fit=True)
            img = qr.make_image(fill_color="#131317", back_color="white")
            
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
            return f"data:image/png;base64,{b64_str}"
        except Exception:
            return ""
