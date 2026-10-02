// SYNDEO API Client - Connects React Frontend to FastAPI Production Graph Backend

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function fetchHealthStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchNeo4jStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/neo4j/status`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchMemoryStore() {
  try {
    const res = await fetch(`${API_BASE}/api/memory`);
    if (!res.ok) throw new Error('Failed to fetch memory store');
    return await res.json();
  } catch (err) {
    console.warn('Backend API unavailable, using local memory store.', err);
    return null;
  }
}

export async function fetchGraphTopology() {
  try {
    const res = await fetch(`${API_BASE}/api/graph/topology`);
    if (!res.ok) throw new Error('Failed to fetch topology');
    return await res.json();
  } catch (err) {
    console.warn('Backend topology unavailable.', err);
    return null;
  }
}

export async function fetchRecordsFromBackend() {
  try {
    const res = await fetch(`${API_BASE}/api/graph/records`);
    if (!res.ok) throw new Error('Failed to fetch records');
    const data = await res.json();
    return data.records;
  } catch (err) {
    console.warn('Backend API unavailable, using local memory store.', err);
    return null;
  }
}

export async function fetchDocumentsFromBackend() {
  try {
    const res = await fetch(`${API_BASE}/api/graph/documents`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    const data = await res.json();
    return data.documents;
  } catch (err) {
    console.warn('Backend API unavailable, using local document store.', err);
    return null;
  }
}

export async function addClaimToBackend(claim: {
  category: string;
  fieldName: string;
  value: string;
  source?: string;
  evidenceDocName?: string;
  isSingular?: boolean;
  rawNumericValue?: number;
}) {
  try {
    const res = await fetch(`${API_BASE}/api/graph/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(claim),
    });
    if (!res.ok) throw new Error('Failed to save claim');
    return await res.json();
  } catch (err) {
    console.warn('Backend API unavailable, saving locally.', err);
    return null;
  }
}

export async function uploadDocumentToBackend(file: File, category?: string) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (category) formData.append('category', category);

    const res = await fetch(`${API_BASE}/api/documents/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Document upload failed');
    return await res.json();
  } catch (err) {
    console.warn('Backend API unavailable, processing locally.', err);
    return null;
  }
}

export async function queryGraphMemory(question: string) {
  try {
    const res = await fetch(`${API_BASE}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    if (!res.ok) throw new Error('Query failed');
    return await res.json();
  } catch (err) {
    console.warn('Backend API unavailable, processing query locally.', err);
    return null;
  }
}

export async function fetchPrivacyAdvice(request: {
  recipient: string;
  purpose: string;
  requestedFields: Record<string, unknown>[];
}) {
  try {
    const res = await fetch(`${API_BASE}/api/privacy/advise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error('Privacy advice failed');
    return await res.json();
  } catch (err) {
    console.warn('Privacy Advisor unavailable locally.', err);
    return null;
  }
}

export async function composeSelectiveProof(shareRequest: {
  recipient: string;
  purpose: string;
  requestedFields: Record<string, unknown>[];
  expiryHours?: number;
}) {
  try {
    const res = await fetch(`${API_BASE}/api/proofs/compose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shareRequest),
    });
    if (!res.ok) throw new Error('Proof composition failed');
    return await res.json();
  } catch (err) {
    console.warn('Backend API unavailable, composing proof locally.', err);
    return null;
  }
}

export async function revokeShareLinkBackend(shareId: string) {
  try {
    const res = await fetch(`${API_BASE}/api/proofs/revoke/${shareId}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Revocation failed');
    return await res.json();
  } catch (err) {
    console.warn('Backend API unavailable, revoking locally.', err);
    return null;
  }
}

export async function fetchAuditLogs() {
  try {
    const res = await fetch(`${API_BASE}/api/audit`);
    if (!res.ok) throw new Error('Failed to fetch audit log');
    return await res.json();
  } catch {
    return null;
  }
}
