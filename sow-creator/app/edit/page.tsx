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

import React, { startTransition, Suspense, useEffect, useMemo, useState} from "react";
import { useSearchParams } from "next/navigation";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

import {
  Plus, Trash2, Download, Save, FileText, ChevronRight, ChevronDown,
  ListOrdered, Edit2, Table as TableIcon, Lock, Unlock, GripVertical,
  X, Check, PlusCircle, type LucideIcon,
  Plane,
  Type,
  SquarePlus,
  Grid2X2Plus,
  Link2,
  AlignLeft,
  CalendarDays,
  Hash,
  List,
  Pilcrow,
  WholeWord,
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
import { saveGlobalTemplate } from "@/lib/db-upsert";
import { getGlobalTemplate } from "@/lib/db-pullTemp";

// Allowed field types listed here so both the insert form and edit form share the same options
const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" }, { value: "number", label: "Number" },
  { value: "word", label: "Word" }, { value: "sentence", label: "Sentence" },
  { value: "paragraph", label: "Paragraph" }, { value: "list", label: "List" },
  { value: "date", label: "Date" },
];

const FIELD_TYPE_META: Record<FieldType, { icon: LucideIcon; shortLabel: string }> = {
  text: { icon: Type, shortLabel: "Text" },
  number: { icon: Hash, shortLabel: "Number" },
  word: { icon: WholeWord, shortLabel: "Word" },
  sentence: { icon: AlignLeft, shortLabel: "Sentence" },
  paragraph: { icon: Pilcrow, shortLabel: "Paragraph" },
  list: { icon: List, shortLabel: "List" },
  date: { icon: CalendarDays, shortLabel: "Date" },
};

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

// ============= INLINE EDITING =============
/**
 * Single-line click-to-edit field. When disabled (section locked), renders as plain text. When enabled, clicking swaps the display div for an <input>. Enter or blur confirms.
 * @param value The text content to display/edit
 * @param onChange Callback when text changes, recieves updated string value
 * @param className Optional additional class names for styling
 * @param placeholder Placeholder text when value is empty
 * @param disabled Boolean value indicating whether the text is open for editing or locked
 * 
 * @returns A JSX element that displays text and allows inline editing on click, with support for different input types and customizable styling. When the value is empty, it shows a placeholder to prompt the user to add content.
 */
export function EditableText({ value, onChange, className = "", placeholder = "Click to edit", disabled }: {
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
    <Textarea autoFocus value={value} onChange={e => onChange(e.target.value)}
      onBlur={() => setEditing(false)} rows={Math.max(3, (value.match(/\n/g) || []).length + 2)}
      className={`min-h-[7rem] bg-blue-50 border-blue-300 px-2 py-1 leading-relaxed whitespace-pre-wrap ${className}`} />
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
    <Textarea autoFocus value={value} onChange={e => onChange(e.target.value)}
      onBlur={() => setEditing(false)} rows={Math.max(1, (value.match(/\n/g) || []).length + 1)}
      className={`min-h-9 bg-blue-50 border-blue-300 px-2 py-1 text-sm leading-relaxed whitespace-pre-wrap ${className}`} />
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
function BlankChip({ field, onClick, onRemove, occurrenceCount = 1, removable = true }: {
  field: TemplateField; onClick: () => void; onRemove: () => void; occurrenceCount?: number; removable?: boolean;
}) {
  const TypeIcon = FIELD_TYPE_META[field.type].icon;
  return (
    <span className="blank-chip" data-type={field.type} onClick={onClick} title={occurrenceCount > 1 ? "Shared field. Editing this blank updates every matching occurrence." : "Blank field"}>
      <span className="blank-chip-icon" aria-hidden="true">
        <TypeIcon className="h-3 w-3" />
      </span>
      <span>{field.label}</span>
      {occurrenceCount > 1 && (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-black/10 px-1 text-[10px] font-medium">
          <Link2 className="h-2.5 w-2.5" />
          {occurrenceCount}
        </span>
      )}
      {removable && (
        <button onClick={e => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 opacity-40 hover:opacity-100 transition-opacity" title="Remove this occurrence">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

// ============= CONTENT RENDERER (parses {{field_id}} blanks) =============
// Parses the section content string for {{field_id}} tokens and renders them as BlankChips.
// Plain text between tokens renders as normal spans.
// When unlocked: click-to-edit textarea. When locked: static text with interactive blank chips.
function SectionContent({ content, fields, locked, onClickBlank, onChange, fieldUsageCounts, allowBlankRemoval = true, className = "text-sm leading-relaxed", placeholder = "Click to add content..." }: {
  content: string; fields: TemplateField[]; locked: boolean;
  onClickBlank: (fieldId: string) => void;
  onChange: (v: string) => void;
  fieldUsageCounts?: Map<string, number>;
  allowBlankRemoval?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const fieldMap = useMemo(() => new Map(fields.map(f => [f.id, f])), [fields]);

  // Parse content into segments: text and {{field_id}} tokens
  const segments = useMemo(() => {
    const parts: Array<{ type: "text"; value: string } | { type: "blank"; fieldId: string; start: number; end: number }> = [];
    const regex = /\{\{([^}]+)\}\}/g;
    let last = 0;
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match.index > last) parts.push({ type: "text", value: content.slice(last, match.index) });
      parts.push({ type: "blank", fieldId: match[1], start: match.index, end: match.index + match[0].length });
      last = match.index + match[0].length;
    }
    if (last < content.length) parts.push({ type: "text", value: content.slice(last) });
    if (parts.length === 0) parts.push({ type: "text", value: "" });
    return parts;
  }, [content]);

  const [editing, setEditing] = useState(false);
  const removeOccurrence = (start: number, end: number) => {
    const hasSpaceBefore = content[start - 1] === " ";
    const hasSpaceAfter = content[end] === " ";
    const adjustedStart = hasSpaceBefore && hasSpaceAfter ? start - 1 : start;
    onChange(content.slice(0, adjustedStart) + content.slice(end));
  };
  const renderSegments = (removable: boolean) => segments.map((seg, i) => {
    if (seg.type === "text") return <span key={i}>{seg.value}</span>;
    const field = fieldMap.get(seg.fieldId);
    if (!field) return <span key={i} className="text-red-400">{`{{${seg.fieldId}}}`}</span>;
    return (
      <BlankChip
        key={i}
        field={field}
        occurrenceCount={fieldUsageCounts?.get(field.id) ?? 1}
        onClick={() => onClickBlank(field.id)}
        onRemove={() => removeOccurrence(seg.start, seg.end)}
        removable={removable && allowBlankRemoval}
      />
    );
  });

  // If unlocked, show raw editable content
  if (!locked) {
    return editing ? (
      <div className="space-y-1.5">
        <Textarea autoFocus value={content} onChange={e => onChange(e.target.value)}
          onBlur={() => setEditing(false)} rows={Math.max(4, (content.match(/\n/g) || []).length + 2)}
          className={`min-h-[7rem] bg-blue-50 border-blue-300 px-2 py-1 leading-relaxed whitespace-pre-wrap ${className}`} />
        {content.includes("{{") && (
          <div className={`rounded border border-dashed border-blue-200 bg-blue-50/40 px-2 py-1.5 whitespace-pre-wrap min-h-[1.2em] ${className}`}>
            {renderSegments(false)}
          </div>
        )}
      </div>
    ) : (
      <div onClick={() => setEditing(true)}
        className={`cursor-text rounded px-1 hover:bg-blue-50/40 hover:outline hover:outline-1 hover:outline-blue-200 whitespace-pre-wrap min-h-[1.2em] ${className}`}>
        {renderSegments(true)}
        {!content && <span className="text-gray-400 italic font-normal">{placeholder}</span>}
      </div>
    );
  }

  // Locked: render static text with blank chips
  return (
    <div className={`whitespace-pre-wrap min-h-[1.2em] px-1 ${className}`}>
      {renderSegments(true)}
      {!content && <span className="text-gray-400 italic font-normal">No content — insert blanks or unlock to edit.</span>}
    </div>
  );
}

// ============= DOCUMENT PAGE WRAPPER =============
/**
 * Renders an 8.5x11in white page with editable header and footer zones (left/center/right). Children are rendered in the body area between the header and footer.
 * @param hf The Header and Footer Data to be imported into the reusable page wrapper
 * @param onHF setter function that updates a designated section of content in the HeaderFooterData object
 * @param pageNumber The designated number of the page to be generated in the open document
 * @param children Document body content to be imported into the page wrapper
 * 
 * @returns A JSX Element component serving as a template/design for a specific page of the document with editable header footer areas
 */
export function DocumentPage({ hf, onHF, pageNumber, fields = [], fieldUsageCounts, onClickBlank = () => {}, children }: {
  hf: HeaderFooterData; onHF: (k: keyof HeaderFooterData, v: string) => void; pageNumber: number;
  fields?: TemplateField[]; fieldUsageCounts?: Map<string, number>; onClickBlank?: (id: string) => void;
  children: React.ReactNode;
}) {
  const resolve = (text: string) => text.replace("{PAGE}", String(pageNumber));

  const renderZone = (k: keyof HeaderFooterData, className: string, placeholder: string) => (
    <SectionContent
      content={k.startsWith("footer") ? resolve(hf[k] as string) : hf[k] as string}
      fields={fields}
      locked={false}
      onClickBlank={onClickBlank}
      onChange={v => onHF(k, v)}
      fieldUsageCounts={fieldUsageCounts}
      className={className}
      placeholder={placeholder}
    />
  );

  return (
    <div className="bg-white shadow-lg mx-auto text-black" style={{ width: "8.5in", minHeight: "11in", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "0.5in 1in 0.1in 1in" }}>
        <div className="grid grid-cols-3 gap-1 text-sm text-gray-700">
          {renderZone("headerLeft", "text-left", "Header left")}
          {renderZone("headerCenter", "text-center", "Header center")}
          {renderZone("headerRight", "text-right", "Header right")}
        </div>
      </div>
      <div style={{ padding: "0.1in 1in", flex: 1 }}>{children}</div>
      <div style={{ padding: "0.1in 1in 0.5in 1in" }}>
        <div className="grid grid-cols-3 gap-1 text-sm text-gray-700">
          {renderZone("footerLeft", "text-left", hf.showPageNumbers && hf.pageNumberPosition === "footer-left" ? "Page {PAGE}" : "Footer left")}
          {renderZone("footerCenter", "text-center", hf.showPageNumbers && hf.pageNumberPosition === "footer-center" ? "Page {PAGE}" : "Footer center")}
          {renderZone("footerRight", "text-right", hf.showPageNumbers && hf.pageNumberPosition === "footer-right" ? "Page {PAGE}" : "Footer right")}
        </div>
      </div>
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
  onSelect, onUpdate, onAddChild, onAddSibling, onDelete, onToggleLock,
  onAddTable, onDeleteTable, onUpdateCell, onClickBlank, fieldUsageCounts, children }: {
  section: SectionNode; depth: number; isOnlyTop: boolean; isSelected: boolean;
  fields: TemplateField[];
  fieldUsageCounts?: Map<string, number>;
  onSelect: () => void;
  onUpdate: (u: Partial<SectionNode>) => void;
  onAddChild: () => void; onAddSibling: () => void; onDelete: () => void;
  onToggleLock: () => void;
  onAddTable: (r: number, c: number) => void;
  onDeleteTable: (id: string) => void;
  onUpdateCell: (tid: string, r: number, c: number, v: string) => void;
  onClickBlank: (fieldId: string) => void;
  onDeleteBlank?: (fieldId: string) => void;
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

  return (
    <div ref={setNodeRef} style={style} id={section.id}
      className={`relative ${section.lockEdit ? "locked-overlay" : ""} ${isSelected ? "ring-2 ring-primary/30 rounded" : ""}`}
      onClick={e => { e.stopPropagation(); onSelect(); }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => { setHovered(false); setShowTableForm(false); }}>

      {/* Hover toolbar */}
      {hovered && (
        <div className="absolute -top-1 right-0 flex gap-1 bg-white border border-gray-200 rounded shadow-md px-1.5 py-1 z-20 text-xs whitespace-nowrap">
          {/* Drag handle */}
          <button {...attributes} {...listeners} className="drag-handle px-1 py-0.5 rounded flex items-center" title="Drag to reorder">
            <GripVertical className="h-3 w-3" />
          </button>
          <button onClick={onToggleLock} title={section.lockEdit ? "Unlock section" : "Lock section"}
            className="hover:bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-1 text-gray-700">
            {section.lockEdit ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          </button>
          <button onClick={onAddChild} title="Add subsection" className="hover:bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-1 text-gray-700">
            <Plus className="h-3 w-3" /> Sub
          </button>
          <button onClick={onAddSibling} title="Add section at same level" className="hover:bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-1 text-gray-700">
            <Plus className="h-3 w-3" /> Section
          </button>
          <button onClick={() => setShowTableForm(t => !t)} title="Add table" className="hover:bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-1 text-gray-700">
            <TableIcon className="h-3 w-3" /> Table
          </button>
          <button onClick={onDelete} disabled={isOnlyTop} title="Delete section"
            className="hover:bg-red-50 px-1.5 py-0.5 rounded flex items-center gap-1 text-red-500 disabled:opacity-30">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Table size picker */}
      {showTableForm && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs">
          <span className="text-gray-600">Rows (1-20):</span>
          <input type="number" min={1} max={20} value={tr} onChange={e => setTr(Number(e.target.value) || 3)} className="w-12 border rounded px-1 py-0.5" />
          <span className="text-gray-600">× Cols (1-10):</span>
          <input type="number" min={1} max={10} value={tc} onChange={e => setTc(Number(e.target.value) || 3)} className="w-12 border rounded px-1 py-0.5" />
          <button onClick={() => { onAddTable(tr, tc); setShowTableForm(false); }}
            className="bg-primary text-primary-foreground px-2 py-0.5 rounded hover:opacity-90">Add</button>
          <button onClick={() => setShowTableForm(false)} className="px-2 py-0.5 rounded hover:bg-gray-200 text-gray-600">Cancel</button>
        </div>
      )}

      {/* Section heading */}
      <div className="flex items-baseline gap-2 mb-1" style={{ marginLeft: `${depth * 16}px` }}>
        {(section.lockEdit && section.lockDelete && section.lockAddSections && section.lockAddTable) && <Lock className="h-3 w-3 text-slate-400 shrink-0 mt-1" />}
        {!(section.lockEdit && section.lockDelete && section.lockAddSections && section.lockAddTable) && (section.lockEdit || section.lockDelete || section.lockAddSections || section.lockAddTable) && (
          <div className="inline-grid grid-cols-2 gap-0.5 shrink-0">
            {section.lockEdit && <div className="h-3 w-3" />}
            {!section.lockEdit && <Type className="h-3 w-3 text-indigo-500" />}
            {section.lockDelete && <div className="h-3 w-3" />}
            {!section.lockDelete && <Trash2 className="h-3 w-3 text-red-400" />}
            {section.lockAddSections && <div className="h-3 w-3" />}
            {!section.lockAddSections && <SquarePlus className="h-3 w-3" />}
            {section.lockAddTable && <div className="h-3 w-3" />}
            {!section.lockAddTable && <Grid2X2Plus className="h-3 w-3 text-lime-700" />}
            {/* <Lock className="h-2 w-2 text-slate-400" /> */}
          </div>)
          }
        <span className="font-mono text-gray-400 shrink-0 text-sm select-none">{section.number}</span>
        <EditableText value={section.title} onChange={v => onUpdate({ title: v })} className={headingClass} placeholder="Section title..." disabled={false} />
      </div>

      {/* Section body — uses SectionContent for blank rendering */}
      <div className="ml-8" style={{ marginLeft: `${depth * 16 + 32}px` }}>
        <SectionContent content={section.content} fields={fields} locked={false /*section.locked*/}
          onClickBlank={onClickBlank}
          fieldUsageCounts={fieldUsageCounts}
          onChange={v => onUpdate({ content: v })} />
      </div>

      {/* Tables */}
      {section.tables && section.tables.length > 0 && (
        <div className="mt-3 space-y-4" style={{ marginLeft: `${depth * 16 + 32}px` }}>
          {section.tables.map(table => (
            <div key={table.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400 font-mono">{table.rows}×{table.cols} table</span>
                <button onClick={() => onDeleteTable(table.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
              </div>
              <table className="border-collapse text-xs w-full">
                <tbody>
                  {table.data.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} className="border border-gray-300 p-0">
                          <input value={cell} onChange={e => onUpdateCell(table.id, ri, ci, e.target.value)}
                            className="w-full p-1.5 outline-none focus:bg-blue-50" placeholder={`r${ri + 1}c${ci + 1}`} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Recursively rendered children */}
      {children}
    </div>
  );
}

// ============= SORTABLE NAV ITEM =============
// Renders one item in the left section navigator with drag-and-drop support.
// Clicking selects the section and smooth-scrolls the document page to it.
// Lock icon shown when locked. Expand/collapse arrow shown when children exist.
function SortableNavItem({ section, depth, isExpanded, onToggleExpand, onSelect, isSelected }: {
  section: SectionNode; depth: number; isExpanded: boolean;
  onToggleExpand: () => void; onSelect: () => void; isSelected: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const hasChildren = section.children.length > 0;

  return (
    <div ref={setNodeRef} style={style}>
      <div className={`w-full flex items-center gap-1 rounded px-2 py-1.5 text-xs transition-colors
          ${isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}>
        <button {...attributes} {...listeners} className="drag-handle p-0.5 rounded inline-flex shrink-0">
          <GripVertical className="h-3 w-3" />
        </button>
        {hasChildren
          ? <span onClick={e => { e.stopPropagation(); onToggleExpand(); }} className="cursor-pointer hover:bg-accent rounded p-0.5 inline-flex shrink-0">
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </span>
          : <div className="w-4 shrink-0" />}
        <button onClick={onSelect} className="flex items-center gap-1 flex-1 min-w-0 text-left">
          {section.lockEdit && <Lock className="h-2.5 w-2.5 text-slate-400 shrink-0" />}
          <span className="font-mono text-gray-400 min-w-[35px] shrink-0">{section.number}</span>
          <span className="truncate">{section.title}</span>
        </button>
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

// Appends a blank subsection inside the given parent
function addChildSection(sections: SectionNode[], parentId: string): SectionNode[] {
  return sections.map(s => s.id === parentId
    ? { ...s, children: [...s.children, { id: `sec-${Date.now()}`, number: "", title: "New Subsection", content: "", lockEdit: true, lockDelete: true, lockAddTable: true, lockAddSections: true, tables: [], children: [] }] }
    : { ...s, children: addChildSection(s.children, parentId) });
}

// Inserts a new section directly after the sibling at the same nesting level
function addSiblingHelper(sections: SectionNode[], siblingId: string): { sections: SectionNode[]; added: boolean } {
  for (let i = 0; i < sections.length; i++) {
    if (sections[i].id === siblingId) {
      const newSec: SectionNode = { id: `sec-${Date.now()}`, number: "", title: "New Section", content: "", lockEdit: true, lockDelete: true, lockAddTable: true, lockAddSections: true, tables: [], children: [] };
      const next = [...sections]; next.splice(i + 1, 0, newSec);
      return { sections: next, added: true };
    }
    const r = addSiblingHelper(sections[i].children, siblingId);
    if (r.added) return { sections: sections.map((s, j) => j === i ? { ...s, children: r.sections } : s), added: true };
  }
  return { sections, added: false };
}

// Removes a section and all its children from the tree
function deleteSection(sections: SectionNode[], id: string): SectionNode[] {
  return sections.filter(s => s.id !== id).map(s => ({ ...s, children: deleteSection(s.children, id) }));
}

// Builds a flat list of TOC entries with estimated page numbers for Page 2
function generateTOCEntries(sections: SectionNode[], depth = 0, startPage = 2) {
  const entries: Array<{ number: string; title: string; page: number; depth: number }> = [];
  let page = startPage;
  for (const s of sections) {
    entries.push({ number: s.number, title: s.title, page, depth });
    page++;
    if (s.children.length > 0) { const r = generateTOCEntries(s.children, depth + 1, page); entries.push(...r.entries); page = r.nextPage; }
  }
  return { entries, nextPage: page };
}

// Handles drag-and-drop reordering — finds the dragged section in its sibling list
// and swaps it using arrayMove from @dnd-kit. Recurses into children if not found at top level.
function reorderSectionsByIds(sections: SectionNode[], activeId: string, overId: string): SectionNode[] {
  const activeIdx = sections.findIndex(s => s.id === activeId);
  const overIdx = sections.findIndex(s => s.id === overId);
  if (activeIdx !== -1 && overIdx !== -1) return arrayMove(sections, activeIdx, overIdx);
  // Try recursively in children
  return sections.map(s => ({ ...s, children: reorderSectionsByIds(s.children, activeId, overId) }));
}

// Remove blank token from all section content
function removeBlankFromContent(sections: SectionNode[], fieldId: string): SectionNode[] {
  const token = `{{${fieldId}}}`;
  return sections.map(s => ({
    ...s,
    content: s.content.replaceAll(token, ""),
    children: removeBlankFromContent(s.children, fieldId),
  }));
}

function countFieldOccurrences(data: TemplateData) {
  const counts = new Map<string, number>();
  const countInText = (text: string) => {
    for (const match of text.matchAll(/\{\{([^}]+)\}\}/g)) {
      const fieldId = match[1];
      counts.set(fieldId, (counts.get(fieldId) ?? 0) + 1);
    }
  };
  const walkSections = (sections: SectionNode[]) => {
    sections.forEach(section => {
      countInText(section.content);
      section.tables?.forEach(table => table.data.forEach(row => row.forEach(countInText)));
      walkSections(section.children);
    });
  };

  Object.values(data.headerFooter).forEach(value => {
    if (typeof value === "string") countInText(value);
  });
  walkSections(data.sections);

  return counts;
}

function appendFieldToken(content: string, fieldId: string) {
  return content ? `${content} {{${fieldId}}}` : `{{${fieldId}}}`;
}

// ============= MAIN COMPONENT (inner) =============
// Split from the default export so useSearchParams() can be wrapped in Suspense (required by Next.js).
// All document state, blank state, DnD state, and render functions live here.
function SowEditPageInner() {
  const searchParams = useSearchParams();
  const router  = useRouter();

  // Build initial document state once with useMemo.
  // If ?setup= param is present (base64 JSON from the /new form), decode and override defaults.
  const defaultData: TemplateData = useMemo(() => {
    const base: TemplateData = {
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
        { id: "field_cover_title", label: "SOW Title", type: "text", defaultValue: "Statement of Work", required: true },
        { id: "field_project_number", label: "Project Number", type: "text", defaultValue: "SOW-2026-001", required: true },
        { id: "field_cover_client_name", label: "Client Name", type: "text", required: false },
        { id: "field_cover_building", label: "Building", type: "text", required: false },
        { id: "field_cover_location", label: "Location", type: "text", required: false },
        { id: "field_cover_prepared_by", label: "Prepared By", type: "text", required: false },
        { id: "field_cover_department", label: "Department", type: "text", required: false },
        { id: "field_cover_date", label: "Date", type: "date", required: false },
        { id: "field_cover_confidentiality", label: "Confidentiality", type: "text", defaultValue: "Confidential", required: false },
        { id: "field_cover_description", label: "Description", type: "paragraph", required: false },
      ],
      headerFooter: {
        headerLeft: "Statement of Work",
        headerCenter: "",
        headerRight: "",
        footerLeft: "{{field_project_number}}",
        footerCenter: "",
        footerRight: "Page {PAGE}",
        showPageNumbers: true,
        pageNumberPosition: "footer-right",
      },
      sections: [
        {
          id: "sec-1", number: "1.0", title: "Scope of Work", content: "", lockEdit: true, lockDelete: true, lockAddTable: true, lockAddSections: true, tables: [],
          children: [
            // Unlocked - engineer edits freely. Blanks here are still filled via the questionnaire.
            {
              id: "sec-1-1", number: "1.1", title: "Scope", lockEdit: false, lockDelete: false, lockAddTable: false, lockAddSections: true, tables: [], children: [],
              content: "The following establishes the minimum requirement for the purchase, delivery, and installation of {{field_product_name_001}}. The contractor should {{field_contractor_tasks_002}} and {{field_contractor_service_003}}.",
            },
            {
              id: "sec-1-2", number: "1.2", title: "Background", lockEdit: false, lockDelete: false, lockAddTable: false, lockAddSections: true, tables: [], children: [],
              content: "The {{field_items_purchased_004}} are intended to be used at {{field_install_location_005}} for {{field_use_purpose_006}}. The items should be delivered to {{field_delivery_location_007}}.",
            },
          ],
        },
        {
          id: "sec-2", number: "2.0", title: "Applicable Standards", lockEdit: true, lockDelete: true, lockAddTable: true, lockAddSections: true, tables: [],
          content: "Contractor, at a minimum, is required to comply with the current editions of the following requirements for design, construction, installation, and safety as applicable.",
          children: [
            { id: "sec-2-1", number: "2.1", title: "Government Standards",    content: "The following documents form a part of this purchase description to the extent stipulated herein.",  lockEdit: true, lockDelete: true, lockAddTable: true, lockAddSections: true, tables: [], children: [] },
            { id: "sec-2-2", number: "2.2", title: "Non-Government Standards", content: "The following documents form a part of this document to the extent stipulated herein.",              lockEdit: true, lockDelete: true, lockAddTable: true, lockAddSections: true, tables: [], children: [] },
            { id: "sec-2-3", number: "2.3", title: "Order of Precedence",      content: "In the event of a conflict between the text of this specification and the references cited herein, the text of this specification takes precedence.", lockEdit: true, lockDelete: true, lockAddTable: true, lockAddSections: true, tables: [], children: [] },
            // Locked with blank - engineer fills via questionnaire bar or inline input
            { id: "sec-2-4", number: "2.4", title: "Applicable Standards",    content: "{{field_applicable_stds_008}}",   lockEdit: true, lockDelete: true, lockAddTable: true, lockAddSections: true, tables: [], children: [] },
            { id: "sec-2-5", number: "2.5", title: "Prohibited Materials",    content: "{{field_prohibited_mats_009}}",    lockEdit: true, lockDelete: true, lockAddTable: true, lockAddSections: true, tables: [], children: [] },
            { id: "sec-2-6", number: "2.6", title: "Environmental Protection", content: "Under the operating, service, transportation and storage conditions described herein the machine shall not emit materials hazardous to the ecological system as prohibited by federal, state or local statutes in effect at the point of installation.", lockEdit: true, lockDelete: true, lockAddTable: true, lockAddSections: true, tables: [], children: [] },
          ],
        },
        // Locked with blanks - lock states now match the admin edit page defaults
        { id: "sec-3", number: "3.0", title: "Written Submittals",                       content: "{{field_written_submittals_010}}", lockEdit: true, lockDelete: true, lockAddTable: true, lockAddSections: true, tables: [], children: [] },
        { id: "sec-4", number: "4.0", title: "Government Furnished Property and Services", content: "{{field_gfp_details_011}}",        lockEdit: true, lockDelete: true, lockAddTable: true, lockAddSections: true, tables: [], children: [] },
      ],
    };

    return base;
  }, [searchParams]);

  //update defaultData with db data if present
  useEffect(() => {
    const loadData = async () => {
      try {
        const dbData = await getGlobalTemplate();
        if (dbData){
          let migratedDbData = { ...(dbData as TemplateData) };
          if (migratedDbData.coverPage) {
            // Add default cover fields if they don't exist
            const coverFields: TemplateField[] = [
              { id: "field_cover_title", label: "SOW Title", type: "text", defaultValue: migratedDbData.coverPage.title || "Statement of Work", required: true },
              { id: "field_project_number", label: "Project Number", type: "text", defaultValue: migratedDbData.coverPage.projectNumber || "SOW-2026-001", required: true },
              { id: "field_cover_client_name", label: "Client Name", type: "text", defaultValue: migratedDbData.coverPage.clientName || "", required: false },
              { id: "field_cover_building", label: "Building", type: "text", defaultValue: migratedDbData.coverPage.building || "", required: false },
              { id: "field_cover_location", label: "Location", type: "text", defaultValue: migratedDbData.coverPage.location || "", required: false },
              { id: "field_cover_prepared_by", label: "Prepared By", type: "text", defaultValue: migratedDbData.coverPage.preparedBy || "", required: false },
              { id: "field_cover_department", label: "Department", type: "text", defaultValue: migratedDbData.coverPage.department || "", required: false },
              { id: "field_cover_date", label: "Date", type: "date", defaultValue: migratedDbData.coverPage.date || new Date().toISOString().split("T")[0], required: false },
              { id: "field_cover_confidentiality", label: "Confidentiality", type: "text", defaultValue: migratedDbData.coverPage.confidentiality || "Confidential", required: false },
              { id: "field_cover_description", label: "Description", type: "paragraph", defaultValue: "", required: false },
            ];
            migratedDbData.fields = [...coverFields, ...migratedDbData.fields.filter(f => !f.id.startsWith("field_cover_") && f.id !== "field_project_number")];
            if (migratedDbData.headerFooter.footerLeft === migratedDbData.coverPage.projectNumber) {
              migratedDbData.headerFooter.footerLeft = "{{field_project_number}}";
            }
            delete migratedDbData.coverPage;
          }
          setData(migratedDbData);
        }
      } catch (e) {
        console.error("Failed to load template from IndexedDB:", e);
      }
    };
    loadData();
  }, []);

  const [data, setData] = useState<TemplateData>(defaultData); // Primary document state — all edits call setData with functional updates to avoid stale closures
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(defaultData.sections.map(s => s.id))); // Tracks which section IDs are expanded in the left navigator
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(defaultData.documentName);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null); // Tracks which section is currently selected — drives ribbon button state

  // Blank insertion form state
  const [showBlankForm, setShowBlankForm] = useState(false);
  const [blankLabel, setBlankLabel] = useState("");
  const [blankType, setBlankType] = useState<FieldType>("text");
  const [blankPlaceholder, setBlankPlaceholder] = useState("");
  const [blankRequired, setBlankRequired] = useState(false);
  const [reusedFieldId, setReusedFieldId] = useState("");
  const [reuseSearch, setReuseSearch] = useState("");
  const [showReuseOptions, setShowReuseOptions] = useState(false);

  // Blank editing state
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  const selectedSection = selectedSectionId ? findSection(data.sections, selectedSectionId) : null;
  const reusableFields = useMemo(() => {
    const query = reuseSearch.trim().toLowerCase();
    return data.fields.filter(field => {
      if (!query) return true;
      return [field.label, field.type, field.placeholder, field.defaultValue, field.id]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(query));
    });
  }, [data.fields, reuseSearch]);

  // DnD sensors - PointerSensor requires 5px movement before activating to avoid accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // Shorthand updaters for cover page and header/footer fields
  const updateHF = (k: keyof HeaderFooterData, v: string) =>
    setData(p => ({ ...p, headerFooter: { ...p.headerFooter, [k]: v } }));
  function toggleExpand(id: string) {
    setExpandedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  // Save / Load / Export
  // handleSave goes straight to DB
  function handleSave() {
    startTransition(async () => {
      const result = await saveGlobalTemplate(data);
      if (result.success) {
        alert("The SOW template has been saved.");
      }
    });
    // const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    // const url = URL.createObjectURL(blob);
    // const a = document.createElement("a");
    // a.href = url;
    // a.download = `${data.documentName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.json`;
    // a.click(); URL.revokeObjectURL(url);
  }

  // handleLoadJSON opens a file picker, reads the JSON file, and replaces the current document
  // function handleLoadJSON() {
  //   const input = document.createElement("input");
  //   input.type = "file"; input.accept = ".json";
  //   input.onchange = (e: Event) => {
  //     const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
  //     const reader = new FileReader();
  //     reader.onload = ev => {
  //       try {
  //         const loaded = JSON.parse(ev.target?.result as string);
  //         setData(loaded); setEditedName(loaded.documentName || "Untitled Document");
  //         setExpandedIds(new Set(loaded.sections.map((s: SectionNode) => s.id)));
  //       } catch { alert("Invalid JSON file"); }
  //     };
  //     reader.readAsText(file);
  //   };
  //   input.click();
  // }

  // handleExport is a placeholder — planned: Next.js API → sanitize → Flask → python-docx → .docx download
  // function handleExport() {
  //   alert("Export to Word will generate a .docx file. Backend integration coming soon!");
  // }

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
      const newContent = sec ? appendFieldToken(sec.content, fieldId) : "";
      return {
        ...p,
        fields: [...p.fields, newField],
        sections: updateSection(p.sections, selectedSectionId, { content: newContent }),
      };
    });
    setBlankLabel(""); setBlankPlaceholder(""); setBlankRequired(false);
    setShowBlankForm(false);
  }

  function handleInsertExistingBlank() {
    if (!reusedFieldId || !selectedSectionId) return;

    setData(p => {
      const sec = findSection(p.sections, selectedSectionId);
      if (!sec || !p.fields.some(field => field.id === reusedFieldId)) return p;

      return {
        ...p,
        sections: updateSection(p.sections, selectedSectionId, {
          content: appendFieldToken(sec.content, reusedFieldId),
        }),
      };
    });
    setReusedFieldId("");
    setReuseSearch("");
    setShowReuseOptions(false);
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
          const onToggleLock = () => setData(p => ({ ...p, sections: updateSection(p.sections, section.id, { lockEdit: !section.lockEdit }) }));
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
              fieldUsageCounts={fieldUsageCounts}
              onSelect={() => setSelectedSectionId(section.id)}
              onUpdate={onUpdate} onAddChild={onAddChild} onAddSibling={onAddSibling}
              onDelete={onDelete} onToggleLock={onToggleLock}
              onAddTable={onAddTable} onDeleteTable={onDeleteTable} onUpdateCell={onUpdateCell}
              onClickBlank={id => setEditingFieldId(id)}>
              {section.children.length > 0 && renderSections(section.children, depth + 1)}
            </SortableSectionBlock>
          );
        })}
      </SortableContext>
    );
  }

  // ── Nav rendering ──
  // Renders the left panel section list with drag-and-drop support.
  // Clicking selects a section and smooth-scrolls to it on the document page.
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
  const fieldUsageCounts = useMemo(() => countFieldOccurrences(data), [data]);

  const handleReturnToNewForm = () => {
    router.push("/login");
  };
  

  // ============= RENDER =============
  return (
    <SidebarProvider>
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        {/* Slim header — just sidebar trigger + doc name */}
        <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4 bg-background sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <a href="/"  className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg shrink-0">
                <Plane className="size-4" />
              </div>
              <div className="flex flex-col text-left leading-tight">
                <span className="text-sm font-semibold uppercase tracking-tighter">SoWizard</span>
                <span className="text-[10px] text-muted-foreground uppercase font-mono">Tinker AFB</span>
              </div>
            </a>
            <SidebarTrigger className="-ml-1" />
            <FileText className="h-4 w-4 text-primary" />
            {isEditingName ? (
              <div className="flex items-center gap-1">
                <Input autoFocus value={editedName} onChange={e => setEditedName(e.target.value)} className="h-7 w-52 text-sm"
                  onKeyDown={e => { if (e.key === "Enter") { setData(p => ({ ...p, documentName: editedName })); setIsEditingName(false); } if (e.key === "Escape") { setEditedName(data.documentName); setIsEditingName(false); } }} />
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setData(p => ({ ...p, documentName: editedName })); setIsEditingName(false); }}>Save</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditedName(data.documentName); setIsEditingName(false); }}>Cancel</Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold">{data.documentName}</span>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setIsEditingName(true)}><Edit2 className="h-3 w-3" /></Button>
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {data.fields.length} blank{data.fields.length !== 1 ? "s" : ""} · {data.sections.length} section{data.sections.length !== 1 ? "s" : ""}
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: section navigator */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="w-60 border-r shrink-0 flex flex-col overflow-hidden">
              <div className="px-3 py-2 border-b flex items-center gap-2 shrink-0 bg-background">
                <ListOrdered className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Sections</span>
              </div>
              <div className="p-2 space-y-0.5 overflow-y-auto flex-1">{renderNav(data.sections)}</div>
            </div>

            {/* Right: ribbon + document pages */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* ── Frosted Editing Ribbon ── */}
              {/* Sticky toolbar above the document. Groups: File, Insert, Lock, Delete. */}
              {/* Buttons requiring a selection are disabled when selectedSection is null. */}
              <div className="editor-ribbon sticky top-0 z-30 px-3 py-1.5 flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                {/* File group */}
                <RibbonBtn icon={Save} label="Save" onClick={handleSave} />
                {/* <RibbonBtn icon={Download} label="Load" onClick={handleLoadJSON} />
                <RibbonBtn icon={Download} label="Export" onClick={handleExport} /> */}
                <div className="ribbon-divider" />

                {/* Insert group */}
                <RibbonBtn icon={Plus} label="Section" onClick={() => setData(p => ({
                  ...p, sections: renumberSections([...p.sections, { id: `sec-${Date.now()}`, number: "", title: "New Section", content: "", lockEdit: true, lockDelete: true, lockAddTable: true, lockAddSections: true, tables: [], children: [] }])
                }))} />
                <RibbonBtn icon={Plus} label="Sub" disabled={!selectedSection}
                  onClick={() => {
                    if (!selectedSectionId) return;
                    setData(p => ({ ...p, sections: renumberSections(addChildSection(p.sections, selectedSectionId)) }));
                    setExpandedIds(p => new Set([...p, selectedSectionId]));
                  }} />
                <RibbonBtn icon={PlusCircle} label="Blank" disabled={!selectedSection}
                  onClick={() => setShowBlankForm(true)} />
                <div className="ribbon-divider" />

                {/* Lock group */}
                <RibbonBtn icon={selectedSection?.lockEdit ? Lock : Unlock}
                  label={"Lock Text"}
                  active={selectedSection?.lockEdit}
                  disabled={!selectedSection}
                  onClick={() => {
                    if (!selectedSectionId) return;
                    setData(p => ({ ...p, sections: updateSection(p.sections, selectedSectionId, { lockEdit: !selectedSection?.lockEdit }) }));
                  }} />
                <RibbonBtn icon={selectedSection?.lockDelete ? Lock : Unlock}
                  label={"Lock Deletion"}
                  active={selectedSection?.lockDelete}
                  disabled={!selectedSection}
                  onClick={() => {
                    if (!selectedSectionId) return;
                    setData(p => ({ ...p, sections: updateSection(p.sections, selectedSectionId, { lockDelete: !selectedSection?.lockDelete }) }));
                  }} />
                <RibbonBtn icon={selectedSection?.lockAddTable ? Lock : Unlock}
                  label={"Lock Tables"}
                  active={selectedSection?.lockAddTable}
                  disabled={!selectedSection}
                  onClick={() => {
                    if (!selectedSectionId) return;
                    setData(p => ({ ...p, sections: updateSection(p.sections, selectedSectionId, { lockAddTable: !selectedSection?.lockAddTable }) }));
                  }} />
                <RibbonBtn icon={selectedSection?.lockAddSections ? Lock : Unlock}
                  label={"Lock Sections"}
                  active={selectedSection?.lockAddSections}
                  disabled={!selectedSection}
                  onClick={() => {
                    if (!selectedSectionId) return;
                    setData(p => ({ ...p, sections: updateSection(p.sections, selectedSectionId, { lockAddSections: !selectedSection?.lockAddSections }) }));
                  }} />
                <div className="ribbon-divider" />

                {/* Delete */}
                <RibbonBtn icon={Trash2} label="Delete" danger disabled={!selectedSection || data.sections.length === 1}
                  onClick={() => {
                    if (!selectedSectionId || !confirm("Delete this section?")) return;
                    setData(p => ({ ...p, sections: renumberSections(deleteSection(p.sections, selectedSectionId)) }));
                    setSelectedSectionId(null);
                  }} />

                {/* Spacer */}
                <div className="flex-1" />

                {/* Selected section indicator */}
                {selectedSection && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="font-mono">{selectedSection.number}</span>
                    <span className="truncate max-w-[200px]">{selectedSection.title}</span>
                  </div>
                )}
              </div>

              {/* ── Insert Blank Form (shown below ribbon) ── */}
              {showBlankForm && (
                <div className="bg-muted/50 border-b px-4 py-3 flex flex-wrap items-end gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-medium text-muted-foreground uppercase">New field label *</Label>
                    <Input value={blankLabel} onChange={e => setBlankLabel(e.target.value)} placeholder="e.g. Project Name" className="h-8 w-44 text-sm" autoFocus />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-medium text-muted-foreground uppercase">Type</Label>
                    <Select value={blankType} onValueChange={value => setBlankType(value as FieldType)}>
                      <SelectTrigger size="sm" className="h-8 w-36 rounded-md bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-medium text-muted-foreground uppercase">Placeholder</Label>
                    <Input value={blankPlaceholder} onChange={e => setBlankPlaceholder(e.target.value)} placeholder="Hint text..." className="h-8 w-32 text-sm" />
                  </div>
                  <Label className="flex items-center gap-1.5 text-xs cursor-pointer pb-2">
                    <input type="checkbox" checked={blankRequired} onChange={e => setBlankRequired(e.target.checked)} className="rounded" />
                    Required
                  </Label>
                  <Button size="sm" className="h-8 gap-1" onClick={handleInsertBlank} disabled={!blankLabel.trim()}>
                    <Check className="h-3 w-3" /> Create
                  </Button>
                  <div className="mx-1 h-8 w-px bg-border" />
                  <div className="relative flex flex-col gap-1">
                    <Label className="text-[10px] font-medium text-muted-foreground uppercase">Reuse existing field</Label>
                    <Input
                      value={reuseSearch}
                      onFocus={() => setShowReuseOptions(true)}
                      onChange={e => {
                        setReuseSearch(e.target.value);
                        setReusedFieldId("");
                        setShowReuseOptions(true);
                      }}
                      onKeyDown={e => {
                        if (e.key === "Escape") setShowReuseOptions(false);
                        if (e.key === "Enter" && reusableFields[0]) {
                          e.preventDefault();
                          setReusedFieldId(reusableFields[0].id);
                          setReuseSearch(reusableFields[0].label);
                          setShowReuseOptions(false);
                        }
                      }}
                      placeholder="Search shared fields..."
                      className="h-8 w-64 text-sm"
                    />
                    {showReuseOptions && (
                      <div className="absolute left-0 top-full z-50 mt-1 max-h-72 w-80 overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg">
                        {reusableFields.length > 0 ? reusableFields.map(field => {
                          const TypeIcon = FIELD_TYPE_META[field.type].icon;
                          return (
                            <button
                              key={field.id}
                              type="button"
                              className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent ${reusedFieldId === field.id ? "bg-accent" : ""}`}
                              onMouseDown={e => e.preventDefault()}
                              onClick={() => {
                                setReusedFieldId(field.id);
                                setReuseSearch(field.label);
                                setShowReuseOptions(false);
                              }}
                            >
                              <span className="blank-chip" data-type={field.type} style={{ cursor: "default" }}>
                                <span className="blank-chip-icon" aria-hidden="true">
                                  <TypeIcon className="h-3 w-3" />
                                </span>
                                <span>{field.label}</span>
                              </span>
                              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                                {fieldUsageCounts.get(field.id) ?? 0} used
                              </span>
                            </button>
                          );
                        }) : (
                          <div className="px-2 py-2 text-sm text-muted-foreground">No matching fields</div>
                        )}
                      </div>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleInsertExistingBlank} disabled={!reusedFieldId}>
                    <Link2 className="h-3 w-3" /> Insert reuse
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowBlankForm(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* ── Edit Blank Properties (shown below ribbon when editing a blank) ── */}
              {editingField && (
                <div className="bg-blue-50/50 dark:bg-blue-950/20 border-b px-4 py-3 flex items-end gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                  <div className="text-xs font-medium text-muted-foreground flex items-center gap-1 mr-2">
                    Editing blank:
                    <span className="blank-chip" data-type={editingField.type} style={{ cursor: "default" }}>
                      <span className="blank-chip-icon" aria-hidden="true">
                        {React.createElement(FIELD_TYPE_META[editingField.type].icon, { className: "h-3 w-3" })}
                      </span>
                      {editingField.label}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-medium text-muted-foreground uppercase">Label</Label>
                    <Input value={editingField.label} onChange={e => handleUpdateField(editingField.id, { label: e.target.value })} className="h-8 w-32 text-sm" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-medium text-muted-foreground uppercase">Type</Label>
                    <Select value={editingField.type} onValueChange={value => handleUpdateField(editingField.id, { type: value as FieldType })}>
                      <SelectTrigger size="sm" className="h-8 w-36 rounded-md bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-medium text-muted-foreground uppercase">Placeholder</Label>
                    <Input value={editingField.placeholder || ""} onChange={e => handleUpdateField(editingField.id, { placeholder: e.target.value })} className="h-8 w-32 text-sm" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-medium text-muted-foreground uppercase">Default</Label>
                    <Input value={editingField.defaultValue || ""} onChange={e => handleUpdateField(editingField.id, { defaultValue: e.target.value })} className="h-8 w-32 text-sm" />
                  </div>
                  <Label className="flex items-center gap-1.5 text-xs cursor-pointer pb-2">
                    <input type="checkbox" checked={editingField.required ?? false} onChange={e => handleUpdateField(editingField.id, { required: e.target.checked })} className="rounded" />
                    Required
                  </Label>
                  <Button size="sm" variant="outline" className="h-8 text-red-600 hover:text-red-700" onClick={() => handleDeleteBlank(editingField.id)}>
                    <Trash2 className="h-3 w-3" /> Delete field everywhere
                  </Button>
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
                        <SectionContent content="{{field_cover_title}}" fields={data.fields} locked={true} onClickBlank={id => setEditingFieldId(id)} onChange={() => {}} fieldUsageCounts={fieldUsageCounts} allowBlankRemoval={false} className="text-4xl font-bold" placeholder="SOW Title" />

                        <p className="text-3xl font-semibold mt-6 select-none">FOR</p>
                        <div className="mt-4">
                          <SectionContent content="{{field_cover_client_name}}" fields={data.fields} locked={true} onClickBlank={id => setEditingFieldId(id)} onChange={() => {}} fieldUsageCounts={fieldUsageCounts} allowBlankRemoval={false} className="text-4xl font-bold" placeholder="Product Name" />
                        </div>
                            
                        <div className="flex items-baseline justify-center gap-2 mt-10">
                          <span className="text-3xl font-semibold select-none">BUILDING</span>
                          <div className="flex-1 max-w-[200px]">
                            <SectionContent content="{{field_cover_building}}" fields={data.fields} locked={true} onClickBlank={id => setEditingFieldId(id)} onChange={() => {}} fieldUsageCounts={fieldUsageCounts} allowBlankRemoval={false} className="text-3xl font-semibold" placeholder="#" />
                          </div>
                        </div>

                        <div className="mt-16 space-y-3">
                          <SectionContent content="{{field_cover_location}}" fields={data.fields} locked={true} onClickBlank={id => setEditingFieldId(id)} onChange={() => {}} fieldUsageCounts={fieldUsageCounts} allowBlankRemoval={false} className="text-xl" placeholder="Location" />
                          <p className="text-lg font-semibold mt-10 select-none">Prepared by</p>
                          <SectionContent content="{{field_cover_prepared_by}}" fields={data.fields} locked={true} onClickBlank={id => setEditingFieldId(id)} onChange={() => {}} fieldUsageCounts={fieldUsageCounts} allowBlankRemoval={false} className="text-xl" placeholder="Name" />
                          <SectionContent content="{{field_cover_department}}" fields={data.fields} locked={true} onClickBlank={id => setEditingFieldId(id)} onChange={() => {}} fieldUsageCounts={fieldUsageCounts} allowBlankRemoval={false} className="text-xl" placeholder="Team / Department" />
                          <SectionContent content="{{field_cover_date}}" fields={data.fields} locked={true} onClickBlank={id => setEditingFieldId(id)} onChange={() => {}} fieldUsageCounts={fieldUsageCounts} allowBlankRemoval={false} className="text-xl mt-2" placeholder="Date" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Table of Contents — auto-generated from tocData, not directly editable */}
                  <DocumentPage hf={data.headerFooter} onHF={updateHF} pageNumber={2} fields={data.fields} fieldUsageCounts={fieldUsageCounts} onClickBlank={id => setEditingFieldId(id)}>
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
                  <DocumentPage hf={data.headerFooter} onHF={updateHF} pageNumber={3} fields={data.fields} fieldUsageCounts={fieldUsageCounts} onClickBlank={id => setEditingFieldId(id)}>
                    {renderSections(data.sections)}
                    <button onClick={() => setData(p => ({
                      ...p, sections: renumberSections([...p.sections, { id: `sec-${Date.now()}`, number: "", title: "New Section", content: "", lockEdit: true, lockDelete: true, lockAddTable: true, lockAddSections: true, tables: [], children: [] }])
                    }))} className="mt-6 flex items-center gap-2 text-sm text-gray-400 hover:text-primary hover:border-primary border border-dashed border-gray-300 rounded px-4 py-2 w-full justify-center transition-colors">
                      <Plus className="h-4 w-4" /> Add Top-Level Section
                    </button>
                  </DocumentPage>
                </div>
              </div>
            </div>
          </DndContext>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

// Suspense wrapper for useSearchParams()
export default function SowEditPage() {
  const { data: sessionData } = useSession();
  const router = useRouter();

  //Prevent non-admins from using this page
  useEffect(() => {
    if (sessionData?.user.role !== "ADMIN"){
      router.push("/");
    }
  }, [sessionData, router]);


  return (
    <div>
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading editor...</div>}>
        <SowEditPageInner />
      </Suspense>
    </div>
  );
}
