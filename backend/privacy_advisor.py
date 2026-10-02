import json
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger("syndeo.privacy_advisor")

class PrivacyAdvisor:
    """
    AI Privacy Advisor Agent.
    Role: Analyzes requested fields against the requester's stated purpose,
    reasons about principle of data minimization (GDPR / DPDP Act),
    and recommends which fields should be approved, transformed, or denied.
    
    Architectural Rule:
    Agents reason -> Policy Engine decides & enforces.
    """
    def __init__(self, sarvam_client: Optional[Any] = None):
        self.sarvam_client = sarvam_client
        self.category_risk_levels = {
            "identity": {
                "Full Legal Name": "LOW",
                "Date of Birth": "MEDIUM",
                "Primary Email": "LOW",
                "Phone Number": "LOW",
                "Residential Address": "MEDIUM",
                "Passport Number": "HIGH",
                "GitHub Profile": "LOW",
                "LinkedIn Profile": "LOW",
            },
            "education": {
                "College / University": "LOW",
                "Degree & Major": "LOW",
                "Cumulative GPA (CGPA)": "LOW",
                "Capstone Project Collaborator": "LOW",
            },
            "employment": {
                "Current Company": "LOW",
                "Designation / Role": "LOW",
                "Engineering Peer & Reviewer": "LOW",
                "Previous Employer": "LOW",
                "Monthly Salary (Payslip)": "CRITICAL",
                "Annual Compensation": "CRITICAL",
            },
            "finance": {
                "Primary Tax Identifier (PAN)": "HIGH",
                "Primary Salary Bank": "CRITICAL",
                "Credit Score Band": "MEDIUM",
                "Bank Account Number": "CRITICAL",
            },
            "healthcare": {
                "Blood Group": "MEDIUM",
                "Emergency Contact & Kin": "LOW",
                "Health Insurance Provider": "MEDIUM",
                "Medical History / Prescriptions": "CRITICAL",
            }
        }

    def evaluate_request(
        self,
        recipient: str,
        purpose: str,
        requested_fields: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyzes requested fields against the purpose.
        Returns detailed privacy evaluation with field-by-field verdicts & reasoning.
        """
        purpose_lower = purpose.lower()
        recipient_lower = recipient.lower()

        # Determine context category
        context = "general"
        if any(w in purpose_lower or w in recipient_lower for w in ["job", "career", "interview", "employment", "hire", "recruiter", "work"]):
            context = "job_application"
        elif any(w in purpose_lower or w in recipient_lower for w in ["rent", "lease", "landlord", "apartment", "housing", "tenant"]):
            context = "rental_application"
        elif any(w in purpose_lower or w in recipient_lower for w in ["bank", "loan", "kyc", "credit", "finance", "mortgage"]):
            context = "financial_kyc"
        elif any(w in purpose_lower or w in recipient_lower for w in ["doctor", "hospital", "clinic", "health", "medical", "insurance"]):
            context = "healthcare_consultation"

        evaluations = []
        overall_risk = "LOW"
        recommended_approvals = []
        requires_user_attention = []
        recommended_denials = []

        for field in requested_fields:
            field_name = field.get("fieldName") or field.get("key") or field.get("name") or "Unknown Field"
            field_category = field.get("category", "general")
            field_name_lower = field_name.lower()

            # Base risk assessment
            risk_level = "LOW"
            for cat, fields in self.category_risk_levels.items():
                for f_name, r_level in fields.items():
                    if f_name.lower() in field_name_lower or field_name_lower in f_name.lower():
                        risk_level = r_level
                        field_category = cat
                        break

            verdict = "ALLOW"
            reasoning = f"Field is appropriate for {purpose}."
            transformation_suggested = None

            # Contextual Reasoning Rules
            if context == "job_application":
                if any(w in field_name_lower for w in ["salary", "payslip", "compensation"]):
                    verdict = "TRANSFORM_RANGE"
                    reasoning = "Exact salary disclosure weakens negotiation leverage. Recommend disclosing as a privacy-preserving income bracket."
                    transformation_suggested = "Range Transformation (e.g. ₹50k–₹75k)"
                    overall_risk = "MEDIUM" if overall_risk != "HIGH" else overall_risk
                elif any(w in field_name_lower for w in ["medical", "health", "blood", "prescription"]):
                    verdict = "DENY"
                    reasoning = "Health data is unnecessary and excessive for a professional job application (violates data minimization principles)."
                    overall_risk = "HIGH"
                elif any(w in field_name_lower for w in ["bank account", "tax identifier", "pan"]):
                    verdict = "REQUIRES_CONFIRMATION"
                    reasoning = "Tax / Bank details are only needed upon final onboarding, not during initial application."
                    overall_risk = "MEDIUM"
                else:
                    verdict = "ALLOW"
                    reasoning = "Identity, professional background, and education are standard and relevant for hiring."

            elif context == "rental_application":
                if any(w in field_name_lower for w in ["medical", "health"]):
                    verdict = "DENY"
                    reasoning = "Medical information is irrelevant for tenancy agreements."
                    overall_risk = "HIGH"
                elif any(w in field_name_lower for w in ["salary", "income", "credit score"]):
                    verdict = "TRANSFORM_RANGE"
                    reasoning = "Landlord requires proof of solvency; recommend disclosing Credit Band or Income Range rather than raw bank statements."
                    transformation_suggested = "Range / Credit Band verification"
                else:
                    verdict = "ALLOW"
                    reasoning = "Standard identity and contact verification for tenancy agreement."

            elif context == "healthcare_consultation":
                if any(w in field_name_lower for w in ["salary", "income", "tax"]):
                    verdict = "DENY"
                    reasoning = "Financial records are irrelevant to clinical consultations."
                else:
                    verdict = "ALLOW"
                    reasoning = "Medical and emergency contact information are vital for health consultations."

            else:
                # General default rule
                if risk_level in ["CRITICAL", "HIGH"]:
                    verdict = "REQUIRES_CONFIRMATION"
                    reasoning = f"Sensitive attribute ({risk_level} risk). Verify that recipient strictly requires this."
                    overall_risk = "HIGH"
                else:
                    verdict = "ALLOW"
                    reasoning = "Standard attribute disclosure."

            eval_item = {
                "fieldName": field_name,
                "category": field_category,
                "riskLevel": risk_level,
                "verdict": verdict,
                "reasoning": reasoning,
                "transformationSuggested": transformation_suggested,
                "fieldPayload": field
            }
            evaluations.append(eval_item)

            if verdict in ["ALLOW", "TRANSFORM_RANGE"]:
                recommended_approvals.append(eval_item)
            elif verdict == "REQUIRES_CONFIRMATION":
                requires_user_attention.append(eval_item)
            else:
                recommended_denials.append(eval_item)

        summary_reasoning = (
            f"Evaluated {len(requested_fields)} requested fields for '{recipient}' ({purpose}). "
            f"{len(recommended_approvals)} recommended for release, {len(requires_user_attention)} flagged for user review, "
            f"and {len(recommended_denials)} flagged as excessive data overreach."
        )

        return {
            "recipient": recipient,
            "purpose": purpose,
            "context": context,
            "overallRisk": overall_risk,
            "summaryReasoning": summary_reasoning,
            "fieldEvaluations": evaluations,
            "recommendedApprovals": recommended_approvals,
            "requiresUserAttention": requires_user_attention,
            "recommendedDenials": recommended_denials,
            "policyEnforcementReady": True
        }
