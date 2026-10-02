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

  // Ignored input types that represent actions rather than data fields
  const NON_DATA_INPUT_TYPES = new Set(['submit', 'reset', 'button', 'image', 'hidden']);

  // Generic placeholder strings that should never be used as the field's primary question label
  const GENERIC_LABELS = new Set([
    'your answer',
    'short answer text',
    'long answer text',
    'option',
    'option 1',
    'other',
    'other:',
    'date',
    'time',
    'month',
    'day',
    'year',
    'unnamed field',
  ]);

  /**
   * Recursively collect all input, textarea, select, and rich ARIA form elements
   * from a root node, traversing any open Shadow DOMs.
   *
   * @param {Node} root
   * @returns {HTMLElement[]}
   */
  function collectFormElements(root = document) {
    const elements = [];
    
    // Standard HTML form elements
    const standardMatches = root.querySelectorAll('input, textarea, select');
    for (const el of standardMatches) {
      const tag = el.tagName.toLowerCase();
      if (tag === 'input') {
        const type = (el.getAttribute('type') || 'text').toLowerCase();
        if (NON_DATA_INPUT_TYPES.has(type)) {
          continue;
        }
      }
      elements.push(el);
    }

    // Custom ARIA role form controls (Google Forms, Radix, MUI, React/Vue custom components)
    const ariaMatches = root.querySelectorAll(
      '[role="textbox"], [role="combobox"], [role="listbox"], [role="radiogroup"], [role="group"], [contenteditable="true"]'
    );
    for (const el of ariaMatches) {
      const tag = el.tagName.toLowerCase();
      if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
        // For role="group" or role="radiogroup", ensure it contains radio/checkbox choices
        if (el.getAttribute('role') === 'group' || el.getAttribute('role') === 'radiogroup') {
          const hasChoices = el.querySelector('[role="radio"], [role="checkbox"], input[type="radio"], input[type="checkbox"]');
          if (hasChoices) {
            elements.push(el);
          }
        } else {
          elements.push(el);
        }
      }
    }

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
   * Robust visibility check that retains styled form elements
   * (e.g. Tailwind / Radix / MUI checkboxes/radios/files with opacity: 0 or clip-path)
   * while correctly ignoring elements inside genuinely hidden containers.
   *
   * @param {HTMLElement} el
   * @returns {boolean}
   */
  function isElementVisible(el) {
    if (!el || !(el instanceof HTMLElement)) return false;

    try {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') {
        const parent = el.parentElement;
        if (!parent) return false;
        const parentStyle = window.getComputedStyle(parent);
        if (parentStyle.display === 'none' || parentStyle.visibility === 'hidden') {
          return false;
        }
      }
    } catch {
      // Ignore style reading issues
    }

    let parent = el.parentElement;
    let depth = 0;
    while (parent && depth < 6) {
      try {
        const pStyle = window.getComputedStyle(parent);
        if (pStyle.display === 'none' || pStyle.visibility === 'hidden') {
          return false;
        }
      } catch {
        break;
      }
      parent = parent.parentElement;
      depth++;
    }

    return true;
  }

  /**
   * Extract clean, readable text from a DOM element, stripping out nested input/select elements,
   * scripts, styles, error messages, and asterisks.
   *
   * @param {HTMLElement} el
   * @returns {string}
   */
  function cleanLabelText(el) {
    if (!el) return '';
    try {
      const clone = el.cloneNode(true);
      const unwanted = clone.querySelectorAll(
        'input, select, textarea, button, script, style, svg, [role="tooltip"], .error, .helper-text, .tooltip, [aria-hidden="true"]'
      );
      unwanted.forEach((n) => n.remove());
      
      let text = (clone.textContent || '').replace(/\s+/g, ' ').trim();
      text = text.replace(/[\s*:]+$/g, '').trim();
      return text;
    } catch {
      return (el.textContent || '').replace(/\s+/g, ' ').replace(/[\s*:]+$/g, '').trim();
    }
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
   * Check if a label text is generic (e.g. "Your answer") and should be replaced
   * by the enclosing question heading.
   *
   * @param {string} text
   * @returns {boolean}
   */
  function isGenericLabel(text) {
    if (!text) return true;
    const lower = text.trim().toLowerCase();
    return GENERIC_LABELS.has(lower);
  }

  /**
   * Discover question/title from enclosing Google Forms question container,
   * fieldset, or section container.
   *
   * @param {HTMLElement} el
   * @returns {string}
   */
  function findEnclosingQuestionTitle(el) {
    // 1. Google Forms Question Item Container (.Qr7Oae, [role="listitem"], .geS5n)
    const googleFormItem = el.closest('[role="listitem"], .Qr7Oae, .geS5n, .freebirdFormviewerViewItemsItemItemWrapper');
    if (googleFormItem) {
      const heading = googleFormItem.querySelector('[role="heading"], .M7eMe, .freebirdFormviewerViewItemsItemItemTitle, .HoXoMd, h1, h2, h3, h4');
      if (heading) {
        const text = cleanLabelText(heading);
        if (text && text.length > 0 && text.length <= 120 && text.toLowerCase() !== 'contact information') {
          return text;
        }
      }
    }

    // 2. Standard <fieldset><legend>
    const fieldset = el.closest('fieldset');
    if (fieldset) {
      const legend = fieldset.querySelector('legend');
      if (legend) {
        const text = cleanLabelText(legend);
        if (text && text.length <= 120) return text;
      }
    }

    // 3. ARIA Radiogroup / Group container
    const roleGroup = el.closest('[role="radiogroup"], [role="group"]');
    if (roleGroup) {
      const ariaLabel = roleGroup.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.trim() && !isGenericLabel(ariaLabel)) {
        return ariaLabel.trim().replace(/[\s*:]+$/g, '');
      }

      const ariaLabelledBy = roleGroup.getAttribute('aria-labelledby');
      if (ariaLabelledBy) {
        const ids = ariaLabelledBy.trim().split(/\s+/);
        const parts = [];
        for (const id of ids) {
          const refEl = document.getElementById(id);
          if (refEl) {
            const t = cleanLabelText(refEl);
            if (t) parts.push(t);
          }
        }
        if (parts.length > 0) return parts.join(' ').trim();
      }
    }

    return '';
  }

  /**
   * Check if enclosing container indicates this question is required (Google Forms / Standard forms)
   *
   * @param {HTMLElement} el
   * @returns {boolean}
   */
  function checkIsRequired(el) {
    if (
      el.required ||
      el.hasAttribute('required') ||
      el.getAttribute('aria-required') === 'true' ||
      el.getAttribute('data-required') === 'true'
    ) {
      return true;
    }

    const container = el.closest('[role="listitem"], .Qr7Oae, .geS5n, .form-group');
    if (container) {
      if (container.querySelector('[aria-label*="Required"], .v3Yvs-T7iKzc, [class*="requiredAsterisk"]')) {
        return true;
      }
      if (container.getAttribute('aria-required') === 'true') {
        return true;
      }
    }

    return false;
  }

  /**
   * Precise label resolution for a specific individual field.
   *
   * @param {HTMLElement} el
   * @returns {string}
   */
  function resolveElementLabel(el) {
    // 1. If inside Google Forms or container with distinct question title, check that first if element label is generic
    const questionTitle = findEnclosingQuestionTitle(el);

    // 2. Explicit <label for="element_id">
    if (el.id) {
      try {
        const explicitLabel = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (explicitLabel) {
          const text = cleanLabelText(explicitLabel);
          if (text && !isGenericLabel(text)) return text;
        }
      } catch {}
    }

    // 3. Parent enclosing <label>
    const parentLabel = el.closest('label');
    if (parentLabel) {
      const text = cleanLabelText(parentLabel);
      if (text && !isGenericLabel(text)) return text;
    }

    // 4. aria-label on this specific element
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim() && !isGenericLabel(ariaLabel)) {
      return ariaLabel.trim().replace(/[\s*:]+$/g, '');
    }

    // 5. aria-labelledby on this specific element
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
        const joined = parts.join(' ').trim();
        if (!isGenericLabel(joined)) return joined;
      }
    }

    // 6. If enclosing question title exists, use it! (Solves "Your answer" -> "Address", "About You", "Date of Birth")
    if (questionTitle) {
      return questionTitle;
    }

    // 7. Immediate previous sibling element
    const prev = el.previousElementSibling;
    if (prev && ['label', 'span', 'p', 'strong', 'h3', 'h4', 'h5'].includes(prev.tagName.toLowerCase())) {
      const t = cleanLabelText(prev);
      if (t && t.length > 0 && t.length <= 80 && !t.includes('\n') && !isGenericLabel(t)) {
        return t;
      }
    }

    // 8. Placeholder fallback
    const placeholder = el.getAttribute('placeholder');
    if (placeholder && placeholder.trim() && !isGenericLabel(placeholder)) {
      return placeholder.trim();
    }

    // 9. Name attribute fallback
    const name = el.getAttribute('name');
    if (name && name.trim() && !isGenericLabel(name)) {
      return formatIdentifier(name.trim());
    }

    // 10. ID attribute fallback
    const id = el.id || el.getAttribute('id');
    if (id && id.trim() && !isGenericLabel(id)) {
      return formatIdentifier(id.trim());
    }

    return 'Unnamed field';
  }

  /**
   * Extract options from an ARIA radiogroup, group, or native container
   *
   * @param {HTMLElement} containerEl
   * @returns {Array<{ value: string, label: string }>}
   */
  function extractGroupOptions(containerEl) {
    const options = [];
    // Query individual radio/checkbox nodes (Google Forms uses [role="radio"], [role="checkbox"], .docssharedWdnjfc)
    const choiceNodes = containerEl.querySelectorAll(
      '[role="radio"], [role="checkbox"], input[type="radio"], input[type="checkbox"], .docssharedWdnjfc, .YEVLpc'
    );

    choiceNodes.forEach((node) => {
      const ariaLabel = node.getAttribute('aria-label') || '';
      if (ariaLabel.toLowerCase().includes('clear selection')) return;

      const dataValue = node.getAttribute('data-value') || ariaLabel;
      const labelSpan = node.querySelector('.aDTYNe, .docssharedWdnjfcLabel, label, span');
      let labelText = labelSpan ? cleanLabelText(labelSpan) : cleanLabelText(node);

      // Clean out "Clear selection"
      if (labelText.toLowerCase().includes('clear selection')) {
        labelText = labelText.replace(/clear selection/gi, '').trim();
      }

      const finalVal = dataValue || labelText || '';
      const finalLbl = labelText || dataValue || '';

      if (finalLbl && finalLbl.length > 0 && finalLbl.toLowerCase() !== 'clear selection') {
        // Prevent exact duplicates inside the same group
        if (!options.some((o) => o.label === finalLbl || o.value === finalVal)) {
          options.push({
            value: finalVal || finalLbl,
            label: finalLbl,
          });
        }
      }
    });

    return options;
  }

  /**
   * Extract individual option label for a standalone radio or checkbox element
   * @param {HTMLElement} el
   * @returns {string}
   */
  function resolveOptionLabel(el) {
    if (el.id) {
      try {
        const explicitLabel = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (explicitLabel) {
          const t = cleanLabelText(explicitLabel);
          if (t && !isGenericLabel(t)) return t;
        }
      } catch {}
    }

    const parentLabel = el.closest('label');
    if (parentLabel) {
      const t = cleanLabelText(parentLabel);
      if (t && !isGenericLabel(t)) return t;
    }

    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim() && !isGenericLabel(ariaLabel)) return ariaLabel.trim();

    const dataLabel = el.getAttribute('data-label') || el.getAttribute('data-value');
    if (dataLabel && dataLabel.trim() && !isGenericLabel(dataLabel)) return dataLabel.trim();

    const next = el.nextElementSibling;
    if (next && ['span', 'label', 'div', 'p', 'strong', 'b'].includes(next.tagName.toLowerCase())) {
      const t = cleanLabelText(next);
      if (t && t.length <= 80 && !isGenericLabel(t)) return t;
    }

    const val = el.getAttribute('value');
    if (val && val.trim() && val !== 'on' && val !== 'true') {
      return formatIdentifier(val.trim());
    }

    return 'Option';
  }

  /**
   * Extract all options metadata from a standard <select> or custom listbox/combobox.
   *
   * @param {HTMLElement} selectEl
   * @returns {Array<{ value: string, label: string }>}
   */
  function extractSelectOptions(selectEl) {
    const options = [];
    const tag = selectEl.tagName.toLowerCase();

    if (tag === 'select') {
      const optionElements = selectEl.querySelectorAll('option');
      optionElements.forEach((opt) => {
        const val = opt.getAttribute('value') !== null ? opt.getAttribute('value') : opt.text;
        const labelText = (opt.textContent || opt.text || val || '').trim();
        options.push({
          value: val || '',
          label: labelText || val || 'Unnamed Option',
        });
      });
    } else {
      const optElements = selectEl.querySelectorAll('[role="option"], li, [data-value]');
      optElements.forEach((opt) => {
        const val = opt.getAttribute('data-value') || opt.getAttribute('value') || opt.id || cleanLabelText(opt);
        const labelText = cleanLabelText(opt) || val;
        options.push({
          value: val || '',
          label: labelText || 'Unnamed Option',
        });
      });
    }

    return options;
  }

  /**
   * Collect structured metadata for all elements, automatically grouping multiple
   * radio buttons and multi-choice checkboxes under their parent question.
   *
   * @param {HTMLElement[]} elements
   * @returns {object[]}
   */
  function normalizeAndGroupFields(elements) {
    const fields = [];
    const radioGroups = new Map();
    const checkboxGroups = new Map();
    const handledElements = new Set();

    elements.forEach((el) => {
      if (handledElements.has(el)) return;

      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute('role') || '';
      let type = 'text';

      if (tag === 'textarea') {
        type = 'textarea';
      } else if (tag === 'select') {
        type = 'select';
      } else if (tag === 'input') {
        type = (el.getAttribute('type') || 'text').toLowerCase();
      } else {
        if (role === 'textbox' || el.hasAttribute('contenteditable')) {
          type = 'textarea';
        } else if (role === 'combobox' || role === 'listbox') {
          type = 'select';
        } else if (role === 'radiogroup' || role === 'radio') {
          type = 'radio';
        } else if (role === 'checkbox' || role === 'group') {
          type = 'checkbox';
        }
      }

      // Check if this is a Google Forms or ARIA Date Picker
      if (type === 'text') {
        const qTitle = findEnclosingQuestionTitle(el).toLowerCase();
        if (qTitle.includes('date') || qTitle.includes('dob') || qTitle.includes('birth')) {
          type = 'date';
        }
      }

      // Form context
      const form = el.closest('form') || el.form || null;
      const formId = form ? form.id || form.getAttribute('name') || '' : '';
      const formAction = form ? form.getAttribute('action') || '' : '';
      const formMethod = form ? (form.getAttribute('method') || 'get').toLowerCase() : '';

      const name = el.getAttribute('name') || el.getAttribute('data-name') || '';
      const id = el.id || el.getAttribute('id') || '';
      const isRequired = checkIsRequired(el);
      const isMultiple = Boolean(
        el.multiple ||
        el.hasAttribute('multiple') ||
        el.getAttribute('aria-multiselectable') === 'true'
      );

      // =========================================================================
      // 1. ARIA RADIOGROUP / GROUP (Google Forms Radios & Checkboxes)
      // =========================================================================
      if (role === 'radiogroup' || (role === 'group' && el.querySelector('[role="radio"], [role="checkbox"]'))) {
        handledElements.add(el);
        const isRadioGroup = role === 'radiogroup' || Boolean(el.querySelector('[role="radio"]'));
        const optionsList = extractGroupOptions(el);
        const groupTitle = findEnclosingQuestionTitle(el) || el.getAttribute('aria-label') || 'Multiple Choice Question';

        // Mark all inner radio/checkbox elements as handled
        el.querySelectorAll('[role="radio"], [role="checkbox"], input').forEach((c) => handledElements.add(c));

        const fieldRecord = {
          index: fields.length,
          tag: 'input',
          type: isRadioGroup ? 'radio' : 'checkbox',
          name: name || id || `choice-group-${fields.length}`,
          id: id || `choice-group-${fields.length}`,
          label: groupTitle,
          placeholder: '',
          autocomplete: '',
          required: isRequired,
          disabled: Boolean(el.getAttribute('aria-disabled') === 'true'),
          readonly: false,
          multiple: !isRadioGroup,
          options: optionsList,
          formId,
          formAction,
          formMethod,
        };

        fields.push(fieldRecord);
        return;
      }

      // =========================================================================
      // 2. STANDARD RADIO BUTTONS: Group by name
      // =========================================================================
      if (type === 'radio') {
        const groupKey = name || el.closest('fieldset')?.id || `radio-group-${fields.length}`;
        const optionVal = el.getAttribute('value') || id || `option-${radioGroups.get(groupKey)?.options.length || 0}`;
        const optionLabel = resolveOptionLabel(el);

        if (!radioGroups.has(groupKey)) {
          const questionLabel = findEnclosingQuestionTitle(el) || (name ? formatIdentifier(name) : 'Multiple Choice Question');
          const fieldRecord = {
            index: fields.length,
            tag: 'input',
            type: 'radio',
            name: name || groupKey,
            id: id || groupKey,
            label: questionLabel,
            placeholder: '',
            autocomplete: el.getAttribute('autocomplete') || '',
            required: isRequired,
            disabled: Boolean(el.disabled || el.getAttribute('aria-disabled') === 'true'),
            readonly: Boolean(el.readOnly),
            multiple: false,
            options: [],
            formId,
            formAction,
            formMethod,
          };
          radioGroups.set(groupKey, fieldRecord);
          fields.push(fieldRecord);
        }

        const groupObj = radioGroups.get(groupKey);
        if (isRequired) groupObj.required = true;
        groupObj.options.push({
          value: optionVal,
          label: optionLabel,
          id: id || '',
        });
        return;
      }

      // =========================================================================
      // 3. STANDARD CHECKBOXES: Group by name if shared
      // =========================================================================
      if (type === 'checkbox' && name) {
        const groupKey = name;
        const optionVal = el.getAttribute('value') || id || 'on';
        const optionLabel = resolveOptionLabel(el);

        if (!checkboxGroups.has(groupKey)) {
          const questionLabel = findEnclosingQuestionTitle(el) || formatIdentifier(name);
          const fieldRecord = {
            index: fields.length,
            tag: 'input',
            type: 'checkbox',
            name,
            id: id || groupKey,
            label: questionLabel || optionLabel,
            placeholder: '',
            autocomplete: el.getAttribute('autocomplete') || '',
            required: isRequired,
            disabled: Boolean(el.disabled),
            readonly: Boolean(el.readOnly),
            multiple: true,
            options: [],
            formId,
            formAction,
            formMethod,
          };
          checkboxGroups.set(groupKey, fieldRecord);
          fields.push(fieldRecord);
        }

        const groupObj = checkboxGroups.get(groupKey);
        if (isRequired) groupObj.required = true;
        groupObj.options.push({
          value: optionVal,
          label: optionLabel,
          id: id || '',
        });
        return;
      }

      // =========================================================================
      // 4. SELECT DROPDOWNS
      // =========================================================================
      if (tag === 'select' || type === 'select') {
        const optionsList = extractSelectOptions(el);
        const fieldRecord = {
          index: fields.length,
          tag: 'select',
          type: 'select',
          name,
          id,
          label: resolveElementLabel(el),
          placeholder: el.getAttribute('placeholder') || '',
          autocomplete: el.getAttribute('autocomplete') || '',
          required: isRequired,
          disabled: Boolean(el.disabled || el.getAttribute('aria-disabled') === 'true'),
          readonly: Boolean(el.readOnly),
          multiple: isMultiple,
          options: optionsList,
          formId,
          formAction,
          formMethod,
        };
        fields.push(fieldRecord);
        return;
      }

      // =========================================================================
      // 5. STANDARD INPUTS & TEXTAREAS
      // =========================================================================
      const resolvedLabel = resolveElementLabel(el);
      const fieldRecord = {
        index: fields.length,
        tag,
        type,
        name,
        id,
        label: resolvedLabel,
        placeholder: el.getAttribute('placeholder') || '',
        autocomplete: el.getAttribute('autocomplete') || '',
        required: isRequired,
        disabled: Boolean(el.disabled || el.getAttribute('aria-disabled') === 'true'),
        readonly: Boolean(el.readOnly || el.getAttribute('aria-readonly') === 'true'),
        formId,
        formAction,
        formMethod,
      };

      const pattern = el.getAttribute('pattern');
      if (pattern) fieldRecord.pattern = pattern;

      const min = el.getAttribute('min');
      if (min) fieldRecord.min = min;

      const max = el.getAttribute('max');
      if (max) fieldRecord.max = max;

      const minlength = el.getAttribute('minlength');
      if (minlength) fieldRecord.minlength = parseInt(minlength, 10);

      const maxlength = el.getAttribute('maxlength');
      if (maxlength) fieldRecord.maxlength = parseInt(maxlength, 10);

      const inputmode = el.getAttribute('inputmode');
      if (inputmode) fieldRecord.inputmode = inputmode;

      const accept = el.getAttribute('accept');
      if (accept) fieldRecord.accept = accept;

      if (isMultiple) {
        fieldRecord.multiple = true;
      }

      // Standalone checkbox without shared group name
      if (type === 'checkbox') {
        fieldRecord.options = [
          {
            value: el.getAttribute('value') || 'true',
            label: resolveOptionLabel(el) || resolvedLabel,
          },
        ];
      }

      fields.push(fieldRecord);
    });

    // Reindex
    fields.forEach((f, idx) => {
      f.index = idx;
    });

    return fields;
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

      const fields = normalizeAndGroupFields(visibleElements);

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
          inputs: fields.filter((f) => f.tag === 'input' && f.type !== 'radio' && f.type !== 'checkbox').length,
          selects: fields.filter((f) => f.type === 'select').length,
          radiosCheckboxes: fields.filter((f) => f.type === 'radio' || f.type === 'checkbox').length,
          textareas: fields.filter((f) => f.type === 'textarea').length,
          required: fields.filter((f) => f.required).length,
        },
      };
    } catch (err) {
      console.error('[SYNDEO Form Scanner] Scan error:', err);
      return {
        success: false,
        error: err.message || 'Failed to scan DOM structure',
        fields: [],
        summary: { total: 0 },
      };
    }
  }

  // Listen for SCAN_FORM request from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request && request.action === 'SCAN_FORM') {
      try {
        const result = scanCurrentPage();
        sendResponse(result);
      } catch (err) {
        console.error('[SYNDEO Form Scanner] Content script handler error:', err);
        sendResponse({
          success: false,
          error: err.message || 'Failed to scan DOM structure',
          fields: [],
          summary: { total: 0 },
        });
      }
    }
    return true; // Keep message channel open for response
  });
})();
