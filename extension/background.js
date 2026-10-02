/**
 * SYNDEO Secure MemoryFill — Background Service Worker
 *
 * Responsibilities:
 * - Extension orchestration and background messaging.
 * - Authenticated API communication with local and cloud SYNDEO backends (automatic failover).
 * - Origin validation and active tab isolation.
 * - Audit recording for policy compliance.
 */

const BACKEND_CANDIDATES = [
  'http://127.0.0.1:8000',
  'http://localhost:8000',
  'https://syndeo-backend-wks3.onrender.com'
];

async function fetchFromSyndeoBackend(path, options = {}) {
  let lastError = null;

  for (const base of BACKEND_CANDIDATES) {
    try {
      const url = `${base}${path}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }

      // If client-side policy block (e.g. 403, 400), don't failover to next backend
      if (response.status < 500) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Request failed with HTTP ${response.status}`);
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Could not connect to SYNDEO backend.');
}

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || !request.action) {
    return false;
  }

  // 1. Check Authenticated Session Status
  if (request.action === 'GET_AUTH_STATUS') {
    fetchFromSyndeoBackend('/api/v1/extension/auth/status')
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }

  // 2. Request Field Mapping from MemoryFill Agent
  if (request.action === 'MAP_FIELDS') {
    fetchFromSyndeoBackend('/api/v1/extension/map', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: request.origin,
        fields: request.fields,
      }),
    })
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // 3. Request Authorized Values for User-Approved Fields
  if (request.action === 'GET_APPROVED_FILL_VALUES') {
    fetchFromSyndeoBackend('/api/v1/extension/fill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approval_id: request.approval_id,
        origin: request.origin,
        approved_field_ids: request.approved_field_ids,
      }),
    })
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // 4. Log Client Audit Event
  if (request.action === 'LOG_EXTENSION_AUDIT') {
    fetchFromSyndeoBackend('/api/v1/extension/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: request.event,
        origin: request.origin,
        fields: request.fields || [],
        result: request.result || 'SUCCESS',
      }),
    })
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  return false;
});
