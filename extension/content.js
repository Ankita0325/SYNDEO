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

  /**
   * Deterministically locates and fills approved form fields into the DOM
   * using React/Vue/Angular-compatible native prototype setters and event dispatchers.
   *
   * @param {Array<{ field_id: string, claim_name: string, value: string, memory_path: string }>} instructions
   * @returns {object} Fill Execution & DOM Verification Results
   */
  function fillApprovedFields(instructions) {
    if (!Array.isArray(instructions) || instructions.length === 0) {
      return { success: false, error: 'No fill instructions provided', results: [] };
    }

    const allElements = collectFormElements(document);
    const visibleElements = allElements.filter(isElementVisible);
    const scannedFields = normalizeAndGroupFields(visibleElements);

    const fillResults = [];
    let filledCount = 0;

    instructions.forEach((inst) => {
      const fid = inst.field_id;
      const val = inst.value;
      
      // Locate the matching element from scanned fields
      let targetEl = null;
      const matchedField = scannedFields.find(
        (f) =>
          f.id === fid ||
          f.name === fid ||
          f.field_id === fid ||
          `f_${String(f.index).padStart(3, '0')}` === fid ||
          `f_${f.index}` === fid ||
          f.index === parseInt(String(fid).replace('f_', ''), 10)
      );

      if (matchedField) {
        if (matchedField.id) {
          targetEl = document.getElementById(matchedField.id);
        }
        if (!targetEl && matchedField.name) {
          try {
            targetEl = document.querySelector(`[name="${CSS.escape(matchedField.name)}"]`);
          } catch {
            targetEl = document.querySelector(`[name="${matchedField.name}"]`);
          }
        }
        if (!targetEl && typeof matchedField.index === 'number' && visibleElements[matchedField.index]) {
          targetEl = visibleElements[matchedField.index];
        }
      }

      // Fallback search by ID or name directly
      if (!targetEl && fid) {
        try {
          targetEl = document.getElementById(fid) || document.querySelector(`[name="${CSS.escape(fid)}"]`);
        } catch {
          targetEl = document.getElementById(fid);
        }
      }

      if (!targetEl) {
        fillResults.push({
          field_id: fid,
          memory_path: inst.memory_path,
          status: 'NOT_FOUND',
          reason: 'Field element could not be located in DOM',
        });
        return;
      }

      // Check if disabled or readonly
      if (targetEl.disabled || targetEl.getAttribute('aria-disabled') === 'true') {
        fillResults.push({
          field_id: fid,
          memory_path: inst.memory_path,
          status: 'DISABLED',
          reason: 'Field is disabled',
        });
        return;
      }

      if (targetEl.readOnly || targetEl.getAttribute('aria-readonly') === 'true') {
        fillResults.push({
          field_id: fid,
          memory_path: inst.memory_path,
          status: 'READONLY',
          reason: 'Field is read-only',
        });
        return;
      }

      const tag = targetEl.tagName.toLowerCase();
      const type = (targetEl.getAttribute('type') || 'text').toLowerCase();
      const role = (targetEl.getAttribute('role') || '').toLowerCase();
      let valueStr = String(val ?? '');

      try {
        // -----------------------------------------------------------------------
        // A. DATE & TIME INPUTS (date, month, datetime-local, time)
        // -----------------------------------------------------------------------
        if (type === 'date' || type === 'month' || type === 'datetime-local' || type === 'time') {
          const formattedDate = (function normalizeDate(raw, dateType) {
            if (!raw) return '';
            const str = String(raw).trim();

            if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
              return dateType === 'month' ? str.slice(0, 7) : str;
            }

            // Check standard JS date parse
            const d = new Date(str);
            if (!isNaN(d.getTime())) {
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              if (dateType === 'month') return `${yyyy}-${mm}`;
              if (dateType === 'datetime-local') return `${yyyy}-${mm}-${dd}T09:00`;
              return `${yyyy}-${mm}-${dd}`;
            }

            // DD/MM/YYYY or DD-MM-YYYY
            const dmy = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
            if (dmy) {
              const dd = dmy[1].padStart(2, '0');
              const mm = dmy[2].padStart(2, '0');
              const yyyy = dmy[3];
              if (dateType === 'month') return `${yyyy}-${mm}`;
              return `${yyyy}-${mm}-${dd}`;
            }

            // 4-digit Year fallback (e.g. "2024" or "Class of 2024")
            const yr = str.match(/\b(19\d{2}|20\d{2})\b/);
            if (yr) {
              const yyyy = yr[1];
              if (dateType === 'month') return `${yyyy}-01`;
              return `${yyyy}-01-01`;
            }

            return str;
          })(valueStr, type);

          try { targetEl.focus(); } catch {}
          const inputProto = window.HTMLInputElement.prototype;
          const valSetter = Object.getOwnPropertyDescriptor(inputProto, 'value')?.set;
          if (valSetter) {
            valSetter.call(targetEl, formattedDate);
          } else {
            targetEl.value = formattedDate;
          }

          targetEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
          targetEl.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
          targetEl.dispatchEvent(new Event('blur', { bubbles: true, composed: true }));

          const verified = Boolean(targetEl.value);
          fillResults.push({
            field_id: fid,
            memory_path: inst.memory_path,
            status: verified ? 'FILLED' : 'VALUE_MISMATCH',
            reason: verified ? `Date filled as ${targetEl.value}` : 'Date assignment rejected by browser format constraint',
          });
          if (verified) filledCount++;

        // -----------------------------------------------------------------------
        // B. SELECT DROPDOWNS (<select> or <select multiple>)
        // -----------------------------------------------------------------------
        } else if (tag === 'select') {
          let optionMatched = false;
          const searchNorm = valueStr.trim().toLowerCase();
          const searchTokens = searchNorm.split(/[\s,/-]+/).filter((t) => t.length > 2);

          // 1. Direct value / label match
          for (let i = 0; i < targetEl.options.length; i++) {
            const opt = targetEl.options[i];
            const optVal = (opt.value || '').trim().toLowerCase();
            const optText = (opt.text || '').trim().toLowerCase();

            if (optVal === searchNorm || optText === searchNorm || optText.includes(searchNorm) || searchNorm.includes(optText)) {
              targetEl.selectedIndex = i;
              opt.selected = true;
              optionMatched = true;
              break;
            }
          }

          // 2. Token overlap fallback if direct match not found
          if (!optionMatched && searchTokens.length > 0) {
            let maxOverlap = 0;
            let bestIndex = -1;
            for (let i = 0; i < targetEl.options.length; i++) {
              const optText = (targetEl.options[i].text || '').trim().toLowerCase();
              const overlap = searchTokens.filter((token) => optText.includes(token)).length;
              if (overlap > maxOverlap) {
                maxOverlap = overlap;
                bestIndex = i;
              }
            }
            if (bestIndex >= 0 && maxOverlap > 0) {
              targetEl.selectedIndex = bestIndex;
              targetEl.options[bestIndex].selected = true;
              optionMatched = true;
            }
          }

          const selectProto = window.HTMLSelectElement.prototype;
          const selectSetter = Object.getOwnPropertyDescriptor(selectProto, 'value')?.set;
          if (selectSetter && optionMatched) {
            selectSetter.call(targetEl, targetEl.value);
          }

          targetEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
          targetEl.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
          targetEl.dispatchEvent(new Event('blur', { bubbles: true, composed: true }));

          fillResults.push({
            field_id: fid,
            memory_path: inst.memory_path,
            status: optionMatched ? 'FILLED' : 'VALUE_MISMATCH',
            reason: optionMatched ? `Selected option "${targetEl.options[targetEl.selectedIndex]?.text}"` : 'No matching select option found',
          });
          if (optionMatched) filledCount++;

        // -----------------------------------------------------------------------
        // C. CHECKBOXES (<input type="checkbox"> or group)
        // -----------------------------------------------------------------------
        } else if (type === 'checkbox') {
          const groupName = targetEl.name;
          const searchNorm = valueStr.trim().toLowerCase();

          // Check if there are sibling checkboxes sharing this name (multi-choice checkbox list)
          const checkboxGroup = groupName
            ? Array.from(document.querySelectorAll(`input[type="checkbox"][name="${CSS.escape(groupName)}"]`))
            : [targetEl];

          let anyChecked = false;

          if (checkboxGroup.length > 1) {
            // Group multi-choice checkbox
            for (const chk of checkboxGroup) {
              const cVal = (chk.value || '').trim().toLowerCase();
              const cLbl = resolveOptionLabel(chk).toLowerCase();
              const shouldCheck = searchNorm.includes(cVal) || searchNorm.includes(cLbl) || cVal.includes(searchNorm) || cLbl.includes(searchNorm);

              const checkSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked')?.set;
              if (checkSetter) checkSetter.call(chk, shouldCheck);
              else chk.checked = shouldCheck;

              chk.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
              chk.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
              if (shouldCheck) {
                try { chk.click(); } catch {}
                anyChecked = true;
              }
            }
          } else {
            // Standalone boolean checkbox
            const boolVal = Boolean(val === true || val === 'true' || val === '1' || val === 'yes' || searchNorm === 'on');
            const checkSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked')?.set;
            if (checkSetter) checkSetter.call(targetEl, boolVal);
            else targetEl.checked = boolVal;

            targetEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
            targetEl.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
            targetEl.dispatchEvent(new Event('blur', { bubbles: true, composed: true }));
            anyChecked = true;
          }

          fillResults.push({
            field_id: fid,
            memory_path: inst.memory_path,
            status: 'FILLED',
            reason: `Checkbox options updated`,
          });
          filledCount++;

        // -----------------------------------------------------------------------
        // D. RADIO BUTTON GROUPS (<input type="radio"> or custom ARIA radios)
        // -----------------------------------------------------------------------
        } else if (type === 'radio' || role === 'radiogroup' || role === 'radio') {
          let radioMatched = false;
          const searchNorm = valueStr.trim().toLowerCase();
          const searchTokens = searchNorm.split(/[\s,/-]+/).filter((t) => t.length > 2);

          // 1. Find standard radio buttons
          const groupName = targetEl.name;
          const radioGroup = groupName
            ? Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(groupName)}"]`))
            : Array.from(targetEl.closest('fieldset, form, [role="radiogroup"], [role="group"]')?.querySelectorAll('input[type="radio"]') || [targetEl]);

          for (const radio of radioGroup) {
            const rVal = (radio.value || '').trim().toLowerCase();
            const rLbl = resolveOptionLabel(radio).toLowerCase();

            if (rVal === searchNorm || rLbl === searchNorm || rLbl.includes(searchNorm) || searchNorm.includes(rLbl) || searchTokens.some((t) => rLbl.includes(t))) {
              const checkSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked')?.set;
              if (checkSetter) checkSetter.call(radio, true);
              else radio.checked = true;

              try { radio.click(); } catch {}
              radio.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
              radio.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
              radio.dispatchEvent(new Event('blur', { bubbles: true, composed: true }));
              radioMatched = true;
              break;
            }
          }

          // 2. Fallback to custom ARIA radio buttons (e.g. Google Forms / React UI)
          if (!radioMatched) {
            const ariaRadios = Array.from(
              targetEl.closest('[role="radiogroup"], [role="group"], .freebirdFormviewerViewNumberedItemContainer')?.querySelectorAll('[role="radio"], [role="checkbox"]') || []
            );
            for (const aRadio of ariaRadios) {
              const aLbl = (aRadio.getAttribute('aria-label') || aRadio.textContent || '').trim().toLowerCase();
              if (aLbl === searchNorm || aLbl.includes(searchNorm) || searchNorm.includes(aLbl)) {
                try {
                  aRadio.click();
                  aRadio.setAttribute('aria-checked', 'true');
                } catch {}
                aRadio.dispatchEvent(new Event('click', { bubbles: true, composed: true }));
                radioMatched = true;
                break;
              }
            }
          }

          fillResults.push({
            field_id: fid,
            memory_path: inst.memory_path,
            status: radioMatched ? 'FILLED' : 'VALUE_MISMATCH',
            reason: radioMatched ? `Multiple choice selection filled` : 'No matching choice option in radio group',
          });
          if (radioMatched) filledCount++;

        // -----------------------------------------------------------------------
        // E. STANDARD TEXT / NUMBER / TEXTAREA INPUTS
        // -----------------------------------------------------------------------
        } else {
          const proto = tag === 'textarea' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
          const valSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

          try { targetEl.focus(); } catch {}

          if (valSetter) {
            valSetter.call(targetEl, valueStr);
          } else {
            targetEl.value = valueStr;
          }

          // Framework compatibility event sequence (React SyntheticEvent / Vue Reactivity)
          targetEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
          targetEl.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
          targetEl.dispatchEvent(new Event('blur', { bubbles: true, composed: true }));

          // Immediate DOM Verification
          const verified = (targetEl.value === valueStr);

          fillResults.push({
            field_id: fid,
            memory_path: inst.memory_path,
            status: verified ? 'FILLED' : 'VALUE_MISMATCH',
            reason: verified ? 'DOM value verified successfully' : 'DOM value mismatch after event dispatch',
          });
          if (verified) filledCount++;
        }
      } catch (fillErr) {
        fillResults.push({
          field_id: fid,
          memory_path: inst.memory_path,
          status: 'ERROR',
          reason: fillErr.message || 'Error modifying DOM element',
        });
      }
    });

    return {
      success: true,
      total_requested: instructions.length,
      filled_count: filledCount,
      results: fillResults,
    };
  }

  // Listen for SCAN_FORM and FILL_FIELDS requests from popup
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
    } else if (request && request.action === 'FILL_FIELDS') {
      try {
        const result = fillApprovedFields(request.instructions || []);
        sendResponse(result);
      } catch (err) {
        console.error('[SYNDEO Form Scanner] Content script fill error:', err);
        sendResponse({
          success: false,
          error: err.message || 'Failed to fill fields into DOM',
          results: [],
        });
      }
    }
    return true; // Keep message channel open for response
  });
})();

