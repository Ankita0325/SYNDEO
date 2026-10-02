-- =============================================================================
-- SYNDEO: Unified Life-Stage Digital Identity & Record Network
-- Production Supabase PostgreSQL Graph & Audit Schema
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Profiles & Core Vault Root
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    profile_code TEXT UNIQUE NOT NULL,
    neo4j_person_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. Evidence Documents (Source of Truth Files)
-- Stored separately from graph claims. Pointers + SHA-256 integrity hashes.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evidence_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'application/pdf',
    object_pointer TEXT NOT NULL, -- S3/R2/Supabase Storage URI
    sha256_hash TEXT NOT NULL, -- Cryptographic integrity check
    assurance_level TEXT NOT NULL CHECK (
        assurance_level IN ('LEVEL_1_USER_ASSERTED', 'LEVEL_2_EVIDENCE_ATTACHED', 'LEVEL_3_INTERNALLY_CONSISTENT', 'LEVEL_4_VERIFIED_BY_ISSUER', 'NEEDS_REVIEW')
    ),
    extracted_fields_count INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Parsed' CHECK (status IN ('Processing', 'Parsed', 'Needs Review', 'Failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_docs_person ON public.evidence_documents(person_id);
CREATE INDEX IF NOT EXISTS idx_evidence_docs_hash ON public.evidence_documents(sha256_hash);

-- -----------------------------------------------------------------------------
-- 3. Graph Nodes (Structured Multi-Hop Claims)
-- Categories: identity, education, employment, finance, healthcare
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.graph_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('identity', 'education', 'employment', 'finance', 'healthcare')),
    field_name TEXT NOT NULL,
    field_value TEXT NOT NULL,
    raw_numeric_value NUMERIC, -- Used for range transformations (e.g. income)
    is_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
    is_singular BOOLEAN NOT NULL DEFAULT FALSE, -- e.g. DOB, blood_group cannot mutate without conflict
    source_type TEXT NOT NULL CHECK (source_type IN ('Extracted from document', 'Confirmed by you', 'Not provided')),
    confidence TEXT NOT NULL CHECK (confidence IN ('evidence-backed', 'user-confirmed', 'unverified', 'unknown')),
    assurance_level TEXT NOT NULL DEFAULT 'LEVEL_1_USER_ASSERTED',
    evidence_doc_id UUID REFERENCES public.evidence_documents(id) ON DELETE SET NULL,
    evidence_doc_name TEXT,
    evidence_doc_hash TEXT, -- Stored hash to verify integrity against file node
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUPERSEDED', 'NEEDS_REVIEW', 'REVOKED')),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_graph_nodes_person ON public.graph_nodes(person_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_cat ON public.graph_nodes(person_id, category);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_field ON public.graph_nodes(person_id, field_name);

-- -----------------------------------------------------------------------------
-- 4. Graph Relationships (Edges for Multi-Hop Traversals)
-- Supports traversal like Person -> Employment -> Company -> Verification -> Document
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.graph_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    source_node_id UUID NOT NULL REFERENCES public.graph_nodes(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES public.graph_nodes(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL, -- e.g. 'HAS_CLAIM', 'BACKED_BY_EVIDENCE', 'EMPLOYED_AT', 'ATTENDED'
    properties JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON public.graph_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON public.graph_edges(target_node_id);

-- -----------------------------------------------------------------------------
-- 5. Claim History & Versioning
-- Time-versioned fields (address, income, current role) keep history
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.claim_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id UUID NOT NULL REFERENCES public.graph_nodes(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    previous_value TEXT NOT NULL,
    new_value TEXT NOT NULL,
    change_reason TEXT NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 6. Conflict Center Table
-- Holds detected conflicts when 2 documents/sources disagree on singular facts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    existing_value TEXT NOT NULL,
    existing_source TEXT NOT NULL,
    conflicting_value TEXT NOT NULL,
    conflicting_source TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'NEEDS_REVIEW' CHECK (status IN ('NEEDS_REVIEW', 'RESOLVED_KEEP_EXISTING', 'RESOLVED_ACCEPT_NEW')),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 7. Selective Sharing & Proof Scopes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.share_scopes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    share_token TEXT UNIQUE NOT NULL,
    person_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_name TEXT NOT NULL,
    recipient_type TEXT NOT NULL,
    purpose TEXT NOT NULL,
    allowed_field_ids JSONB NOT NULL, -- Array of allowed field_name / node_id keys
    allowed_field_labels JSONB NOT NULL,
    transformed_payload JSONB NOT NULL, -- Pre-computed minimum-disclosure values (e.g. ranges)
    expiry_time TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    access_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_scopes_token ON public.share_scopes(share_token);

-- -----------------------------------------------------------------------------
-- 8. Tamper-Evident Audit Log (Hash Chaining)
-- Prevents silent modification of access/share histories: SHA-256(prev_hash + payload)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    share_id UUID REFERENCES public.share_scopes(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- e.g. 'SHARE_CREATED', 'SHARE_ACCESSED', 'SHARE_REVOKED', 'RECORD_ADDED', 'DOCUMENT_INGESTED'
    recipient TEXT NOT NULL,
    purpose TEXT NOT NULL,
    fields_accessed JSONB NOT NULL,
    assurance_status TEXT NOT NULL,
    previous_log_hash TEXT NOT NULL,
    current_log_hash TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_person ON public.audit_logs(person_id);
