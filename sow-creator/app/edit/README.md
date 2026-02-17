# SOW Editor

A browser-based Statement of Work editor that lets you build, edit, and export professional SOW documents directly on the page — no separate forms or settings panels.

---

## Getting Started

Navigate to `/edit` in the app. The page loads with a default blank document ready to fill in.

To load an existing SOW, click **Load** in the top toolbar and select a `.json` file.

---

## Layout

```
┌─────────────────────────────────────────────────────┐
│  Toolbar: document name | Load | Save | Export      │
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│   Sections   │   Document Pages                     │
│   Navigator  │   (scrolls independently)            │
│              │                                      │
│   (scrolls   │   Page 1 — Cover Page                │
│   indepen-   │   Page 2 — Table of Contents         │
│   dently)    │   Page 3 — Document Content          │
│              │                                      │
└──────────────┴──────────────────────────────────────┘
```

The left panel and the document pages scroll independently — scrolling through the pages will not move the section list.

---

## Editing Text

**Click any text on the page to edit it.** This includes:
- Cover page fields (title, product name, building, location, date, etc.)
- Section titles and body text
- Header and footer zones on every page
- Table cells

Click away or press **Enter** to confirm and return to document view.

---

## Cover Page (Page 1)

Click directly on any field to edit:

| Field | Description |
|---|---|
| SOW Title | The main document title (e.g. "Statement of Work") |
| Product Name | The product or project this SOW covers |
| Building | Building number |
| Location | City, State |
| Prepared by | Person or team name |
| Team / Department | Department or team |
| Date | Document date |

---

## Headers & Footers (Pages 2 & 3)

Each page has three editable zones in the header and footer: **left**, **center**, and **right**.

Click any zone to edit. Press **Enter** for a new line within a zone.

**Page numbers:** Type `{PAGE}` anywhere in a footer zone and it will display as the real page number. Click the zone to see the `{PAGE}` template text again.

---

## Sections (Page 3)

### Editing a section
Click the section title or body text to edit inline.

### Hover toolbar
Hover over any section to reveal a small toolbar in the top-right corner:

| Button | Action |
|---|---|
| `+ Sub` | Add a subsection inside this section |
| `+ Section` | Add a new section at the same level, below this one |
| `Table` | Add a table to this section |
| 🗑 | Delete this section and all its subsections |

### Adding a table
1. Hover the section → click **Table**
2. Enter the number of rows (max 20) and columns (max 10)
3. Click **Add**
4. Click any cell to edit its content

### Section numbering
Numbering is automatic. It updates whenever sections are added or deleted — you cannot set it manually.

### Adding a top-level section
Scroll to the bottom of Page 3 and click **+ Add Top-Level Section**.

---

## Sections Navigator (Left Panel)

The left panel lists all sections. Click any section name to scroll the document to that section.

Click the **▶ / ▼** arrow next to a section to expand or collapse its subsections in the list.

---

## Toolbar

| Button | Action |
|---|---|
| ✏ (pencil icon) | Edit the document name |
| **Load** | Load a `.json` SOW file |
| **Save** | Download the current document as a `.json` file |
| **Export** | Export to Word `.docx` (backend integration pending) |

### Document Name
Click the pencil icon to rename the document. Press **Enter** or click **Save** to confirm. Press **Escape** to cancel.

The document name becomes the save filename: `my-sow-2026-02-14.json`

---

## Table of Contents (Page 2)

The TOC is generated automatically from your sections and updates live as you add, rename, or delete sections. You cannot edit it directly. Page numbers shown are estimates based on section count.

---

## Saving & Loading

**Save** downloads a `.json` file to your computer containing all document content.

**Load** opens a file picker. Select a `.json` file previously saved from this editor to replace the current document.

> Keep your `.json` files — they are your document. The editor has no server-side storage.
