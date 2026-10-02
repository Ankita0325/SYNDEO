/**
 * SYNDEO Form Scanner — Popup Script (Phase 1)
 *
 * READ-ONLY GUARANTEE:
 * - Safely renders webpage metadata without injecting untrusted HTML.
 * - Performs zero data mutations, value assignments, or network transmissions.
 */

(function () {
  'use strict';

  // State
  let currentScanResult = null;
  let currentFilterCategory = 'all';
  let searchQuery = '';

  // UI Element References
  const scanBtn = document.getElementById('scanBtn');
  const scanBtnText = document.getElementById('scanBtnText');
  const filterInput = document.getElementById('filterInput');
  const copyJsonBtn = document.getElementById('copyJsonBtn');
  const categoryTabs = document.getElementById('categoryTabs');
  const fieldsList = document.getElementById('fieldsList');

  // State Views
  const stateInitial = document.getElementById('stateInitial');
  const stateScanning = document.getElementById('stateScanning');
  const stateRestricted = document.getElementById('stateRestricted');
  const stateError = document.getElementById('stateError');
  const stateEmpty = document.getElementById('stateEmpty');
  const stateResults = document.getElementById('stateResults');
  const errorMessage = document.getElementById('errorMessage');

  // Summary Elements
  const pageDomain = document.getElementById('pageDomain');
  const pageTitle = document.getElementById('pageTitle');
  const summaryCount = document.getElementById('summaryCount');
  const countAll = document.getElementById('countAll');
  const countInputs = document.getElementById('countInputs');
  const countSelects = document.getElementById('countSelects');
  const countTextareas = document.getElementById('countTextareas');
  const countRequired = document.getElementById('countRequired');

  /**
   * Switch visible state in the popup UI
   * @param {'initial' | 'scanning' | 'restricted' | 'error' | 'empty' | 'results'} state
   */
  function showState(state) {
    stateInitial.classList.add('hidden');
    stateScanning.classList.add('hidden');
    stateRestricted.classList.add('hidden');
    stateError.classList.add('hidden');
    stateEmpty.classList.add('hidden');
    stateResults.classList.add('hidden');

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
      case 'results':
        stateResults.classList.remove('hidden');
        break;
    }
  }

  /**
   * Check if the given URL is a restricted Chrome page that cannot be scanned
   * @param {string} url
   * @returns {boolean}
   */
  function isRestrictedUrl(url) {
    if (!url) return true;
    const restrictedPrefixes = [
      'chrome://',
      'chrome-extension://',
      'https://chrome.google.com/webstore',
      'https://chromewebstore.google.com',
      'edge://',
      'about:',
      'view-source:',
    ];
    return restrictedPrefixes.some((prefix) => url.startsWith(prefix));
  }

  /**
   * Extract domain host from a full URL string
   * @param {string} rawUrl
   * @returns {string}
   */
  function getHostname(rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      return parsed.hostname || rawUrl;
    } catch {
      return rawUrl || 'Current Page';
    }
  }

  /**
   * Render structured field cards safely into the fieldsList container
   * using native document.createElement and textContent APIs.
   */
  function renderFields() {
    if (!currentScanResult || !currentScanResult.fields) return;

    fieldsList.innerHTML = '';
    const query = searchQuery.trim().toLowerCase();

    const filtered = currentScanResult.fields.filter((field) => {
      // 1. Category Tab Filter
      if (currentFilterCategory === 'input' && field.tag !== 'input') return false;
      if (currentFilterCategory === 'select' && field.tag !== 'select') return false;
      if (currentFilterCategory === 'textarea' && field.tag !== 'textarea') return false;
      if (currentFilterCategory === 'required' && !field.required) return false;

      // 2. Text Search Query
      if (query) {
        const matchLabel = (field.label || '').toLowerCase().includes(query);
        const matchName = (field.name || '').toLowerCase().includes(query);
        const matchId = (field.id || '').toLowerCase().includes(query);
        const matchType = (field.type || '').toLowerCase().includes(query);
        const matchPlaceholder = (field.placeholder || '').toLowerCase().includes(query);
        const matchForm = (field.formId || '').toLowerCase().includes(query);
        return matchLabel || matchName || matchId || matchType || matchPlaceholder || matchForm;
      }

      return true;
    });

    if (filtered.length === 0) {
      const emptyNotice = document.createElement('div');
      emptyNotice.className = 'state-desc';
      emptyNotice.style.textAlign = 'center';
      emptyNotice.style.padding = '20px 0';
      emptyNotice.textContent = 'No matching fields found for your filter.';
      fieldsList.appendChild(emptyNotice);
      return;
    }

    filtered.forEach((field) => {
      const card = document.createElement('div');
      card.className = 'field-card';

      // Header: Label + Type Badge
      const header = document.createElement('div');
      header.className = 'field-header';

      const labelEl = document.createElement('div');
      labelEl.className = 'field-label';
      labelEl.textContent = field.label || 'Unnamed field';

      const typeBadge = document.createElement('span');
      typeBadge.className = 'field-type-badge';
      typeBadge.textContent = field.type || field.tag;

      header.appendChild(labelEl);
      header.appendChild(typeBadge);
      card.appendChild(header);

      // Meta Grid: name & id
      const metaGrid = document.createElement('div');
      metaGrid.className = 'field-meta-grid';

      if (field.name) {
        const item = document.createElement('div');
        item.className = 'meta-item';
        const k = document.createElement('span');
        k.className = 'meta-key';
        k.textContent = 'name:';
        const v = document.createElement('span');
        v.className = 'meta-val';
        v.textContent = field.name;
        item.appendChild(k);
        item.appendChild(v);
        metaGrid.appendChild(item);
      }

      if (field.id) {
        const item = document.createElement('div');
        item.className = 'meta-item';
        const k = document.createElement('span');
        k.className = 'meta-key';
        k.textContent = 'id:';
        const v = document.createElement('span');
        v.className = 'meta-val';
        v.textContent = field.id;
        item.appendChild(k);
        item.appendChild(v);
        metaGrid.appendChild(item);
      }

      if (field.placeholder) {
        const item = document.createElement('div');
        item.className = 'meta-item';
        const k = document.createElement('span');
        k.className = 'meta-key';
        k.textContent = 'placeholder:';
        const v = document.createElement('span');
        v.className = 'meta-val';
        v.textContent = `"${field.placeholder}"`;
        item.appendChild(k);
        item.appendChild(v);
        metaGrid.appendChild(item);
      }

      if (metaGrid.children.length > 0) {
        card.appendChild(metaGrid);
      }

      // Badges Row: Required, ReadOnly, Disabled, Form, Autocomplete
      const badgesRow = document.createElement('div');
      badgesRow.className = 'field-badges-row';

      if (field.required) {
        const b = document.createElement('span');
        b.className = 'badge badge-required';
        b.textContent = 'REQUIRED';
        badgesRow.appendChild(b);
      }

      if (field.readonly) {
        const b = document.createElement('span');
        b.className = 'badge badge-readonly';
        b.textContent = 'READONLY';
        badgesRow.appendChild(b);
      }

      if (field.disabled) {
        const b = document.createElement('span');
        b.className = 'badge badge-disabled';
        b.textContent = 'DISABLED';
        badgesRow.appendChild(b);
      }

      if (field.formId) {
        const b = document.createElement('span');
        b.className = 'badge badge-form';
        b.textContent = `FORM: #${field.formId}`;
        badgesRow.appendChild(b);
      } else if (field.formAction) {
        const b = document.createElement('span');
        b.className = 'badge badge-form';
        b.textContent = `ACTION: ${field.formAction}`;
        badgesRow.appendChild(b);
      }

      if (field.autocomplete && field.autocomplete !== 'off') {
        const b = document.createElement('span');
        b.className = 'badge badge-autocomplete';
        b.textContent = `AUTOCOMPLETE: ${field.autocomplete}`;
        badgesRow.appendChild(b);
      }

      if (badgesRow.children.length > 0) {
        card.appendChild(badgesRow);
      }

      // Select Options Preview (Collapsible <details>)
      if (field.tag === 'select' && Array.isArray(field.options) && field.options.length > 0) {
        const details = document.createElement('details');
        details.className = 'options-preview';

        const summary = document.createElement('summary');
        summary.textContent = `View ${field.options.length} Select Options`;
        details.appendChild(summary);

        const optList = document.createElement('div');
        optList.className = 'options-list';

        field.options.forEach((opt) => {
          const optItem = document.createElement('div');
          optItem.className = 'option-item';
          optItem.textContent = `• ${opt.label || opt.value} (${opt.value})`;
          optList.appendChild(optItem);
        });

        details.appendChild(optList);
        card.appendChild(details);
      }

      fieldsList.appendChild(card);
    });
  }

  /**
   * Main scan function communicating with the active tab's content script
   */
  async function performScan() {
    showState('scanning');
    scanBtn.disabled = true;
    scanBtnText.textContent = 'Scanning...';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.id) {
        errorMessage.textContent = 'No active browser tab found.';
        showState('error');
        return;
      }

      if (isRestrictedUrl(tab.url)) {
        showState('restricted');
        return;
      }

      // Send SCAN_FORM action to content script
      chrome.tabs.sendMessage(tab.id, { action: 'SCAN_FORM' }, (response) => {
        scanBtn.disabled = false;
        scanBtnText.textContent = 'Rescan Current Page';

        if (chrome.runtime.lastError) {
          console.error('[SYNDEO Form Scanner] Message error:', chrome.runtime.lastError.message);
          errorMessage.textContent =
            'Could not connect to the webpage. Please refresh the page and click Scan again.';
          showState('error');
          return;
        }

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

        // Populate Page Info & Counts
        pageDomain.textContent = getHostname(response.page.url || tab.url);
        pageTitle.textContent = response.page.title || tab.title || 'Untitled Page';
        summaryCount.textContent = `${response.summary.total} detected`;

        countAll.textContent = response.summary.total;
        countInputs.textContent = response.summary.inputs;
        countSelects.textContent = response.summary.selects;
        countTextareas.textContent = response.summary.textareas;
        countRequired.textContent = response.summary.required;

        showState('results');
        renderFields();
      });
    } catch (err) {
      console.error('[SYNDEO Form Scanner] Unexpected error:', err);
      scanBtn.disabled = false;
      scanBtnText.textContent = 'Scan Current Page';
      errorMessage.textContent = 'An unexpected error occurred while scanning.';
      showState('error');
    }
  }

  // Event Listeners
  scanBtn.addEventListener('click', () => {
    performScan();
  });

  filterInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderFields();
  });

  categoryTabs.addEventListener('click', (e) => {
    const target = e.target.closest('.tab-pill');
    if (!target) return;

    categoryTabs.querySelectorAll('.tab-pill').forEach((btn) => btn.classList.remove('active'));
    target.classList.add('active');
    currentFilterCategory = target.getAttribute('data-filter') || 'all';
    renderFields();
  });

  copyJsonBtn.addEventListener('click', () => {
    if (!currentScanResult) return;
    const jsonStr = JSON.stringify(currentScanResult, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      const originalText = copyJsonBtn.querySelector('span').textContent;
      copyJsonBtn.querySelector('span').textContent = 'Copied!';
      setTimeout(() => {
        copyJsonBtn.querySelector('span').textContent = originalText;
      }, 1800);
    });
  });

  // Automatically trigger initial scan on popup open for instant feedback
  performScan();
})();
