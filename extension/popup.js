/**
 * SYNDEO Secure MemoryFill — Popup Controller
 *
 * Core Principle:
 * AI proposes → Backend validates → Policy authorizes → User approves → Extension fills → User submits → Audit records
 */

(function () {
  'use strict';

  // Application State
  let currentScanResult = null;
  let currentMappingResult = null;
  let selectedFieldIds = new Set();
  let currentOrigin = '';

  // UI Element References
  const scanBtn = document.getElementById('scanBtn');
  const scanBtnText = document.getElementById('scanBtnText');
  const mapBtn = document.getElementById('mapBtn');
  const mapBannerBtn = document.getElementById('mapBannerBtn');
  const vaultUserName = document.getElementById('vaultUserName');

  // State Views
  const stateInitial = document.getElementById('stateInitial');
  const stateScanning = document.getElementById('stateScanning');
  const stateRestricted = document.getElementById('stateRestricted');
  const stateError = document.getElementById('stateError');
  const stateEmpty = document.getElementById('stateEmpty');
  const stateScanned = document.getElementById('stateScanned');
  const stateApproval = document.getElementById('stateApproval');
  const stateFilled = document.getElementById('stateFilled');

  // Messages & Dynamic Text
  const errorMessage = document.getElementById('errorMessage');
  const scanningTitle = document.getElementById('scanningTitle');
  const scanningDesc = document.getElementById('scanningDesc');
  const pageDomain = document.getElementById('pageDomain');
  const pageTitle = document.getElementById('pageTitle');
  const summaryCount = document.getElementById('summaryCount');
  const rawFieldsList = document.getElementById('rawFieldsList');
  const filterInput = document.getElementById('filterInput');

  // Approval View Elements
  const approvalOrigin = document.getElementById('approvalOrigin');
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const approvedCountPill = document.getElementById('approvedCountPill');
  const approvalFieldsList = document.getElementById('approvalFieldsList');
  const executeFillBtn = document.getElementById('executeFillBtn');
  const executeFillBtnText = document.getElementById('executeFillBtnText');

  // Filled View Elements
  const filledSummaryText = document.getElementById('filledSummaryText');
  const verificationDetailsList = document.getElementById('verificationDetailsList');
  const rescanAfterFillBtn = document.getElementById('rescanAfterFillBtn');

  /**
   * Switch visible state in the popup UI
   */
  function showState(state) {
    [
      stateInitial, stateScanning, stateRestricted, stateError,
      stateEmpty, stateScanned, stateApproval, stateFilled,
    ].forEach((el) => el && el.classList.add('hidden'));

    switch (state) {
      case 'initial':
        stateInitial.classList.remove('hidden');
        break;
      case 'scanning':
        stateScanning.classList.remove('hidden');
        break;
      case 'restricted':
        stateRestricted.classList.remove('hidden');
        break;
      case 'error':
        stateError.classList.remove('hidden');
        break;
      case 'empty':
        stateEmpty.classList.remove('hidden');
        break;
      case 'scanned':
        stateScanned.classList.remove('hidden');
        break;
      case 'approval':
        stateApproval.classList.remove('hidden');
        break;
      case 'filled':
        stateFilled.classList.remove('hidden');
        break;
    }
  }

  function isRestrictedUrl(url) {
    if (!url) return true;
    const restricted = ['chrome://', 'chrome-extension://', 'https://chrome.google.com/webstore', 'https://chromewebstore.google.com', 'edge://', 'about:', 'view-source:'];
    return restricted.some((p) => url.startsWith(p));
  }

  function getHostname(rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      return parsed.hostname || rawUrl;
    } catch {
      return rawUrl || 'Current Webpage';
    }
  }

  /**
   * Check authenticated user session on startup
   */
  function initAuthSession() {
    chrome.runtime.sendMessage({ action: 'GET_AUTH_STATUS' }, (response) => {
      if (response && response.success && response.data && response.data.user) {
        const u = response.data.user;
        vaultUserName.textContent = `${u.name} (Neo4j)`;
        vaultUserName.title = `Vault Connected: ${u.claimsCount} verified claims active.`;
      }
    });
  }

  /**
   * Scan active page DOM structure
   */
  async function performScan() {
    showState('scanning');
    scanningTitle.textContent = 'Scanning Page DOM...';
    scanningDesc.textContent = 'Extracting field metadata, labels, and form associations.';
    scanBtn.disabled = true;
    scanBtnText.textContent = 'Scanning...';
    mapBtn.classList.add('hidden');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.id) {
        errorMessage.textContent = 'No active browser tab found.';
        showState('error');
        scanBtn.disabled = false;
        scanBtnText.textContent = 'Scan Current Page';
        return;
      }

      if (isRestrictedUrl(tab.url)) {
        showState('restricted');
        scanBtn.disabled = false;
        scanBtnText.textContent = 'Scan Current Page';
        return;
      }

      currentOrigin = new URL(tab.url).origin;

      function handleScanSuccess(response) {
        scanBtn.disabled = false;
        scanBtnText.textContent = 'Rescan Form';

        if (!response || !response.success) {
          errorMessage.textContent = (response && response.error) || 'Failed to scan DOM structure.';
          showState('error');
          return;
        }

        currentScanResult = response;

        if (!response.fields || response.fields.length === 0) {
          showState('empty');
          return;
        }

        pageDomain.textContent = getHostname(response.page.url || tab.url);
        pageTitle.textContent = response.page.title || tab.title || 'Webpage';
        summaryCount.textContent = `${response.summary.total} detected`;

        mapBtn.classList.remove('hidden');
        showState('scanned');
        renderRawFields();
      }

      chrome.tabs.sendMessage(tab.id, { action: 'SCAN_FORM' }, (response) => {
        if (chrome.runtime.lastError) {
          // Dynamic injection fallback
          if (chrome.scripting && tab.id) {
            chrome.scripting.executeScript(
              { target: { tabId: tab.id }, files: ['content.js'] },
              () => {
                if (chrome.runtime.lastError) {
                  errorMessage.textContent = 'Could not connect to this webpage. Please refresh the page (F5) and click Scan again.';
                  showState('error');
                  scanBtn.disabled = false;
                  scanBtnText.textContent = 'Scan Current Page';
                  return;
                }
                setTimeout(() => {
                  chrome.tabs.sendMessage(tab.id, { action: 'SCAN_FORM' }, (retryRes) => {
                    if (chrome.runtime.lastError || !retryRes) {
                      errorMessage.textContent = 'Could not connect to this webpage. Please refresh the page (F5) and click Scan again.';
                      showState('error');
                      scanBtn.disabled = false;
                      scanBtnText.textContent = 'Scan Current Page';
                      return;
                    }
                    handleScanSuccess(retryRes);
                  });
                }, 100);
              }
            );
            return;
          }

          errorMessage.textContent = 'Could not connect to the webpage. Please refresh the page and try again.';
          showState('error');
          scanBtn.disabled = false;
          scanBtnText.textContent = 'Scan Current Page';
          return;
        }

        handleScanSuccess(response);
      });
    } catch (err) {
      console.error('[SYNDEO Autofill] Scan exception:', err);
      scanBtn.disabled = false;
      scanBtnText.textContent = 'Scan Current Page';
      errorMessage.textContent = 'An unexpected error occurred while scanning.';
      showState('error');
    }
  }

  /**
   * Render raw fields list in scanned view
   */
  function renderRawFields() {
    if (!currentScanResult || !currentScanResult.fields) return;
    rawFieldsList.innerHTML = '';
    const query = (filterInput.value || '').trim().toLowerCase();

    const filtered = currentScanResult.fields.filter((f) => {
      if (!query) return true;
      return (
        (f.label || '').toLowerCase().includes(query) ||
        (f.name || '').toLowerCase().includes(query) ||
        (f.id || '').toLowerCase().includes(query)
      );
    });

    filtered.forEach((f) => {
      const card = document.createElement('div');
      card.className = 'field-card';

      const header = document.createElement('div');
      header.className = 'field-header';

      const labelEl = document.createElement('div');
      labelEl.className = 'field-label';
      labelEl.textContent = f.label || f.name || 'Unnamed Field';

      const typeBadge = document.createElement('span');
      typeBadge.className = 'field-type-badge';
      typeBadge.textContent = f.type || f.tag;

      header.appendChild(labelEl);
      header.appendChild(typeBadge);
      card.appendChild(header);

      rawFieldsList.appendChild(card);
    });
  }

  /**
   * Trigger MemoryFill Agent Mapping Pipeline
   */
  function performMapping() {
    if (!currentScanResult || !currentScanResult.fields) return;

    showState('scanning');
    scanningTitle.textContent = 'MemoryFill Policy Mapping...';
    scanningDesc.textContent = 'Evaluating form fields against authorized claims and sensitivity policies.';

    chrome.runtime.sendMessage(
      {
        action: 'MAP_FIELDS',
        origin: currentOrigin,
        fields: currentScanResult.fields,
      },
      (response) => {
        if (!response || !response.success || !response.data) {
          errorMessage.textContent = (response && response.error) || 'Failed to connect to SYNDEO backend.';
          showState('error');
          return;
        }

        currentMappingResult = response.data;
        renderApprovalScreen();
      }
    );
  }

  /**
   * Render Review & Approval UI (Step 7)
   */
  function renderApprovalScreen() {
    if (!currentMappingResult || !currentMappingResult.mappings) return;

    approvalOrigin.textContent = currentMappingResult.origin || currentOrigin;
    approvalFieldsList.innerHTML = '';
    selectedFieldIds.clear();

    const mappings = currentMappingResult.mappings;

    mappings.forEach((m) => {
      const isReady = m.status === 'READY';
      const isBlocked = m.status === 'BLOCKED';

      const card = document.createElement('div');
      card.className = `approval-card ${isReady ? 'selected' : isBlocked ? 'blocked' : ''}`;

      const top = document.createElement('div');
      top.className = 'approval-card-top';

      if (isReady) {
        selectedFieldIds.add(m.field_id);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'approval-checkbox';
        checkbox.checked = true;
        checkbox.dataset.fieldId = m.field_id;

        checkbox.addEventListener('change', (e) => {
          if (e.target.checked) {
            selectedFieldIds.add(m.field_id);
            card.classList.add('selected');
          } else {
            selectedFieldIds.delete(m.field_id);
            card.classList.remove('selected');
          }
          updateApprovalCount();
        });

        top.appendChild(checkbox);
      }

      const body = document.createElement('div');
      body.className = 'approval-card-body';

      // Destination Field Info
      const destField = document.createElement('div');
      destField.className = 'approval-dest-field';
      destField.innerHTML = `Web field: <strong>${m.field_label || m.field_id}</strong> (${m.field_type})`;
      body.appendChild(destField);

      // Target Claim Name
      if (m.target_claim_name) {
        const target = document.createElement('div');
        target.className = 'approval-memory-target';
        target.textContent = m.target_claim_name;
        body.appendChild(target);
      }

      // Preview Value
      if (m.preview_value) {
        const preview = document.createElement('div');
        preview.className = 'approval-preview-value';
        preview.textContent = m.preview_value;
        body.appendChild(preview);
      } else if (isBlocked) {
        const blockedMsg = document.createElement('div');
        blockedMsg.className = 'approval-preview-value';
        blockedMsg.style.color = '#f43f5e';
        blockedMsg.textContent = m.reason || 'Restricted attribute blocked by policy';
        body.appendChild(blockedMsg);
      }

      // Badges
      const badgesRow = document.createElement('div');
      badgesRow.className = 'approval-badges-row';

      if (m.assurance && m.assurance.includes('EVIDENCE')) {
        const b = document.createElement('span');
        b.className = 'badge-evidence';
        b.textContent = 'Evidence Attached';
        badgesRow.appendChild(b);
      } else if (m.assurance && m.assurance.includes('USER')) {
        const b = document.createElement('span');
        b.className = 'badge-evidence';
        b.style.color = '#a1a1aa';
        b.style.borderColor = 'rgba(255,255,255,0.1)';
        b.textContent = 'User Asserted';
        badgesRow.appendChild(b);
      }

      if (m.confidence > 0) {
        const b = document.createElement('span');
        b.className = 'badge-confidence';
        b.textContent = `${Math.round(m.confidence * 100)}% Match`;
        badgesRow.appendChild(b);
      }

      if (isBlocked) {
        const b = document.createElement('span');
        b.className = 'badge-blocked';
        b.textContent = 'RESTRICTED';
        badgesRow.appendChild(b);
      }

      body.appendChild(badgesRow);
      top.appendChild(body);
      card.appendChild(top);
      approvalFieldsList.appendChild(card);
    });

    updateApprovalCount();
    showState('approval');
  }

  function updateApprovalCount() {
    const count = selectedFieldIds.size;
    approvedCountPill.textContent = `${count} selected`;
    executeFillBtnText.textContent = `Fill Approved Fields (${count})`;
    executeFillBtn.disabled = count === 0;
  }

  /**
   * Execute Approved Fill Pipeline into Webpage DOM
   */
  async function executeFill() {
    if (selectedFieldIds.size === 0 || !currentMappingResult) return;

    executeFillBtn.disabled = true;
    executeFillBtnText.textContent = 'Authorizing Fill...';

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      errorMessage.textContent = 'Active tab lost. Please rescan.';
      showState('error');
      return;
    }

    // 1. Request Authorized Claim Values from Backend
    chrome.runtime.sendMessage(
      {
        action: 'GET_APPROVED_FILL_VALUES',
        approval_id: currentMappingResult.approval_id,
        origin: currentOrigin,
        approved_field_ids: Array.from(selectedFieldIds),
      },
      (response) => {
        if (!response || !response.success || !response.data) {
          errorMessage.textContent = (response && response.error) || 'Failed to authorize fill values.';
          showState('error');
          return;
        }

        const instructions = response.data.instructions || [];

        // 2. Dispatch Approved Instructions to Content Script for Deterministic DOM Filling
        chrome.tabs.sendMessage(
          tab.id,
          { action: 'FILL_FIELDS', instructions },
          (fillResult) => {
            if (chrome.runtime.lastError || !fillResult || !fillResult.success) {
              errorMessage.textContent = (fillResult && fillResult.error) || 'Failed to populate DOM elements.';
              showState('error');
              return;
            }

            renderFilledResults(fillResult);

            // 3. Log Client Audit Event
            chrome.runtime.sendMessage({
              action: 'LOG_EXTENSION_AUDIT',
              event: 'FILL_DOM_VERIFIED',
              origin: currentOrigin,
              fields: instructions.map((i) => i.memory_path),
              result: 'SUCCESS',
            });
          }
        );
      }
    );
  }

  /**
   * Render Fill Verification & Manual Submit Notice
   */
  function renderFilledResults(fillResult) {
    filledSummaryText.textContent = `${fillResult.filled_count} fields populated and verified into webpage DOM.`;
    verificationDetailsList.innerHTML = '';

    (fillResult.results || []).forEach((r) => {
      const card = document.createElement('div');
      card.className = 'verification-card';

      const path = document.createElement('span');
      path.textContent = r.memory_path || r.field_id;
      path.style.fontWeight = '600';

      const status = document.createElement('span');
      status.className = `verification-status ${r.status === 'FILLED' ? 'filled' : ''}`;
      status.textContent = r.status;

      card.appendChild(path);
      card.appendChild(status);
      verificationDetailsList.appendChild(card);
    });

    showState('filled');
  }

  // Event Listeners
  scanBtn.addEventListener('click', performScan);
  mapBtn.addEventListener('click', performMapping);
  mapBannerBtn.addEventListener('click', performMapping);
  executeFillBtn.addEventListener('click', executeFill);
  rescanAfterFillBtn.addEventListener('click', performScan);

  filterInput.addEventListener('input', renderRawFields);

  selectAllCheckbox.addEventListener('change', (e) => {
    const checked = e.target.checked;
    const checkboxes = approvalFieldsList.querySelectorAll('.approval-checkbox');
    checkboxes.forEach((cb) => {
      cb.checked = checked;
      const fid = cb.dataset.fieldId;
      const card = cb.closest('.approval-card');
      if (checked) {
        selectedFieldIds.add(fid);
        if (card) card.classList.add('selected');
      } else {
        selectedFieldIds.delete(fid);
        if (card) card.classList.remove('selected');
      }
    });
    updateApprovalCount();
  });

  // Startup initialization
  initAuthSession();
  performScan();
})();
