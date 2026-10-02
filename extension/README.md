# SYNDEO Form Scanner Extension (Phase 1)

> **Phase 1: Read-Only Form Metadata Scanner**  
> Discovers and structures form fields requested by the active webpage without collecting entered user values, altering DOM, or transmitting data.

---

## 1. Overview

The **SYNDEO Form Scanner** is a privacy-first Google Chrome Extension (Manifest V3) that connects webpages to the SYNDEO digital memory and verification ecosystem.

In **Phase 1**, the extension operates in **pure READ-ONLY mode**:
- **Discovers** all visible `<input>`, `<textarea>`, and `<select>` elements on any webpage.
- **Extracts metadata** (labels, types, names, IDs, placeholders, autocomplete, required/disabled state, constraints, and select options).
- **Normalizes** the detected fields into a structured JSON schema.
- **Renders** the result in a clean, Deep Obsidian Minimalist popup.

---

## 2. Core Privacy & Read-Only Guarantees

> [!IMPORTANT]
> **SYNDEO Form Scanner currently operates as a read-only form metadata scanner. It does not collect entered form values, modify webpages, submit forms, communicate with the SYNDEO backend, or use AI.**

### What Phase 1 Does:
* Discovers what fields the webpage is asking for (e.g. *"Full Name" → text*, *"Email" → email*, *"Major" → select*).
* Resolves semantic labels through an 8-tier hierarchy.
* Structures and presents this metadata to the user locally inside the extension popup.

### What Phase 1 NEVER Does:
* ❌ Never reads entered user values (`element.value`).
* ❌ Never modifies the DOM or assigns field values (`element.value = ...`).
* ❌ Never changes checkboxes, radios, or dropdown selections.
* ❌ Never clicks buttons, submits forms, or dispatches synthetic DOM events.
* ❌ Never makes network calls (`fetch`, `XMLHttpRequest`, `WebSocket`).
* ❌ Never calls external AI APIs (OpenAI, Gemini, Groq, etc.).
* ❌ Never communicates with the SYNDEO backend, Neo4j graph, or Supabase database.
* ❌ Never stores personal form data.

---

## 3. Extension Architecture

```text
                 CURRENT WEBPAGE
                       │
                       ▼
              ┌─────────────────┐
              │   content.js    │
              │                 │
              │  Read DOM Only  │
              │  • input        │
              │  • textarea     │
              │  • select       │
              │  • Shadow DOM   │
              └────────┬────────┘
                       │
                       │ Normalized Metadata (JSON)
                       ▼
              ┌─────────────────┐
              │    popup.js     │
              │                 │
              │  Request Scan   │
              │  Receive Result │
              │  Safe Render    │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │   popup.html    │
              │                 │
              │  Obsidian UI    │
              │  Field Cards    │
              │  Filters & Meta │
              └─────────────────┘
```

---

## 4. Directory Structure

```text
SYNDEO/
└── extension/
    ├── manifest.json   # Chrome Manifest V3 configuration
    ├── popup.html      # Obsidian minimalist extension popup
    ├── popup.css       # Deep obsidian styling & design tokens
    ├── popup.js        # Controller for scanning & safe DOM rendering
    ├── content.js      # Read-only DOM scanner & label resolver
    ├── icons/          # Extension brand icons (16px, 48px, 128px)
    │   ├── icon16.png
    │   ├── icon48.png
    │   └── icon128.png
    └── README.md       # Architecture & installation guide
```

---

## 5. Installation Instructions

You can load the extension directly in Google Chrome or any Chromium-based browser (Brave, Edge, Arc):

1. Open Chrome and navigate to:
   ```text
   chrome://extensions
   ```
2. Enable **Developer mode** via the toggle switch in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the `extension/` directory located inside your local SYNDEO project root:
   ```text
   d:\college\PROJECTS\SYNDEO\extension
   ```
5. The extension **SYNDEO Form Scanner** (v0.1.0) is now installed and will appear in your Chrome toolbar.

---

## 6. How to Test on Real Websites

1. Open any webpage containing forms (for example:
   * Google Forms
   * Job / internship application portals (Lever, Greenhouse, Workday)
   * College / university registration portals
   * Contact forms, e-commerce checkout forms, or local HTML files
2. Click the **SYNDEO Form Scanner** icon in your browser toolbar.
3. The popup will automatically scan and display all detected fields. You can also click **[ Scan Current Page ]** or **[ Rescan Current Page ]** at any time.
4. Use the category filters (`All`, `Inputs`, `Selects`, `Textarea`, `Required`) and the live search box to inspect specific fields.
5. Click **[ JSON ]** in the popup to copy the standardized structured scan response to your clipboard.

---

## 7. Example Structured Scan Response

```json
{
  "success": true,
  "page": {
    "title": "SLRTCE Postgraduate Registration",
    "url": "https://example.edu/register",
    "origin": "https://example.edu"
  },
  "fields": [
    {
      "index": 0,
      "tag": "input",
      "type": "text",
      "name": "full_name",
      "id": "full-name",
      "label": "Full Name",
      "placeholder": "Enter your legal full name",
      "autocomplete": "name",
      "required": true,
      "disabled": false,
      "readonly": false,
      "formId": "registration-form",
      "formAction": "/api/v1/register",
      "formMethod": "post"
    },
    {
      "index": 1,
      "tag": "input",
      "type": "email",
      "name": "email_address",
      "id": "applicant-email",
      "label": "Email Address",
      "placeholder": "name@example.com",
      "autocomplete": "email",
      "required": true,
      "disabled": false,
      "readonly": false,
      "formId": "registration-form",
      "formAction": "/api/v1/register",
      "formMethod": "post"
    },
    {
      "index": 2,
      "tag": "select",
      "type": "select",
      "name": "department",
      "id": "dept-select",
      "label": "Academic Department",
      "placeholder": "",
      "autocomplete": "",
      "required": true,
      "disabled": false,
      "readonly": false,
      "formId": "registration-form",
      "formAction": "/api/v1/register",
      "formMethod": "post",
      "options": [
        { "value": "cs", "label": "Computer Engineering" },
        { "value": "it", "label": "Information Technology" },
        { "value": "ai-ds", "label": "Artificial Intelligence & Data Science" }
      ]
    }
  ],
  "summary": {
    "total": 3,
    "inputs": 2,
    "textareas": 0,
    "selects": 1,
    "required": 3
  }
}
```

---

## 8. Label Resolution Hierarchy

The scanner determines human-readable labels using a strict 8-step fallback cascade:
1. **Explicit Label**: `<label for="element-id">` (CSS-escaped).
2. **Enclosing Parent Label**: `<label>Label Text <input ...></label>`.
3. **`aria-label`**: Explicit accessibility label attribute.
4. **`aria-labelledby`**: Resolves text of all referenced ID elements.
5. **Associated Nearby Text**: Preceding sibling `<p>`, `<span>`, `<div>`, or `<legend>` under 80 characters.
6. **`placeholder`**: Fallback placeholder string.
7. **`name` / `id` Attribute**: Formatted identifier (e.g. `first_name` → *"First Name"*).
8. **Default Fallback**: `"Unnamed field"`.

---

## 9. Permissions & Security

* **`activeTab`**: Grants temporary, user-initiated permission to inspect the currently focused browser tab when the extension action is triggered.
* **No dangerous permissions**: Does **not** request `cookies`, `storage`, `webRequest`, `history`, `tabs`, or `management`.
* **XSS Prevention**: The popup renders webpage metadata using native DOM `textContent` bindings rather than unsanitized `innerHTML`.

---

## 10. Known Limitations (Phase 1)

1. **Cross-Origin iframes**: Modern browser security limits access to third-party cross-origin iframes without broad host permissions.
2. **Closed Shadow DOM**: Elements inside `mode: "closed"` Shadow Roots are isolated by browser engine design. (Open Shadow DOM is fully traversed).
3. **Chrome Restricted Pages**: System pages (`chrome://`, `chrome-extension://`, Chrome Web Store) block content script execution per Chrome security architecture.

---

## 11. Future Roadmap (Phase 2+)

* **Phase 2 — Field Semantic Mapping**: Map normalized fields to SYNDEO graph entities (`Person.name`, `Education.degree`, `Social.github`).
* **Phase 3 — User-Approved Autofill**: Retrieve encrypted claims from the user's sovereign vault upon explicit permission and fill verified fields.
