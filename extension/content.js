/**
 * SYNDEO Form Scanner — Content Script (Phase 1)
 *
 * READ-ONLY GUARANTEE:
 * - This script only inspects the existing DOM structure and metadata.
 * - It never reads user-entered values (e.g. element.value).
 * - It never modifies the DOM, assigns values, dispatches events, or submits forms.
 * - It never makes network calls or transmits data to any external server or AI API.
 */

(function () {
  'use strict';

  // Prevent duplicate listener registration if injected multiple times
  if (window.__SYNDEO_SCANNER_INITIALIZED__) {
    return;
  }
  window.__SYNDEO_SCANNER_INITIALIZED__ = true;

  /**
   * Recursively collect all input, textarea, and select elements from a root node,
   * traversing any open Shadow DOMs encountered.
   *
   * @param {Node} root
   * @returns {HTMLElement[]}
   */
  function collectFormElements(root = document) {
    const elements = [];
    const directMatches = root.querySelectorAll('input, textarea, select');
    elements.push(...Array.from(directMatches));

    // Traverse open shadow roots
    const allNodes = root.querySelectorAll('*');
    for (const node of allNodes) {
      if (node.shadowRoot) {
        elements.push(...collectFormElements(node.shadowRoot));
      }
    }

    return elements;
  }

  /**
   * Conservative visibility check to ensure we primarily scan elements
   * that are interactive and visible to the user.
   *
   * @param {HTMLElement} el
   * @returns {boolean}
   */
  function isElementVisible(el) {
    if (!el || !(el instanceof HTMLElement)) return false;

    // Ignore hidden inputs
    if (el.tagName.toLowerCase() === 'input' && el.type === 'hidden') {
      return false;
    }

    // Check style declarations
    try {
      const style = window.getComputedStyle(el);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.visibility === 'collapse' ||
        style.opacity === '0'
      ) {
        return false;
      }
    } catch {
      // Fallback if computed style fails in unusual DOM states
    }

    // Check rendered dimensions (bounding box)
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      // If parent has display: none or element is completely unrendered
      if (el.offsetParent === null && el.tagName.toLowerCase() !== 'body') {
        return false;
      }
    }

    // Check if element has aria-hidden attribute
    if (el.getAttribute('aria-hidden') === 'true') {
      return false;
    }

    return true;
  }

  /**
   * Extract clean text from a DOM element, stripping out nested input/select elements
   * to avoid capturing their values or option text in the label string.
   *
   * @param {HTMLElement} el
   * @returns {string}
   */
  function cleanLabelText(el) {
    if (!el) return '';
    const clone = el.cloneNode(true);
    // Remove nested inputs, selects, textareas, scripts, styles
    const nested = clone.querySelectorAll('input, select, textarea, button, script, style');
    nested.forEach((n) => n.remove());
    return (clone.textContent || '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Robust label resolution implementing the 8-tier hierarchy:
   * 1. Explicit <label for="id">
   * 2. Enclosing parent <label>
   * 3. aria-label attribute
   * 4. aria-labelledby references
   * 5. Associated nearby semantic label text (conservative, < 80 chars)
   * 6. placeholder attribute
   * 7. name attribute fallback
   * 8. id attribute fallback
   * 9. "Unnamed field"
   *
   * @param {HTMLElement} el
   * @returns {string}
   */
  function resolveElementLabel(el) {
    // 1. Explicit <label for="...">
    if (el.id) {
      try {
        const explicitLabel = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (explicitLabel) {
          const text = cleanLabelText(explicitLabel);
          if (text) return text;
        }
      } catch {
        // Safe catch for exotic CSS selector edge cases
      }
    }

    // 2. Parent enclosing <label>
    const parentLabel = el.closest('label');
    if (parentLabel) {
      const text = cleanLabelText(parentLabel);
      if (text) return text;
    }

    // 3. aria-label
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) {
      return ariaLabel.trim();
    }

    // 4. aria-labelledby
    const ariaLabelledBy = el.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const ids = ariaLabelledBy.trim().split(/\s+/);
      const parts = [];
      for (const refId of ids) {
        const refEl = document.getElementById(refId);
        if (refEl) {
          const text = cleanLabelText(refEl);
          if (text) parts.push(text);
        }
      }
      if (parts.length > 0) {
        return parts.join(' ').trim();
      }
    }

    // 5. Associated nearby text (conservative search)
    // Look for previous element sibling or label-like container preceding the field
    const prevSibling = el.previousElementSibling;
    if (prevSibling) {
      const tag = prevSibling.tagName.toLowerCase();
      if (['label', 'span', 'p', 'div', 'h4', 'h5', 'h6', 'strong', 'legend'].includes(tag)) {
        const text = cleanLabelText(prevSibling);
        if (text && text.length > 0 && text.length <= 80 && !text.includes('\n')) {
          return text;
        }
      }
    }

    // Look for fieldset legend if inside a fieldset
    const fieldset = el.closest('fieldset');
    if (fieldset) {
      const legend = fieldset.querySelector('legend');
      if (legend) {
        const text = cleanLabelText(legend);
        if (text && text.length <= 80) {
          return text;
        }
      }
    }

    // 6. Placeholder fallback
    const placeholder = el.getAttribute('placeholder');
    if (placeholder && placeholder.trim()) {
      return placeholder.trim();
    }

    // 7. Name attribute fallback
    const name = el.getAttribute('name');
    if (name && name.trim()) {
      return formatIdentifier(name.trim());
    }

    // 8. ID attribute fallback
    const id = el.id || el.getAttribute('id');
    if (id && id.trim()) {
      return formatIdentifier(id.trim());
    }

    // 9. Final Fallback
    return 'Unnamed field';
  }

  /**
   * Helper to format snake_case, kebab-case, or camelCase identifiers into human-readable label
   * @param {string} raw
   * @returns {string}
   */
  function formatIdentifier(raw) {
    if (!raw) return '';
    return raw
      .replace(/[-_]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .trim();
  }

  /**
   * Extract options metadata from a <select> element without reading selected value.
   *
   * @param {HTMLSelectElement} selectEl
   * @returns {Array<{ value: string, label: string }>}
   */
  function extractSelectOptions(selectEl) {
    const options = [];
    const optionElements = selectEl.querySelectorAll('option');

    optionElements.forEach((opt) => {
      const val = opt.getAttribute('value') !== null ? opt.getAttribute('value') : opt.text;
      const labelText = (opt.textContent || opt.text || val || '').trim();
      options.push({
        value: val || '',
        label: labelText || val || '',
      });
    });

    return options;
  }

  /**
   * Collect structured metadata for a single form element.
   *
   * @param {HTMLElement} el
   * @param {number} index
   * @returns {object}
   */
  function normalizeField(el, index) {
    const tag = el.tagName.toLowerCase();
    let type = 'text';

    if (tag === 'textarea') {
      type = 'textarea';
    } else if (tag === 'select') {
      type = 'select';
    } else if (tag === 'input') {
      type = (el.getAttribute('type') || 'text').toLowerCase();
    }

    // Find nearest enclosing form
    const form = el.closest('form') || el.form || null;
    const formId = form ? form.id || form.getAttribute('name') || '' : '';
    const formAction = form ? form.getAttribute('action') || '' : '';
    const formMethod = form ? (form.getAttribute('method') || 'get').toLowerCase() : '';

    // Collect base metadata
    const fieldData = {
      index,
      tag,
      type,
      name: el.getAttribute('name') || '',
      id: el.id || el.getAttribute('id') || '',
      label: resolveElementLabel(el),
      placeholder: el.getAttribute('placeholder') || '',
      autocomplete: el.getAttribute('autocomplete') || '',
      required: Boolean(
        el.required ||
        el.hasAttribute('required') ||
        el.getAttribute('aria-required') === 'true'
      ),
      disabled: Boolean(
        el.disabled ||
        el.hasAttribute('disabled') ||
        el.getAttribute('aria-disabled') === 'true'
      ),
      readonly: Boolean(
        el.readOnly ||
        el.hasAttribute('readonly') ||
        el.getAttribute('aria-readonly') === 'true'
      ),
      formId,
      formAction,
      formMethod,
    };

    // Collect optional constraint metadata where present
    const pattern = el.getAttribute('pattern');
    if (pattern) fieldData.pattern = pattern;

    const min = el.getAttribute('min');
    if (min) fieldData.min = min;

    const max = el.getAttribute('max');
    if (max) fieldData.max = max;

    const minlength = el.getAttribute('minlength');
    if (minlength) fieldData.minlength = parseInt(minlength, 10);

    const maxlength = el.getAttribute('maxlength');
    if (maxlength) fieldData.maxlength = parseInt(maxlength, 10);

    const inputmode = el.getAttribute('inputmode');
    if (inputmode) fieldData.inputmode = inputmode;

    const accept = el.getAttribute('accept');
    if (accept) fieldData.accept = accept;

    if (el.hasAttribute('multiple')) {
      fieldData.multiple = true;
    }

    // For select elements, collect options metadata
    if (tag === 'select') {
      fieldData.options = extractSelectOptions(el);
    }

    // For radio buttons & checkboxes, include groupName
    if (type === 'radio' || type === 'checkbox') {
      fieldData.groupName = el.getAttribute('name') || '';
      // Read individual option label/value metadata if given on the element
      const optVal = el.getAttribute('value');
      if (optVal) fieldData.optionValue = optVal;
    }

    return fieldData;
  }

  /**
   * Main scan function called on demand when requested by the extension popup.
   *
   * @returns {object} Standardized Scan Response
   */
  function scanCurrentPage() {
    try {
      const allElements = collectFormElements(document);
      const visibleElements = allElements.filter(isElementVisible);

      const fields = visibleElements.map((el, idx) => normalizeField(el, idx));

      return {
        success: true,
        page: {
          title: document.title || 'Untitled Page',
          url: window.location.href || '',
          origin: window.location.origin || '',
        },
        fields,
        summary: {
          total: fields.length,
          inputs: fields.filter((f) => f.tag === 'input').length,
          textareas: fields.filter((f) => f.tag === 'textarea').length,
          selects: fields.filter((f) => f.tag === 'select').length,
          required: fields.filter((f) => f.required).length,
        },
      };
    } catch (err) {
      console.error('[SYNDEO Form Scanner] Scan error:', err);
      return {
        success: false,
        error: 'Failed to scan DOM structure',
        fields: [],
        summary: { total: 0 },
      };
    }
  }

  // Listen for SCAN_FORM request from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request && request.action === 'SCAN_FORM') {
      const result = scanCurrentPage();
      sendResponse(result);
    }
    // Return true to indicate asynchronous/synchronous response handling
    return false;
  });
})();
