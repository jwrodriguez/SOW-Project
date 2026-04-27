/**
 * SOW TEMPLATE EDITOR. Full WYSIWYG-style editor.
 *
 * Layout: sidebar section nav | ribbon toolbar | document canvas
 *
 * Key concepts:
 *   - SectionNode tree: recursive nested sections with numbering.
 *   - Blanks: {{field_id}} tokens in content, rendered as colored chips.
 *   - DnD: @dnd-kit for reordering sections in both nav and document.
 *   - Suspense wrapper at bottom, required by Next.js for useSearchParams().
 */
"use client";

import React, { Suspense, useMemo, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Save, Download, FileText, ChevronRight, ChevronDown, Lock, ChevronLeft, CheckCircle2, Circle, FileDown, Plane } from "lucide-react";
import type { TemplateData, SectionNode, TemplateField, HeaderFooterData } from "@/types/pageTypes";
import { getGlobalTemplate } from "@/lib/db-pullTemp";
import { set } from "better-auth";

// ─── Default blank template ───────────────────────────────────────────────────
// Used when no draft or template is passed via URL. Engineers should normally
// arrive here by loading a JSON file saved from the admin edit page.
//
// Two types of editable content exist in this template:
//
// 1. UNLOCKED SECTIONS (locked: false) - engineers click and type freely.
//    The text inside is just a hint showing what to write, not a real blank.
//
// 2. BLANKS in LOCKED SECTIONS - double curly {{field_id}} tokens match entries
//    in data.fields. These appear in both the document as inline inputs AND in
//    the questionnaire bar above. The admin creates these in the edit page using
//    the blank insertion form. Filling one in updates both places simultaneously.
//
// This default template has sample blanks already set up so the questionnaire
// bar is visible immediately. A real template saved from the admin editor replaces
// these with its own fields and tokens.
const DEFAULT_TEMPLATE: TemplateData = {
  documentName: "Untitled SOW",
  // Each entry here is a blank the admin inserted via the blank form in the edit page.
  // The id must exactly match the token embedded in the section content string below.
  fields: [
    { id: "field_product_name_001",       label: "Product Name",                    type: "text",      placeholder: "e.g. F-16 Avionics Suite",         required: true  },
    { id: "field_contractor_tasks_002",    label: "Contractor Tasks",                type: "sentence",  placeholder: "e.g. install, maintain, and test",  required: true  },
    { id: "field_contractor_service_003",  label: "Service Description",             type: "sentence",  placeholder: "e.g. provide 24/7 technical support",required: true  },
    { id: "field_items_purchased_004",     label: "Items to be Purchased",           type: "text",      placeholder: "e.g. hydraulic actuators",          required: true  },
    { id: "field_install_location_005",    label: "Installation Location",           type: "text",      placeholder: "e.g. Tinker AFB, Building 3001",    required: true  },
    { id: "field_use_purpose_006",         label: "Purpose of Use",                  type: "sentence",  placeholder: "e.g. F-16 maintenance operations",  required: false },
    { id: "field_delivery_location_007",   label: "Delivery Location",               type: "text",      placeholder: "e.g. Dock B, Building 3001",        required: false },
    { id: "field_applicable_stds_008",     label: "Applicable Standards",            type: "paragraph", placeholder: "List any additional standards...",  required: false },
    { id: "field_prohibited_mats_009",     label: "Prohibited Materials",            type: "paragraph", placeholder: "List any prohibited materials...",  required: false },
    { id: "field_written_submittals_010",  label: "Written Submittals",              type: "paragraph", placeholder: "Describe required documentation...",required: false },
    { id: "field_gfp_details_011",         label: "Government Furnished Property",   type: "paragraph", placeholder: "List any GFP items provided...",    required: false },
  ],
  coverPage: {
    title: "Statement of Work",
    projectNumber: "SOW-2026-001",
    clientName: "",
    building: "",
    location: "",
    preparedBy: "",
    department: "",
    date: new Date().toISOString().split("T")[0],
    version: "1.0",
    confidentiality: "Confidential",
  },
  headerFooter: {
    headerLeft: "Statement of Work",
    headerCenter: "",
    headerRight: "",
    footerLeft: "SOW-2026-001",
    footerCenter: "",
    footerRight: "Page {PAGE}",
    showPageNumbers: true,
    pageNumberPosition: "footer-right",
  },
  sections: [
    {
      id: "sec-1", number: "1.0", title: "Scope of Work", content: "", locked: true, tables: [],
      children: [
        // Unlocked - engineer edits freely. Blanks here are still filled via the questionnaire.
        {
          id: "sec-1-1", number: "1.1", title: "Scope", locked: false, tables: [], children: [],
          content: "The following establishes the minimum requirement for the purchase, delivery, and installation of {{field_product_name_001}}. The contractor should {{field_contractor_tasks_002}} and {{field_contractor_service_003}}.",
        },
        {
          id: "sec-1-2", number: "1.2", title: "Background", locked: false, tables: [], children: [],
          content: "The {{field_items_purchased_004}} are intended to be used at {{field_install_location_005}} for {{field_use_purpose_006}}. The items should be delivered to {{field_delivery_location_007}}.",
        },
      ],
    },
    {
      id: "sec-2", number: "2.0", title: "Applicable Standards", locked: true, tables: [],
      content: "Contractor, at a minimum, is required to comply with the current editions of the following requirements for design, construction, installation, and safety as applicable.",
      children: [
        { id: "sec-2-1", number: "2.1", title: "Government Standards",    content: "The following documents form a part of this purchase description to the extent stipulated herein.",  locked: true, tables: [], children: [] },
        { id: "sec-2-2", number: "2.2", title: "Non-Government Standards", content: "The following documents form a part of this document to the extent stipulated herein.",              locked: true, tables: [], children: [] },
        { id: "sec-2-3", number: "2.3", title: "Order of Precedence",      content: "In the event of a conflict between the text of this specification and the references cited herein, the text of this specification takes precedence.", locked: true, tables: [], children: [] },
        // Locked with blank - engineer fills via questionnaire bar or inline input
        { id: "sec-2-4", number: "2.4", title: "Applicable Standards",    content: "{{field_applicable_stds_008}}",   locked: true, tables: [], children: [] },
        { id: "sec-2-5", number: "2.5", title: "Prohibited Materials",    content: "{{field_prohibited_mats_009}}",    locked: true, tables: [], children: [] },
        { id: "sec-2-6", number: "2.6", title: "Environmental Protection", content: "Under the operating, service, transportation and storage conditions described herein the machine shall not emit materials hazardous to the ecological system as prohibited by federal, state or local statutes in effect at the point of installation.", locked: true, tables: [], children: [] },
      ],
    },
    // Locked with blanks - lock states now match the admin edit page defaults
    { id: "sec-3", number: "3.0", title: "Written Submittals",                       content: "{{field_written_submittals_010}}", locked: true, tables: [], children: [] },
    { id: "sec-4", number: "4.0", title: "Government Furnished Property and Services", content: "{{field_gfp_details_011}}",        locked: true, tables: [], children: [] },
  ],
};

import {
  Plus, Trash2, Download, Save, FileText, ChevronRight, ChevronDown,
  ListOrdered, Edit2, Table as TableIcon, Lock, Unlock, GripVertical,
  X, Check, PlusCircle, type LucideIcon,
} from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ============= TYPES =============
// You can find Type Declarations and Descriptions used in .../types/pageTypes.ts
import {FieldType, TemplateField, SectionNode, TableData, HeaderFooterData, TemplateData} from "@/types/pageTypes";

// Allowed field types listed here so both the insert form and edit form share the same options
const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" }, { value: "number", label: "Number" },
  { value: "word", label: "Word" }, { value: "sentence", label: "Sentence" },
  { value: "paragraph", label: "Paragraph" }, { value: "list", label: "List" },
  { value: "date", label: "Date" },
];

// ============= RIBBON BUTTON =============
// Reusable button for the editing ribbon toolbar.
// Supports disabled, active (highlighted), and danger (red) visual states.
function RibbonBtn({ icon: Icon, label, onClick, disabled, active, danger }: {
  icon: LucideIcon; label: string; onClick?: () => void; disabled?: boolean; active?: boolean; danger?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={label}
      className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded text-[10px] transition-colors
        ${disabled ? "opacity-30 cursor-not-allowed" : "hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"}
        ${active ? "bg-primary/10 text-primary" : ""}
        ${danger ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" : ""}`}>
      <Icon className="h-4 w-4" />
      <span className="leading-none">{label}</span>
    </button>
  );
}

// ─── Inline blank input ───────────────────────────────────────────────────────
// Renders a single blank field as an inline input inside section text.
// Engineers type directly into these - no colored chip, just a clean input.
function BlankInput({ field, value, onChange }: {
  field: TemplateField;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  if (disabled) return (
    <div className={`px-1 min-h-[1.2em] ${className}`}>
      {value || <span className="text-gray-400 italic text-sm font-normal">{placeholder}</span>}
    </div>
  );
  return editing ? (
    <input autoFocus type="text" value={value} onChange={e => onChange(e.target.value)}
      onBlur={() => setEditing(false)} onKeyDown={e => e.key === "Enter" && setEditing(false)}
      className={`bg-blue-50 border border-blue-300 rounded px-1 outline-none w-full ${className}`} />
  ) : (
    <div onClick={() => setEditing(true)}
      className={`cursor-text rounded px-1 hover:bg-blue-50/40 hover:outline hover:outline-1 hover:outline-blue-200 min-h-[1.2em] ${className}`}>
      {value || <span className="text-gray-400 italic text-sm font-normal">{placeholder}</span>}
    </div>
  );
}

/**
 * Multi-line click-to-edit field. Same disabled/enabled pattern as EditableText but uses a <textarea>. Row height auto-adjusts based on newline count in the content.
 * @param value The text content to display/edit
 * @param onChange Callback when text changes, recieves updated string value 
 * @param className Optional additional class names for styling
 * @param placeholder Placeholder text when value is empty
 * @param disabled Boolean value determining whether the section is locked or open for editing 
 *
 * @returns A JSX element that displays text and allows inline editing on click
 */

export function EditableArea({ value, onChange, className = "", placeholder = "Click to add content...", disabled }: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  if (disabled) return (
    <div className={`px-1 whitespace-pre-wrap min-h-[1.2em] ${className}`}>
      {value || <span className="text-gray-400 italic text-sm font-normal">{placeholder}</span>}
    </div>
  );
  return editing ? (
    <textarea autoFocus value={value} onChange={e => onChange(e.target.value)}
      onBlur={() => setEditing(false)} rows={Math.max(3, (value.match(/\n/g) || []).length + 2)}
      className={`bg-blue-50 border border-blue-300 rounded px-1 outline-none w-full resize-none ${className}`} />
  ) : (
    <div onClick={() => setEditing(true)}
      className={`cursor-text rounded px-1 hover:bg-blue-50/40 hover:outline hover:outline-1 hover:outline-blue-200 whitespace-pre-wrap min-h-[1.2em] ${className}`}>
      {value || <span className="text-gray-400 italic text-sm font-normal">{placeholder}</span>}
    </div>
  );
}
/**
 * Editable footer zone component — similar to EditableArea but supports {PAGE} token that renders the current page number. This helps users understand how to include page numbers in their footer.
 * @param value The text content to display/edit
 * @param onChange Callback when text changes, recieves updated string value
 * @param pageNumber page number input to replace {PAGE} token with in display mode
 * @param className Optional additional class names for styling
 * @param placeholder Placeholder text when value is empty
 * 
 * @returns A JSX element for editing footer text with support for dynamic page numbers via the {PAGE} token. Displays the resolved page number in display mode and shows the {PAGE} token in edit mode to clarify usage.
 */
export function EditableFooterZone({ value, onChange, pageNumber, className = "", placeholder = "Click to add footer content..." }: {
  value: string;
  onChange: (v: string) => void;
  pageNumber: number;
  className?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  return editing ? (
    <textarea autoFocus value={value} onChange={e => onChange(e.target.value)}
      onBlur={() => setEditing(false)} rows={Math.max(1, (value.match(/\n/g) || []).length + 1)}
      className={`bg-blue-50 border border-blue-300 rounded px-1 outline-none w-full resize-none text-sm ${className}`} />
  ) : (
    <div onClick={() => setEditing(true)}
      className={`cursor-text rounded px-1 hover:bg-blue-50/40 hover:outline hover:outline-1 hover:outline-blue-200 whitespace-pre-wrap min-h-[1.2em] text-sm ${className}`}>
      {value ? value.replace("{PAGE}", String(pageNumber))
        : <span className="text-gray-400 italic text-sm">{placeholder}</span>}
    </div>
  );
}

// ============= BLANK CHIP =============
// Renders a fillable blank as a colored inline pill inside section content.
// Color is driven by the data-type attribute and CSS in globals.css (.blank-chip styles).
// Clicking opens the blank's property editor in the ribbon. X removes it.
function BlankChip({ field, onClick, onDelete }: {
  field: TemplateField; onClick: () => void; onDelete: () => void;
}) {
  return (
    <span className="blank-chip" data-type={field.type} onClick={onClick}>
      <span>{field.label}</span>
      <span className="opacity-60 text-[10px]">({field.type})</span>
      <button onClick={e => { e.stopPropagation(); onDelete(); }}
        className="ml-0.5 opacity-40 hover:opacity-100 transition-opacity" title="Remove blank">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// ============= CONTENT RENDERER (parses {{field_id}} blanks) =============
// Parses the section content string for {{field_id}} tokens and renders them as BlankChips.
// Plain text between tokens renders as normal spans.
// When unlocked: click-to-edit textarea. When locked: static text with interactive blank chips.
function SectionContent({ content, fields, locked, onClickBlank, onDeleteBlank, onChange }: {
  content: string; fields: TemplateField[]; locked: boolean;
  onClickBlank: (fieldId: string) => void; onDeleteBlank: (fieldId: string) => void;
  onChange: (v: string) => void;
}) {
  const fieldMap = useMemo(() => new Map(fields.map(f => [f.id, f])), [fields]);

  // Parse content into segments: text and {{field_id}} tokens
  const segments = useMemo(() => {
    const parts: Array<{ type: "text"; value: string } | { type: "blank"; fieldId: string }> = [];
    const regex = /\{\{([^}]+)\}\}/g;
    let last = 0;
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match.index > last) parts.push({ type: "text", value: content.slice(last, match.index) });
      parts.push({ type: "blank", fieldId: match[1] });
      last = match.index + match[0].length;
    }
    if (last < content.length) parts.push({ type: "text", value: content.slice(last) });
    if (parts.length === 0) parts.push({ type: "text", value: "" });
    return parts;
  }, [content]);

  const [editing, setEditing] = useState(false);

  // If unlocked, show raw editable content
  if (!locked) {
    return editing ? (
      <textarea autoFocus value={content} onChange={e => onChange(e.target.value)}
        onBlur={() => setEditing(false)} rows={Math.max(3, (content.match(/\n/g) || []).length + 2)}
        className="bg-blue-50 border border-blue-300 rounded px-1 outline-none w-full resize-none text-sm leading-relaxed" />
    ) : (
      <div onClick={() => setEditing(true)}
        className="cursor-text rounded px-1 hover:bg-blue-50/40 hover:outline hover:outline-1 hover:outline-blue-200 whitespace-pre-wrap min-h-[1.2em] text-sm leading-relaxed">
        {segments.map((seg, i) => {
          if (seg.type === "text") return <span key={i}>{seg.value}</span>;
          const field = fieldMap.get(seg.fieldId);
          if (!field) return <span key={i} className="text-red-400">{`{{${seg.fieldId}}}`}</span>;
          return <BlankChip key={i} field={field} onClick={() => onClickBlank(field.id)} onDelete={() => onDeleteBlank(field.id)} />;
        })}
        {!content && <span className="text-gray-400 italic text-sm font-normal">Click to add content...</span>}
      </div>
    );
  }

  // Locked: render static text with blank chips
  return (
    <div className="whitespace-pre-wrap min-h-[1.2em] text-sm leading-relaxed px-1">
      {segments.map((seg, i) => {
        if (seg.type === "text") return <span key={i}>{seg.value}</span>;
        const field = fieldMap.get(seg.fieldId);
        if (!field) return <span key={i} className="text-red-400">{`{{${seg.fieldId}}}`}</span>;
        return <BlankChip key={i} field={field} onClick={() => onClickBlank(field.id)} onDelete={() => onDeleteBlank(field.id)} />;
      })}
      {!content && <span className="text-gray-400 italic text-sm font-normal">No content — insert blanks or unlock to edit.</span>}
    </div>
  );
}

  // Locked sections show static text with fillable blank inputs - no text editing
  if (locked) {
    return <div className="px-1">{renderedContent}</div>;
  }

  // Unlocked sections are click-to-edit. While editing, show raw textarea.
  // Blank chips are not shown in edit mode - engineer edits raw content string.
  // When they click away, the rendered view with blanks comes back.
  return editing ? (
    <textarea
      autoFocus
      value={content}
      onChange={e => onChangeContent(e.target.value)}
      onBlur={() => setEditing(false)}
      rows={Math.max(3, (content.match(/\n/g) || []).length + 2)}
      placeholder="Click to add content..."
      className="w-full bg-blue-50 border border-blue-300 rounded px-2 py-1 outline-none resize-none text-sm leading-relaxed"
    />
  ) : (
    <div
      onClick={() => setEditing(true)}
      className="cursor-text rounded px-1 hover:bg-blue-50/40 hover:outline hover:outline-1 hover:outline-blue-200 min-h-[1.5em]"
    >
      {content ? renderedContent : (
        <span className="text-gray-400 italic text-sm">Click to add content...</span>
      )}
    </div>
  );
}

// ============= SORTABLE SECTION BLOCK =============
// Renders one section on the document page with drag-and-drop reordering via @dnd-kit.
// useSortable provides the ref, drag listeners, and transform/transition for the drag animation.
// isSelected adds a highlight ring. locked controls whether content is editable.
// Hover toolbar exposes lock/unlock, add sub, add sibling, add table, and delete.
/**
 * @param section Section segment to be rendered into the document
 * @param depth Numerical value indicating placement of section in the document
 * @param isOnlyTop Boolean value indicating whether a section block resides at the topmost layer of the document
 * @param onUpdate Convert content of section to be editable
 * @param onAddChild Add a subsection to the section block in the document
 * @param onAddSibling Add a section block of the same depth to the document
 * @param onDelete Deletion function removing the section block from the document
 * @param onAddTable Setter function adding a table object to section of the document. This is done with a (row, column) input
 * @param onDeleteTable Deletion function removing a table object from section of the document
 * @param onUpdateCell Setter function updating a cell value of a given table for a section block in the document
 * @param children Existing subsections and subtables of a particular section block in the document are fed into this parameter 
 * @returns A JSX Section Block Component
 */
export function SortableSectionBlock({ section, depth, isOnlyTop, isSelected, fields,
  onSelect, onUpdate, onAddChild, onAddSibling, onDelete,
  onAddTable, onDeleteTable, onUpdateCell, onClickBlank, onDeleteBlank, children }: {
  section: SectionNode; depth: number; isOnlyTop: boolean; isSelected: boolean;
  fields: TemplateField[];
  onSelect: () => void;
  onUpdate: (u: Partial<SectionNode>) => void;
  onAddChild: () => void; onAddSibling: () => void; onDelete: () => void;
  onAddTable: (r: number, c: number) => void;
  onDeleteTable: (id: string) => void;
  onUpdateCell: (tid: string, r: number, c: number, v: string) => void;
  onClickBlank: (fieldId: string) => void; onDeleteBlank: (fieldId: string) => void;
  children?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const [hovered, setHovered] = useState(false);
  const [showTableForm, setShowTableForm] = useState(false);
  const [tr, setTr] = useState(3);
  const [tc, setTc] = useState(3);
  // Heading size scales with depth: 0 = H1, 1 = H2, 2+ = H3
  const headingClass = depth === 0 ? "text-2xl font-bold" : depth === 1 ? "text-xl font-semibold" : "text-lg font-medium";

  const locked = section.lockEdit || section.lockDelete || section.lockAddTable || section.lockAddSections;

  return (
    <div id={section.id} style={{ marginLeft: `${indent}px`, marginBottom: depth === 0 ? "2rem" : "1.25rem" }}>
      {/* Section heading - read-only for engineers, lock icon shown when locked */}
      <div className="flex items-baseline gap-2 mb-1">
        {section.locked && <Lock className="h-3 w-3 text-slate-400 shrink-0 mt-1" />}
        <span className="font-mono text-gray-400 shrink-0 text-sm select-none">{section.number}</span>
        <EditableText value={section.title} onChange={v => onUpdate({ title: v })} className={headingClass} placeholder="Section title..." disabled={section.lockEdit} />
      </div>

      {/* Section body — uses SectionContent for blank rendering */}
      <div className="ml-8" style={{ marginLeft: `${depth * 16 + 32}px` }}>
        <SectionContent content={section.content} fields={fields} locked={section.lockEdit}
          onClickBlank={onClickBlank} onDeleteBlank={onDeleteBlank}
          onChange={v => onUpdate({ content: v })} />
      </div>

      {/* Tables - read-only for engineers */}
      {section.tables && section.tables.length > 0 && (
        <div className="mt-3 space-y-4" style={{ marginLeft: `${depth * 16 + 32}px` }}>
          {section.tables.map(table => (
            <table key={table.id} className="border-collapse text-xs w-full">
              <tbody>
                {table.data.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="border border-gray-300 p-1.5 text-sm">
                        {cell || <span className="text-gray-300">-</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
      )}

      {/* Recursively rendered children */}
      {children}
    </div>
  );
}

// ─── Document page wrapper ────────────────────────────────────────────────────
// Renders an 8.5x11in white page with static header and footer.
// Engineers cannot edit the header or footer - those are admin-controlled.
function DocumentPage({ hf, pageNumber, children }: {
  hf: HeaderFooterData;
  pageNumber: number;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const hasChildren = section.children.length > 0;

  return (
    <div className="bg-white shadow-lg mx-auto text-black" style={{ width: "8.5in", minHeight: "11in", display: "flex", flexDirection: "column" }}>
      {/* Header - static, not editable by engineers */}
      <div style={{ padding: "0.5in 1in 0.1in 1in" }}>
        <div className="grid grid-cols-3 gap-1 text-sm text-gray-700">
          <div className="whitespace-pre-wrap">{hf.headerLeft}</div>
          <div className="whitespace-pre-wrap text-center">{hf.headerCenter}</div>
          <div className="whitespace-pre-wrap text-right">{hf.headerRight}</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "0.1in 1in", flex: 1 }}>{children}</div>

      {/* Footer - static, {PAGE} resolved */}
      <div style={{ padding: "0.1in 1in 0.5in 1in" }}>
        <div className="grid grid-cols-3 gap-1 text-sm text-gray-700">
          <div className="whitespace-pre-wrap">{resolve(hf.footerLeft)}</div>
          <div className="whitespace-pre-wrap text-center">{resolve(hf.footerCenter)}</div>
          <div className="whitespace-pre-wrap text-right">{resolve(hf.footerRight)}</div>
        </div>
      </div>
    </div>
  );
}

// ============= PURE SECTION HELPERS =============
// These functions take a section tree in and return a new tree out — no state mutations.
// Called inside setData() so they always operate on the latest state snapshot.
 
// Assigns correct auto-numbers to the entire tree. Top-level = "1.0", children = "1.1", "1.1.1" etc.
function renumberSections(sections: SectionNode[], prefix = ""): SectionNode[] {
  return sections.map((s, i) => {
    const number = prefix ? `${prefix}.${i + 1}` : `${i + 1}.0`;
    return { ...s, number, children: renumberSections(s.children, number.replace(/\.0$/, "")) };
  });
}

// Searches the tree for a section by ID — used before updates that need current field values
function findSection(sections: SectionNode[], id: string): SectionNode | null {
  for (const s of sections) { if (s.id === id) return s; const found = findSection(s.children, id); if (found) return found; }
  return null;
}

// Returns a new tree with one section's fields merged with the updates object
function updateSection(sections: SectionNode[], id: string, updates: Partial<SectionNode>): SectionNode[] {
  return sections.map(s => s.id === id ? { ...s, ...updates } : { ...s, children: updateSection(s.children, id, updates) });
}

// ─── Questionnaire helpers ────────────────────────────────────────────────────

// Represents one question in the questionnaire bar - a blank field with
// the section context it belongs to so the bar can show where it lives.
type QuestionItem = {
  field: TemplateField;
  sectionId: string;
  sectionNumber: string;
  sectionTitle: string;
};

// Walks the section tree in document order and builds a flat ordered list
// of questions by finding every {{field_id}} token in section content strings.
// Fields that appear multiple times are deduplicated - first occurrence wins.
// This preserves the reading order of the document which is the natural
// questionnaire order for the engineer.
function buildQuestionList(sections: SectionNode[], fields: TemplateField[]): QuestionItem[] {
  const fieldMap = new Map(fields.map(f => [f.id, f]));
  const seen = new Set<string>();
  const questions: QuestionItem[] = [];
  const regex = /\{\{([^}]+)\}\}/g;

  function walk(nodes: SectionNode[]) {
    for (const section of nodes) {
      // Reset regex lastIndex for each content string
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(section.content)) !== null) {
        const fieldId = match[1];
        if (!seen.has(fieldId) && fieldMap.has(fieldId)) {
          seen.add(fieldId);
          questions.push({
            field: fieldMap.get(fieldId)!,
            sectionId: section.id,
            sectionNumber: section.number,
            sectionTitle: section.title,
          });
        }
      }
      if (section.children.length > 0) walk(section.children);
    }
  }

  walk(sections);
  return questions;
}

// ─── Questionnaire bar ────────────────────────────────────────────────────────
// Sticky panel below the main header. Shows one question at a time with
// prev/next navigation and a dropdown to jump to any question.
// Dot indicators show answered/skipped/current status for every question at a glance.
// The input here calls onChangeField - same handler as the inline BlankInputs -
// so the document preview updates live as the engineer types.
function QuestionnaireBar({ questions, activeIndex, fieldValues, onChangeField, onChangeIndex }: {
  questions: QuestionItem[];
  activeIndex: number;
  fieldValues: Record<string, string>;
  onChangeField: (fieldId: string, value: string) => void;
  onChangeIndex: (index: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Focus the input whenever the active question changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeIndex]);

  if (questions.length === 0) return null;

  const current = questions[activeIndex];
  const value = fieldValues[current.field.id] ?? current.field.defaultValue ?? "";

  // Compute answered/skipped status for every question for the dot tracker
  const statuses = questions.map((q, i) => {
    const v = (fieldValues[q.field.id] ?? q.field.defaultValue ?? "").trim();
    if (i === activeIndex) return "active";
    if (v !== "") return "answered";
    return "skipped";
  });

  const filledCount = statuses.filter(s => s === "answered").length;
  const skippedCount = statuses.filter(s => s === "skipped" || (s === "active" && value.trim() === "")).length;
  const allDone = filledCount === questions.length || (filledCount === questions.length - 1 && value.trim() !== "");
  const isFilled = value.trim() !== "";

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && activeIndex < questions.length - 1) {
      e.preventDefault();
      onChangeIndex(activeIndex + 1);
    }
  }

  // Finds the next unanswered question after the current index for the Skip button
  function findNextSkipped(): number | null {
    for (let i = activeIndex + 1; i < questions.length; i++) {
      const v = (fieldValues[questions[i].field.id] ?? questions[i].field.defaultValue ?? "").trim();
      if (v === "") return i;
    }
    // Wrap around and check before current index
    for (let i = 0; i < activeIndex; i++) {
      const v = (fieldValues[questions[i].field.id] ?? questions[i].field.defaultValue ?? "").trim();
      if (v === "") return i;
    }
    return null;
  }

  const nextSkipped = findNextSkipped();

  return (
    <div className="shrink-0 border-b bg-background shadow-sm px-5 py-4 z-20 space-y-3">

      {/* Row 1 - question number, section badge, title, progress summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Dropdown to jump to any question - grouped by section */}
          <select
            value={activeIndex}
            onChange={e => onChangeIndex(Number(e.target.value))}
            className="text-xs border border-input rounded px-2 py-1 bg-background outline-none focus:border-primary cursor-pointer font-medium"
          >
            {(() => {
              // Group questions by section title for optgroup labels
              const groups: { sectionNumber: string; sectionTitle: string; items: { q: QuestionItem; i: number }[] }[] = [];
              questions.forEach((q, i) => {
                const last = groups[groups.length - 1];
                if (last && last.sectionTitle === q.sectionTitle) {
                  last.items.push({ q, i });
                } else {
                  groups.push({ sectionNumber: q.sectionNumber, sectionTitle: q.sectionTitle, items: [{ q, i }] });
                }
              });
              return groups.map(group => (
                <optgroup key={group.sectionTitle} label={`${group.sectionNumber} ${group.sectionTitle}`}>
                  {group.items.map(({ q, i }) => {
                    const v = (fieldValues[q.field.id] ?? q.field.defaultValue ?? "").trim();
                    return (
                      <option key={q.field.id} value={i}>
                        {v !== "" ? "✓" : "○"} {q.field.label}
                      </option>
                    );
                  })}
                </optgroup>
              ));
            })()}
          </select>

          {/* Section context */}
          <span className="text-xs bg-primary/10 text-primary font-mono px-2 py-0.5 rounded-full font-medium">
            {current.sectionNumber}
          </span>
          <span className="text-xs text-muted-foreground truncate max-w-[240px]">
            {current.sectionTitle}
          </span>
        </div>

        {/* Progress summary - single consolidated indicator */}
        <div className="flex items-center gap-2">
          {allDone ? (
            <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> All {questions.length} answered
            </span>
          ) : (
            <span className="text-xs font-medium flex items-center gap-1.5">
              <span className="text-green-600">{filledCount + (isFilled ? 1 : 0)} answered</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-amber-600">{skippedCount - (isFilled ? 1 : 0) < 0 ? 0 : skippedCount - (isFilled ? 1 : 0)} unanswered</span>
            </span>
          )}
        </div>
      </div>

      {/* Row 2 - dot tracker showing status of every question */}
      <div className="flex items-center gap-1 flex-wrap">
        {statuses.map((status, i) => (
          <button
            key={questions[i].field.id}
            onClick={() => onChangeIndex(i)}
            title={`Q${i + 1}: ${questions[i].field.label} - ${status === "answered" ? "answered" : status === "active" ? "current" : "unanswered"}`}
            className={`h-2.5 rounded-full transition-all ${
              status === "active"
                ? "w-6 bg-primary"
                : status === "answered"
                  ? "w-2.5 bg-green-500 hover:bg-green-400"
                  : "w-2.5 bg-amber-300 hover:bg-amber-400 dark:bg-amber-600"
            }`}
          />
        ))}
      </div>

      {/* Row 3 - label, input, navigation */}
      <div className="flex items-center gap-3">
        {/* Prev button */}
        <Button
          size="sm"
          variant="outline"
          className="h-9 px-3 shrink-0"
          disabled={activeIndex === 0}
          onClick={() => onChangeIndex(activeIndex - 1)}
          title="Previous question"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Question label + input */}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <label className="text-sm font-semibold shrink-0 flex items-center gap-1 min-w-fit">
            {current.field.required && (
              <span className="text-destructive text-xs" title="Required">*</span>
            )}
            {current.field.label}
          </label>

          {current.field.type === "paragraph" ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={value}
              onChange={e => onChangeField(current.field.id, e.target.value)}
              placeholder={current.field.placeholder || `Enter ${current.field.label.toLowerCase()}...`}
              rows={2}
              className="flex-1 border border-input rounded-md px-3 py-2 text-sm bg-background outline-none focus:border-primary resize-none"
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type={current.field.type === "number" ? "number" : current.field.type === "date" ? "date" : "text"}
              value={value}
              onChange={e => onChangeField(current.field.id, e.target.value)}
              onKeyDown={handleKey}
              placeholder={current.field.placeholder || `Enter ${current.field.label.toLowerCase()}...`}
              className="flex-1 h-9 border border-input rounded-md px-3 text-sm bg-background outline-none focus:border-primary"
            />
          )}

          {/* Answered checkmark */}
          {isFilled && (
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          )}
        </div>

        {/* Jump to next skipped button - only shows when there are unanswered questions */}
        {nextSkipped !== null && (
          <Button
            size="sm"
            variant="ghost"
            className="h-9 px-3 text-xs shrink-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            onClick={() => onChangeIndex(nextSkipped)}
            title="Jump to next unanswered question"
          >
            Next unanswered
          </Button>
        )}

        {/* Next button */}
        <Button
          size="sm"
          variant={activeIndex < questions.length - 1 ? "outline" : "default"}
          className="h-9 px-4 shrink-0"
          disabled={activeIndex === questions.length - 1}
          onClick={() => onChangeIndex(activeIndex + 1)}
        >
          {activeIndex < questions.length - 1 ? (
            <><span className="text-xs mr-1">Next</span><ChevronRight className="h-4 w-4" /></>
          ) : (
            <span className="text-xs">Done</span>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Main inner component ─────────────────────────────────────────────────────
function SowEngineerPageInner() {
  const searchParams = useSearchParams();

  // Load template from ?draft= URL param (base64 encoded TemplateData).
  // Falls back to default blank template. When DB is live this should
  // load from a template ID in the URL instead.
  const initialData: TemplateData = useMemo(() => {
    return DEFAULT_TEMPLATE;
    
  }, []);

  // Template structure - engineers cannot change this, only their content edits and field values
  const [data, setData] = useState<TemplateData>(initialData);// Navigator expand/collapse state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(initialData.sections.map(s => s.id))
  );


  
  useEffect(() => {
    const draftParam = searchParams.get("draft");

    async function syncWithDb() {
      try {
        const dbData = await getGlobalTemplate();
        
        // Only update if we actually got a valid object back
        if (dbData) {
          setData(dbData as TemplateData);

          if (draftParam) {
            const parsedData = JSON.parse(atob(draftParam));
            setData((prevData) => ({
            ...prevData, // Copy all existing data
            documentName: parsedData.documentName, // Override name
            coverPage: { 
              ...prevData.coverPage, // Keep other cover page fields (title, date, version, confidentiality)
              clientName: parsedData.clientName,
              building: parsedData.building,
              location: parsedData.location,
              preparedBy: parsedData.preparedBy,
              department: parsedData.department,
            },
          }));}
          
          // Sync UI states that depend on the data structure
          setExpandedIds(new Set((dbData as TemplateData).sections.map(s => s.id)));
          // setEditedName((dbData as TemplateData).documentName);
        }
      } catch (error) {
        // If DB fails, we do nothing; 'data' remains 'defaultData'
        console.error("Database fetch failed, continuing with defaults:", error);
      }
    }

    syncWithDb();
  }, [searchParams]); // Run once on mount


  // useEffect(() => {
  // const draftParam = searchParams.get("draft");
  // if (draftParam) {
  //   try {
  //     // Decode and parse the base64 JSON
  //     const parsedData = JSON.parse(atob(draftParam));
  //     console.log("Loaded draft data from URL:", parsedData);
  //     if (parsedData) {
  //       setData((prevData) => ({
  //         ...prevData, // Copy all existing data
  //         documentName: parsedData.documentName, // Override name
  //         coverPage: { 
  //           ...prevData.coverPage, // Keep other cover page fields (title, date, version, confidentiality)
  //           clientName: parsedData.clientName,
  //           building: parsedData.building,
  //           location: parsedData.location,
  //           preparedBy: parsedData.preparedBy,
  //           department: parsedData.department,
  //         },
  //       }));
  //       }
  //     } catch (e) {
  //       console.error("Failed to parse draft param:", e);
  //     }
  //   }
  // }, [searchParams]); // Correctly triggers when URL changes

  // Field values - maps field ID to the string the engineer typed in.
  // Stored separately from the template so we can merge on save.
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    initialData.fields.forEach(f => { if (f.defaultValue) initial[f.id] = f.defaultValue; });
    return initial;
  });

  

  // Active question index for the questionnaire bar.
  // When the engineer moves to a new question the document scrolls to that section.
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Ordered list of questions derived from the section tree and fields array.
  // Recomputed whenever data changes (e.g. after loading a new draft).
  const questions = useMemo(() => buildQuestionList(data.sections, data.fields), [data.sections, data.fields]);

  // Scrolls to the section containing the active question so the engineer
  // can see where the blank lives in the document while answering in the bar.
  function handleChangeQuestionIndex(index: number) {
    setActiveQuestionIndex(index);
    const question = questions[index];
    if (question) {
      document.getElementById(question.sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const selectedSection = selectedSectionId ? findSection(data.sections, selectedSectionId) : null;

  // DnD sensors - PointerSensor requires 5px movement before activating to avoid accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // Shorthand updaters for cover page and header/footer fields
  const updateCover = (k: keyof typeof data.coverPage, v: string) =>
    setData(p => ({ ...p, coverPage: { ...p.coverPage, [k]: v } }));
  const updateHF = (k: keyof HeaderFooterData, v: string) =>
    setData(p => ({ ...p, headerFooter: { ...p.headerFooter, [k]: v } }));
  function toggleExpand(id: string) {
    setExpandedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  // Saves a draft by merging field values back into the template fields
  // and downloading the result as a JSON file the engineer can reload later.
  // This is a temporary testing tool - will be removed once export to Word is the primary output.
  function handleSave() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.documentName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
  }

  // Exports the completed SOW as a Word document via the FastAPI docx service.
  // Merges fieldValues into fields[].defaultValue before sending so the Python
  // service receives a complete document with all engineer answers baked in.
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const merged: TemplateData = {
        ...data,
        fields: data.fields.map(f => ({
          ...f,
          defaultValue: fieldValues[f.id] ?? f.defaultValue,
        })),
      };

      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      });

      if (!response.ok) {
        const err = await response.json();
        alert(`Export failed: ${err.error ?? "Unknown error"}`);
        return;
      }

      // Trigger browser download of the returned .docx file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.documentName.replace(/\s+/g, "-").toLowerCase()}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Export failed - make sure the document service is running.");
    } finally {
      setExporting(false);
    }
  }

  // Loads a previously saved draft JSON file
  function handleLoad() {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const loaded = JSON.parse(ev.target?.result as string);
          setData(loaded); setEditedName(loaded.documentName || "Untitled Document");
          setExpandedIds(new Set(loaded.sections.map((s: SectionNode) => s.id)));
        } catch { alert("Invalid JSON file"); }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // handleExport is a placeholder — planned: Next.js API → sanitize → Flask → python-docx → .docx download
  function handleExport() {
    alert("Export to Word will generate a .docx file. Backend integration coming soon!");
  }

  // ── Insert Blank ──
  // Creates a new TemplateField, appends its {{fieldId}} token to the selected section's content,
  // and adds the field to data.fields so SectionContent can render it as a BlankChip
  function handleInsertBlank() {
    if (!blankLabel.trim() || !selectedSectionId) return;
    const fieldId = `field_${blankLabel.trim().toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`;
    const newField: TemplateField = {
      id: fieldId, label: blankLabel.trim(), type: blankType,
      placeholder: blankPlaceholder || undefined, required: blankRequired,
    };
    setData(p => {
      const sec = findSection(p.sections, selectedSectionId);
      const newContent = sec ? (sec.content ? sec.content + ` {{${fieldId}}}` : `{{${fieldId}}}`) : "";
      return {
        ...p,
        fields: [...p.fields, newField],
        sections: updateSection(p.sections, selectedSectionId, { content: newContent }),
      };
    });
    setBlankLabel(""); setBlankPlaceholder(""); setBlankRequired(false);
    setShowBlankForm(false);
  }

  // ── Delete Blank (from data.fields + all section content) ──
  // Removes the field from data.fields and strips its {{token}} from every section content string
  function handleDeleteBlank(fieldId: string) {
    setData(p => ({
      ...p,
      fields: p.fields.filter(f => f.id !== fieldId),
      sections: removeBlankFromContent(p.sections, fieldId),
    }));
    if (editingFieldId === fieldId) setEditingFieldId(null);
  }

  // ── Update Blank Field ──
  // Updates label, type, placeholder, or required on an existing TemplateField
  function handleUpdateField(fieldId: string, updates: Partial<TemplateField>) {
    setData(p => ({ ...p, fields: p.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f) }));
  }

  // ── DnD handler ──
  // Called when a drag ends — uses reorderSectionsByIds to move the dragged section
  // to the dropped position, then renumbers the entire tree
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setData(p => ({
      ...p,
      sections: renumberSections(reorderSectionsByIds(p.sections, String(active.id), String(over.id))),
    }));
  }

  // ── Section rendering ──
  // Recursively renders the section tree as SortableSectionBlock components.
  // All mutation callbacks defined here so they can close over setData from this component.
  function renderSections(sections: SectionNode[], depth = 0): React.ReactNode {
    return (
      <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
        {sections.map(section => {
          const onUpdate = (u: Partial<SectionNode>) => setData(p => ({ ...p, sections: updateSection(p.sections, section.id, u) }));
          const onAddChild = () => {
            setData(p => ({ ...p, sections: renumberSections(addChildSection(p.sections, section.id)) }));
            setExpandedIds(p => new Set([...p, section.id]));
          };
          const onAddSibling = () => setData(p => {
            const r = addSiblingHelper(p.sections, section.id);
            return r.added ? { ...p, sections: renumberSections(r.sections) } : p;
          });
          const onDelete = () => {
            if (!confirm("Delete this section and all its subsections?")) return;
            setData(p => ({ ...p, sections: renumberSections(deleteSection(p.sections, section.id)) }));
            if (selectedSectionId === section.id) setSelectedSectionId(null);
          };
          const onAddTable = (rows: number, cols: number) => {
            if (rows < 1 || rows > 20 || cols < 1 || cols > 10) { alert("Rows: 1-20, Columns: 1-10"); return; }
            const newTable: TableData = { id: `t-${Date.now()}`, rows, cols, data: Array(rows).fill(null).map(() => Array(cols).fill("")) };
            setData(p => {
              const sec = findSection(p.sections, section.id);
              return { ...p, sections: updateSection(p.sections, section.id, { tables: [...(sec?.tables || []), newTable] }) };
            });
          };
          const onDeleteTable = (tid: string) => setData(p => {
            const sec = findSection(p.sections, section.id);
            return { ...p, sections: updateSection(p.sections, section.id, { tables: sec?.tables?.filter(t => t.id !== tid) }) };
          });
          // Updates a single cell — maps over rows and cells, replacing only the one that changed
          const onUpdateCell = (tid: string, row: number, col: number, val: string) => setData(p => {
            const sec = findSection(p.sections, section.id);
            const tables = sec?.tables?.map(t => t.id === tid
              ? { ...t, data: t.data.map((r, ri) => r.map((c, ci) => ri === row && ci === col ? val : c)) } : t);
            return { ...p, sections: updateSection(p.sections, section.id, { tables }) };
          });

          return (
            <SortableSectionBlock key={section.id} section={section} depth={depth}
              isOnlyTop={depth === 0 && data.sections.length === 1}
              isSelected={selectedSectionId === section.id}
              fields={data.fields}
              onSelect={() => setSelectedSectionId(section.id)}
              onUpdate={onUpdate} onAddChild={onAddChild} onAddSibling={onAddSibling}
              onDelete={onDelete}
              onAddTable={onAddTable} onDeleteTable={onDeleteTable} onUpdateCell={onUpdateCell}
              onClickBlank={id => setEditingFieldId(id)} onDeleteBlank={handleDeleteBlank}>
              {section.children.length > 0 && renderSections(section.children, depth + 1)}
            </SortableSectionBlock>
          );
        })}
      </SortableContext>
    );
  }

  // Renders the left navigator panel - click to scroll, expand/collapse
  function renderNav(sections: SectionNode[], depth = 0): React.ReactNode {
    return (
      <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
        {sections.map(section => {
          const hasChildren = section.children.length > 0;
          const isExpanded = expandedIds.has(section.id);
          return (
            <div key={section.id}>
              <SortableNavItem section={section} depth={depth} isExpanded={isExpanded}
                onToggleExpand={() => toggleExpand(section.id)}
                onSelect={() => { setSelectedSectionId(section.id); document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                isSelected={selectedSectionId === section.id} />
              {hasChildren && isExpanded && renderNav(section.children, depth + 1)}
            </div>
          );
        })}
      </SortableContext>
    );
  }

  const tocData = generateTOCEntries(data.sections);
  const editingField = editingFieldId ? data.fields.find(f => f.id === editingFieldId) : null;

  // ============= RENDER =============
  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4 bg-background sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg shrink-0">
              <Plane className="size-4" />
            </div>
            <div className="flex flex-col text-left leading-tight">
              <span className="text-sm font-semibold uppercase tracking-tighter">SoWizard</span>
              <span className="text-[10px] text-muted-foreground uppercase font-mono">Tinker AFB</span>
            </div>
          </a>
          {/* Separator */}
          <div className="h-6 w-px bg-border shrink-0" />
          {/* Document name */}
          <div className="flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-semibold">{data.documentName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleLoad}>
            <Download className="h-4 w-4 mr-1" /> Load Draft
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" /> Save Draft
          </Button>
          <Button size="sm" onClick={handleExport} disabled={exporting}>
            <FileDown className="h-4 w-4 mr-1" />
            {exporting ? "Exporting..." : "Export Word"}
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: section navigator */}
        <div className="w-60 border-r shrink-0 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b flex items-center gap-2 shrink-0 bg-background">
            <span className="text-sm font-semibold">Sections</span>
          </div>
          <div className="p-2 space-y-0.5 overflow-y-auto flex-1">
            {data.sections.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-2">No sections loaded.</p>
            ) : (
              renderNav(data.sections)
            )}
          </div>
        </div>

        {/* Right: questionnaire bar + document pages */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Questionnaire bar */}
          {questions.length > 0 && (
            <QuestionnaireBar
              questions={questions}
              activeIndex={activeQuestionIndex}
              fieldValues={fieldValues}
              onChangeField={handleChangeField}
              onChangeIndex={handleChangeQuestionIndex}
            />
          )}

          {/* Document pages */}
          <div className="flex-1 overflow-y-auto bg-gray-200 p-8">
            <div className="space-y-8">

              {/* Cover page */}
              <div className="bg-white shadow-lg mx-auto relative text-black" style={{ width: "8.5in", height: "11in" }}>
                <div className="absolute inset-8 border-4 border-black pointer-events-none" />
                <div className="absolute inset-8 flex items-center justify-center">
                  <div className="text-center w-full px-12">
                    <p className="text-4xl font-bold">{data.coverPage.title}</p>
                    <p className="text-3xl font-semibold mt-6">FOR</p>
                    <p className="text-4xl font-bold mt-4">{data.coverPage.clientName || "-"}</p>
                    <div className="flex items-baseline justify-center gap-2 mt-4">
                      <span className="text-3xl font-semibold">BUILDING</span>
                      <span className="text-3xl font-semibold">{data.coverPage.building || "-"}</span>
                    </div>
                    <div className="mt-16 space-y-3">
                      <p className="text-xl">{data.coverPage.location || "-"}</p>
                      <p className="text-lg font-semibold mt-4">Prepared by</p>
                      <p className="text-xl">{data.coverPage.preparedBy || "-"}</p>
                      <p className="text-xl">{data.coverPage.department || "-"}</p>
                      <p className="text-xl mt-2">{data.coverPage.date}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Label</label>
                    <Input value={editingField.label} onChange={e => handleUpdateField(editingField.id, { label: e.target.value })} className="h-8 w-32 text-sm" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Type</label>
                    <select value={editingField.type} onChange={e => handleUpdateField(editingField.id, { type: e.target.value as FieldType })}
                      className="h-8 rounded border border-input bg-background px-2 text-sm">
                      {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Placeholder</label>
                    <Input value={editingField.placeholder || ""} onChange={e => handleUpdateField(editingField.id, { placeholder: e.target.value })} className="h-8 w-32 text-sm" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Default</label>
                    <Input value={editingField.defaultValue || ""} onChange={e => handleUpdateField(editingField.id, { defaultValue: e.target.value })} className="h-8 w-32 text-sm" />
                  </div>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={editingField.required ?? false} onChange={e => handleUpdateField(editingField.id, { required: e.target.checked })} className="rounded" />
                    Required
                  </label>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingFieldId(null)}>
                    <X className="h-3 w-3" /> Close
                  </Button>
                </div>
              )}

              {/* ── Document pages ── */}
              <div className="flex-1 overflow-y-auto bg-gray-200 p-8" onClick={() => setSelectedSectionId(null)}>
                <div className="space-y-8">
                  {/* Cover Page — all fields are EditableText components connected to coverPage state */}
                  <div className="bg-white shadow-lg mx-auto relative text-black" style={{ width: "8.5in", height: "11in" }}>
                    <div className="absolute inset-8 border-4 border-black pointer-events-none" />
                    <div className="absolute inset-8 flex items-center justify-center">
                      <div className="text-center w-full px-12">
                        <EditableText value={data.coverPage.title} onChange={v => updateCover("title", v)} className="text-4xl font-bold" placeholder="SOW Title" />

                        <p className="text-3xl font-semibold mt-6 select-none">FOR</p>
                        <EditableText value={data.coverPage.clientName} onChange={v => updateCover("clientName", v)} className="text-4xl font-bold mt-4" placeholder="Product Name" />
                            
                        <div className="flex items-baseline justify-center gap-2 mt-10">
                          <span className="text-3xl font-semibold select-none">BUILDING</span>
                          <EditableText value={data.coverPage.building} onChange={v => updateCover("building", v)} className="text-3xl font-semibold" placeholder="#" />
                        </div>

                        <div className="mt-16 space-y-3">
                          <EditableText value={data.coverPage.location} onChange={v => updateCover("location", v)} className="text-xl" placeholder="Location" />
                          <p className="text-lg font-semibold mt-10 select-none">Prepared by</p>
                          <EditableText value={data.coverPage.preparedBy} onChange={v => updateCover("preparedBy", v)} className="text-xl" placeholder="Name" />
                          <EditableText value={data.coverPage.department} onChange={v => updateCover("department", v)} className="text-xl" placeholder="Team / Department" />
                          <EditableText value={data.coverPage.date} onChange={v => updateCover("date", v)} className="text-xl mt-2" placeholder="Date" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Table of Contents — auto-generated from tocData, not directly editable */}
                  <DocumentPage hf={data.headerFooter} onHF={updateHF} pageNumber={2}>
                    <h2 className="font-bold text-lg mb-6 text-center">Table of Contents</h2>
                    <div className="space-y-0.5">
                      {tocData.entries.map((entry, i) => (
                        <div key={i} className="flex justify-between items-baseline text-[11px]" style={{ paddingLeft: `${entry.depth * 16}px` }}>
                          <div className="flex items-baseline gap-2 flex-1">
                            <span className="font-mono text-gray-600 shrink-0" style={{ minWidth: "40px" }}>{entry.number}</span>
                            <span>{entry.title}</span>
                            <span className="flex-1 border-b border-dotted border-gray-400 mx-1 mb-0.5" />
                          </div>
                          <span className="font-mono text-gray-600 shrink-0">{entry.page}</span>
                        </div>
                      ))}
                    </div>
                  </DocumentPage>

                  {/* Section Content — locked sections shown read-only, unlocked sections editable */}
                  <DocumentPage hf={data.headerFooter} onHF={updateHF} pageNumber={3}>
                    {renderSections(data.sections)}
                  </DocumentPage>
                </div>
              </div>
            </div>
          </DndContext>
        </div>
      </div>
    </div>
  );
}

// Suspense wrapper for useSearchParams()
export default function SowEditPage() {
  const { data: sessionData } = useSession();


  return (
    <div>
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading editor...</div>}>
        <SowEditPageInner />
      </Suspense>
    </div>
  );
}
