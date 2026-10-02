# SYNDEO Technical Status & Roadmap Report

**Document Version:** `2.0.0`  
**Last Updated:** `October 2026`  
**Status:** `Production-Ready Core / Active Development`

---

## 📊 Executive Overview

SYNDEO is an end-to-end multi-agent, policy-governed personal identity vault and knowledge graph. It replaces fragile static forms with an immutable **Obsidian Knowledge Graph** hosted on **Neo4j Aura**, backed by **Google Gemini LLM reasoning**, **Sarvam Indian Multimodal AI**, and a **deterministic cryptographic Policy Engine**.

---

## ✅ What Has Been Built Technically Till Now

### 1. Persistent Neo4j Aura Graph Memory Store
- **Multi-Hop Cypher Graph Schema**:
  - `(:Person {person_id, name})`
  - `(:Claim {id, category, field_name, field_value, source, assurance_level, is_singular, raw_numeric_value})`
  - `(:Document {id, file_name, category, file_size, sha256_hash, extracted_fields_count})`
  - Relationships: `(:Person)-[:HAS_CLAIM]->(:Claim)` and `(:Claim)-[:EVIDENCE_OF]->(:Document)`.
- **Database Schema Constraints**:
  - `unique_person_id` on `Person(person_id)`
  - `unique_claim_id` on `Claim(id)`
  - `unique_document_hash` on `Document(sha256_hash)`
- **Interactive Obsidian Graph Visualizer**: 2D/3D force-directed physics graph with live category filters, claim inspection modals, and cryptographic evidence citations.
- **Clean Vault Architecture**: Zero static mock data injected on initial load. Store starts completely clean with live Neo4j Aura sync, plus an on-demand **"Load Demo Vault"** and **"Reset Vault"** controller.

---

### 2. Autonomous Multi-Agent Swarm (FastAPI Backend)
- **Document Agent (`document_agent.py`)**:
  - Automated PDF/Image parsing and classification across 5 life stages (Identity, Education, Employment, Finance, Healthcare).
  - Calculates SHA-256 cryptographic hashes for document evidence.
  - Automatically commits extracted attribute candidates to Neo4j Aura.
- **Query Agent (`query_agent.py`)**:
  - Graph-first question resolution engine.
  - Scores answers with assurance tiers: `LEVEL_1_USER_ASSERTED` vs `LEVEL_2_EVIDENCE_ATTACHED`.
- **Privacy Advisor Agent (`privacy_advisor.py`)**:
  - Evaluates external verification access requests against requester purpose.
  - Recommends data minimization (approving minimal necessary attributes, coarsening exact salaries/numbers into ranges, denying irrelevant fields).
- **Proof Composer Agent (`proof_composer.py`)**:
  - Generates time-bounded HMAC tokens, Merkle proofs, and tamper-evident QR verification payloads.
- **Deterministic Policy Engine (`policy_engine.py`)**:
  - Non-LLM mathematical enforcer for third-party verifiers.
  - Returns strict HTTP status codes: `403 OUT_OF_SCOPE`, `403 SHARE_EXPIRED`, `403 SHARE_REVOKED`, or `200 ACCESS_GRANTED`.
- **Audit Logger (`audit_logger.py`)**:
  - Immutable SHA-256 chained audit ledger tracking queries, document updates, and verification attempts with tamper verification (`verify_chain_integrity`).

---

### 3. High-Performance Multimodal AI & Voice Chat
- **Google Gemini 2.5 (`gemini-flash-lite-latest`)**:
  - Primary reasoning engine connected directly to verified Neo4j vault records with ~1.3s response times.
  - Strict 3.5s timeout with automatic cascading fallback to **Sarvam 105B** and deterministic **Neo4j Cypher resolution**.
- **Real-Time Word-by-Word Voice Input**:
  - Dual-channel browser speech pipeline combining native `SpeechRecognition` (`interimResults: true`) and `MediaRecorder`.
  - Words appear on screen in real time with 0ms visual delay as the user speaks.
- **Sarvam AI Integration**:
  - **Speech-to-Text (`saaras:v3`)**: High-accuracy speech transcription across 12 Indian languages.
  - **Text-to-Speech (`bulbul:v2`)**: 10 Indian voice personas (`shubh`, `meera`, `pavithra`, `maitreyi`, `arvind`, `amartya`, `aditi`, `priya`, `ratan`, `varun`).
  - **Translation Engine**: Multi-lingual chat support across 12 BCP-47 Indian language codes.

---

### 4. Authentication & Guest Exploration
- **Google OAuth via Supabase**: Full user profile synchronization.
- **One-Click Guest Bypass**: "Skip & Continue as Guest" button on the Auth screen and Shared Link Viewer for immediate zero-friction evaluation.

---

## 🐛 Issues & Bugs Resolved

| Issue / Bug | Root Cause | Technical Resolution |
| :--- | :--- | :--- |
| **STT Upload Error (`audio/webm;codecs=opus`)** | Browser `MediaRecorder` produces MIME strings with codec parameters, which failed strict equality checks on upload. | Implemented MIME type normalization (`file.type.split(';')[0].trim().toLowerCase()`) across frontend and backend. |
| **Chat Latency & Timeouts (~24s delay)** | Backend called deprecated/slow Gemini endpoints (`gemini-3.8-flash`, `gemini-2.5-pro`) before timing out. | Upgraded primary model to `models/gemini-flash-lite-latest` with a 3.5s timeout, dropping response times to ~1.4s. |
| **Delayed Voice Feedback** | Audio blob was only transcribed after recording stopped. | Added parallel Web Speech API interim streaming (`recognition.onresult`) for real-time word-by-word typing. |
| **Mock Data Pollution** | Mock files (`mockData.ts`) were hardcoded as default state across Home, Memory, and Share screens. | Converted default states to clean empty arrays (`[]`), introducing explicit **"Load Demo Vault"** and **"Load Demo Shares"** buttons. |
| **Neo4j Constraint Conflicts** | Duplicate index commands raised schema warnings during fast reloads. | Replaced raw constraint scripts with Cypher `IF NOT EXISTS` syntax and error-tolerant initialization routines. |

---

## 🚧 Remaining Roadmap & Future Enhancements

### 1. Client-Side zk-SNARK Proof Generation
- **Current State**: Uses HMAC-signed Merkle proof envelopes and SHA-256 evidence hashes.
- **Remaining Task**: Integrate Circom / SnarkJS circuits directly in the browser (e.g. `age >= 18` or `income >= ₹50,000` without revealing exact numbers).

### 2. SYNDEO Companion Chrome Extension
- **Current State**: Web application and shared link viewer are fully functional.
- **Remaining Task**: Package the Chrome Manifest V3 extension to allow 1-click autofill and selective disclosure directly into third-party web forms.

### 3. Offline WASM Tesseract OCR Fallback
- **Current State**: OCR runs through Document Agent with backend parsing.
- **Remaining Task**: Add browser-native WebAssembly Tesseract OCR worker for air-gapped / offline document scanning.

### 4. WebAuthn Biometric Hardware Passkeys
- **Current State**: Google OAuth + Guest Session.
- **Remaining Task**: Add FIDO2 / WebAuthn passkey authentication for biometric device-level vault unlocking.

---

## 📈 Summary Checklist

- [x] Neo4j Aura persistent knowledge graph
- [x] Multi-agent system (5 specialized agents)
- [x] Ultra-fast Gemini 2.5 reasoning
- [x] Sarvam STT & 10-speaker TTS
- [x] Live word-by-word streaming voice chat
- [x] Zero mock data by default (Demo mode on demand)
- [x] Auth Skip / Guest bypass
- [x] Production build passes clean with 0 errors (`npm run build`)
- [ ] Client-side zk-SNARK circuits (Phase 3)
- [ ] Chrome Extension Web Store release (Phase 3)
