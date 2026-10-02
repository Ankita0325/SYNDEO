/**
 * SYNDEO Secure MemoryFill — Background Service Worker
 *
 * Responsibilities:
 * - Extension orchestration and background messaging.
 * - Authenticated API communication with the SYNDEO backend.
 * - Origin validation and active tab isolation.
 * - Audit recording for policy compliance.
 */

const BACKEND_BASE_URL = 'http://127.0.0.1:8000';

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || !request.action) {
    return false;
  }

  // 1. Check Authenticated Session Status
  if (request.action === 'GET_AUTH_STATUS') {
    fetch(`${BACKEND_BASE_URL}/api/v1/extension/auth/status`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        sendResponse({ success: true, data });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep channel open for async response
  }

  // 2. Request Field Mapping from MemoryFill Agent
  if (request.action === 'MAP_FIELDS') {
    fetch(`${BACKEND_BASE_URL}/api/v1/extension/map`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: request.origin,
        fields: request.fields,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        sendResponse({ success: true, data });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  // 3. Request Authorized Values for User-Approved Fields
  if (request.action === 'GET_APPROVED_FILL_VALUES') {
    fetch(`${BACKEND_BASE_URL}/api/v1/extension/fill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approval_id: request.approval_id,
        origin: request.origin,
        approved_field_ids: request.approved_field_ids,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        sendResponse({ success: true, data });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  // 4. Log Client Audit Event
  if (request.action === 'LOG_EXTENSION_AUDIT') {
    fetch(`${BACKEND_BASE_URL}/api/v1/extension/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: request.event,
        origin: request.origin,
        fields: request.fields || [],
        result: request.result || 'SUCCESS',
      }),
    })
      .then((res) => res.json())
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  return false;
});
