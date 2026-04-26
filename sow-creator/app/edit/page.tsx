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

import React, { Suspense, useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  Plus, Trash2, Download, Save, FileText, ChevronRight, ChevronDown,
  ListOrdered, Edit2, Table as TableIcon, Lock, Unlock, GripVertical,
  X, Check, PlusCircle, type LucideIcon,
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, List, IndentIncrease, IndentDecrease,
  Undo2, Redo2, Type, Highlighter, Minus, Upload, Eraser,
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
// TypeScript type definitions for every data shape in this file.
// FieldType is the set of allowed blank field types.
// TemplateField describes one fillable blank slot inserted into section content.
// SectionNode is recursive — children: SectionNode[] enables nested subsections.
// locked: boolean on SectionNode controls whether the section is editable.
// TemplateData is the top-level document object that gets serialized to JSON on Save.
type FieldType = "text" | "number" | "word" | "sentence" | "paragraph" | "list" | "date" | "dropdown";
type TemplateField = {
  id: string; label: string; type: FieldType;
  defaultValue?: string; placeholder?: string; required?: boolean; options?: string[];
};
type SectionNode = {
  id: string; number: string; title: string; content: string;
  locked: boolean; tables?: TableData[]; children: SectionNode[];
};
type TableData = { id: string; rows: number; cols: number; data: string[][] };
type CoverPageData = {
  title: string; projectNumber: string; clientName: string; building: string;
  location: string; preparedBy: string; department: string; date: string;
  version: string; confidentiality: string;
};
type HeaderFooterData = {
  headerLeft: string; headerCenter: string; headerRight: string;
  footerLeft: string; footerCenter: string; footerRight: string;
  showPageNumbers: boolean; pageNumberPosition: "footer-center" | "footer-right" | "footer-left";
};
type TemplateData = {
  documentName: string; fields: TemplateField[];
  coverPage: CoverPageData; headerFooter: HeaderFooterData; sections: SectionNode[];
};

// Allowed field types listed here so both the insert form and edit form share the same options
const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" }, { value: "number", label: "Number" },
  { value: "word", label: "Word" }, { value: "sentence", label: "Sentence" },
  { value: "paragraph", label: "Paragraph" }, { value: "list", label: "List" },
  { value: "date", label: "Date" }, { value: "dropdown", label: "Dropdown" },
];

// ============= RIBBON BUTTON =============
// Reusable button for the editing ribbon toolbar.
// Supports disabled, active (highlighted), and danger (red) visual states.
function RibbonBtn({ icon: Icon, label, onClick, disabled, active, danger }: {
  icon: LucideIcon; label: string; onClick?: () => void; disabled?: boolean; active?: boolean; danger?: boolean;
}) {
  const content = (
    <>
      <Icon className="h-4 w-4" />
      <span className="text-[10px] leading-none">{label}</span>
    </>
  );

  // If component is a true/false toggle (e.g. Bold)
  if (active !== undefined) {
    return (
      <Toggle pressed={active} onPressedChange={onClick} disabled={disabled} title={label}
        onMouseDown={e => e.preventDefault()}
        className={`flex flex-col items-center gap-0.5 h-auto py-1 px-2 rounded-sm ${danger ? "text-destructive hover:text-destructive hover:bg-destructive/10" : ""} data-[state=on]:bg-primary/20 data-[state=on]:text-primary`}
        size="sm">
        {content}
      </Toggle>
    );
  }

  // Otherwise, normal push-button
  return (
    <Button variant="ghost" size="sm" onClick={onClick} disabled={disabled} title={label}
      onMouseDown={e => e.preventDefault()}
      className={`flex flex-col items-center gap-0.5 h-auto py-1 px-2 rounded-sm ${danger ? "text-destructive hover:text-destructive hover:bg-destructive/10" : ""}`}>
      {content}
    </Button>
  );
}

// ============= RIBBON GROUP =============
// Groups controls under a labeled section like Word's ribbon groups.
function RibbonGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="ribbon-group flex flex-col items-center px-1.5 py-0.5 gap-0.5">
      <div className="ribbon-group-controls flex flex-row items-center gap-px flex-1">{children}</div>
      <span className="ribbon-group-label text-[9px] uppercase tracking-wider text-muted-foreground text-center select-none whitespace-nowrap">{label}</span>
    </div>
  );
}

// Font families and sizes for the ribbon dropdowns
const FONT_FAMILIES = [
  "Arial", "Times New Roman", "Calibri", "Georgia", "Courier New",
  "Verdana", "Trebuchet MS", "Garamond", "Tahoma",
];
const FONT_SIZE_MAP: { label: string; value: string }[] = [
  { label: "8", value: "1" }, { label: "10", value: "2" },
  { label: "12", value: "3" }, { label: "14", value: "4" },
  { label: "18", value: "5" }, { label: "24", value: "6" },
  { label: "36", value: "7" },
];
type RibbonTab = "home" | "insert" | "layout";

// ============= FONT SIZE INPUT =============
function FontSizeInput({ formatState, restoreSelection, handleFormat }: {
  formatState: any, restoreSelection: () => void, handleFormat: (c: string, v: string) => void
}) {
  const defaultLabel = FONT_SIZE_MAP.find(s => s.value === formatState.fontSize)?.label || "12";
  const [localValue, setLocalValue] = useState(defaultLabel);

  useEffect(() => {
    setLocalValue(FONT_SIZE_MAP.find(s => s.value === formatState.fontSize)?.label || "12");
  }, [formatState.fontSize]);

  const commitValue = (val: string) => {
    let sizeObj = FONT_SIZE_MAP.find(s => s.label === val);
    if (!sizeObj) {
      const numericVal = parseInt(val, 10);
      if (!isNaN(numericVal)) {
        let closest = FONT_SIZE_MAP[0];
        let minDiff = Infinity;
        for (const s of FONT_SIZE_MAP) {
          const diff = Math.abs(parseInt(s.label) - numericVal);
          if (diff < minDiff) { minDiff = diff; closest = s; }
        }
        sizeObj = closest;
      }
    }
    
    if (sizeObj) {
      restoreSelection();
      handleFormat("fontSize", sizeObj.value);
    }
    
    setTimeout(() => { setLocalValue(sizeObj?.label || "12"); }, 50);
  };

  return (
    <div className="relative">
      <input 
        list="font-sizes-list" 
        value={localValue} 
        onChange={e => { 
          setLocalValue(e.target.value);
          if (FONT_SIZE_MAP.some(s => s.label === e.target.value)) {
            commitValue(e.target.value);
          }
        }}
        onBlur={e => commitValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") {
             e.preventDefault();
             commitValue(localValue);
             e.currentTarget.blur();
          }
        }}
        className="h-7! w-[60px] text-[11px] rounded-md border border-input bg-transparent px-2 shadow-none outline-none focus:ring-0 hover:bg-accent" 
      />
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
      <datalist id="font-sizes-list">
        {FONT_SIZE_MAP.map(s => <option key={s.label} value={s.label} />)}
      </datalist>
    </div>
  );
}

// ============= CONTENT EDITABLE BLOCK =============
// Isolated contentEditable that React.memo never re-renders. This prevents React
// from interfering with user-edited DOM content when parent state changes (e.g. formatState).
//
// Key design: onBlur does NOT exit editing mode. Instead, a click-outside listener
// detects clicks outside both the editable AND the ribbon, and only then exits.
// This ensures formatting buttons work without unmounting the contentEditable.
const ContentEditableBlock = React.memo(function ContentEditableBlock({
  initialHtml, onSave, onExit, className,
}: {
  initialHtml: string;
  onSave: (html: string) => void;
  onExit: () => void;
  className: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onSaveRef = useRef(onSave);
  const onExitRef = useRef(onExit);
  onSaveRef.current = onSave;
  onExitRef.current = onExit;

  // Set initial content on mount
  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = initialHtml;
      ref.current.focus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click-outside detection: exit editing only when clicking outside
  // BOTH the contentEditable AND the ribbon toolbar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Ignore clicks inside this editable
      if (ref.current && ref.current.contains(target)) return;
      // Ignore clicks inside the ribbon (so formatting buttons don't exit editing)
      if (target.closest(".editor-ribbon")) return;
      // Click was outside both — save and exit
      if (ref.current) onSaveRef.current(ref.current.innerHTML);
      onExitRef.current();
    };
    // Use setTimeout so the initial click that opened editing doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onPointerDown={e => e.stopPropagation()} // Stop dnd-kit from intercepting drag
      onMouseDown={e => e.stopPropagation()}   // Stop parent from stealing focus/state
      onClick={e => e.stopPropagation()}       // Stop parent onClick (which triggers onSelect)
      onKeyDown={(e) => {
        // Keyboard shortcuts for formatting (Cmd/Ctrl + key)
        const mod = e.metaKey || e.ctrlKey;
        if (mod) {
          switch (e.key.toLowerCase()) {
            case "b": e.preventDefault(); document.execCommand("bold"); break;
            case "i": e.preventDefault(); document.execCommand("italic"); break;
            case "u": e.preventDefault(); document.execCommand("underline"); break;
            case "z":
              e.preventDefault();
              document.execCommand(e.shiftKey ? "redo" : "undo");
              break;
          }
        }
        // ESC exits editing
        if (e.key === "Escape") {
          e.preventDefault();
          if (ref.current) onSaveRef.current(ref.current.innerHTML);
          onExitRef.current();
        }
      }}
      className={className}
    />
  );
}, () => true); // Custom comparator: never re-render

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
  if (disabled) {
    return (
      <div className={`px-1 whitespace-pre-wrap min-h-[1.2em] ${className}`}
        dangerouslySetInnerHTML={{ __html: value || `<span class="text-gray-400 italic text-sm font-normal">${placeholder}</span>` }} />
    );
  }

  // Always render ContentEditableBlock when enabled to prevent DOM swaps that break selection
  return (
    <ContentEditableBlock
      initialHtml={value}
      onSave={(html) => onChange(html)}
      onExit={() => {}}
      className={`content-editable-area bg-blue-50 border border-blue-300 rounded px-1 w-full ${className}`}
    />
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

  // Convert {{field_id}} to non-editable span chips with data attributes
  const displayHtml = useMemo(() => {
    return content.replace(/\{\{([^}]+)\}\}/g, (match, fieldId) => {
      const field = fieldMap.get(fieldId);
      if (!field) return `<span class="text-red-400">{{${fieldId}}}</span>`;
      return `<span contenteditable="false" class="blank-chip" data-id="${field.id}" data-type="${field.type}"><span>${field.label}</span><span class="opacity-60 text-[10px]" style="pointer-events: none;">(${field.type})</span></span>`;
    });
  }, [content, fieldMap]);

  return (
    <div className="relative group px-1" onClick={(e) => {
      const chip = (e.target as HTMLElement).closest('.blank-chip');
      if (chip) {
        const id = chip.getAttribute('data-id');
        if (id) onClickBlank(id);
      }
    }}>
      <ContentEditableBlock
        initialHtml={displayHtml}
        onExit={() => {}}
        className="editor-content w-full min-h-[1.2em] focus-visible:outline-none focus:outline-none"
        onSave={(html) => {
          // Revert html chips back to {{field_id}}
          const temp = document.createElement("div");
          temp.innerHTML = html;
          temp.querySelectorAll('.blank-chip').forEach(el => {
            const id = el.getAttribute('data-id');
            if (id) {
               el.replaceWith(`{{${id}}}`);
            }
          });
          temp.querySelectorAll('.text-red-400').forEach(el => {
            el.replaceWith(el.textContent || "");
          });
          onChange(temp.innerHTML);
        }}
      />
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
export function DocumentPage({ hf, onHF, pageNumber, children }: {
  hf: HeaderFooterData; onHF: (k: keyof HeaderFooterData, v: string) => void; pageNumber: number; children: React.ReactNode;
}) {
  return (
    <div className="bg-white shadow-lg mx-auto text-black" style={{ width: "8.5in", minHeight: "11in", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "0.5in 1in 0.1in 1in" }}>
        <div className="grid grid-cols-3 gap-1 text-sm text-gray-700">
          <EditableArea value={hf.headerLeft} onChange={v => onHF("headerLeft", v)} placeholder="Header left" />
          <EditableArea value={hf.headerCenter} onChange={v => onHF("headerCenter", v)} className="text-center" placeholder="Header center" />
          <EditableArea value={hf.headerRight} onChange={v => onHF("headerRight", v)} className="text-right" placeholder="Header right" />
        </div>
      </div>
      <div style={{ padding: "0.1in 1in", flex: 1 }}>{children}</div>
      <div style={{ padding: "0.1in 1in 0.5in 1in" }}>
        <div className="grid grid-cols-3 gap-1 text-gray-700">
          {(hf.showPageNumbers && hf.pageNumberPosition === "footer-left") ? (
              <EditableFooterZone value={hf.footerLeft} onChange={v => onHF("footerLeft", v)} pageNumber={pageNumber} className="text-left" placeholder="Page {PAGE}" />
          ): <EditableFooterZone value={hf.footerLeft} onChange={v => onHF("footerLeft", v)} pageNumber={pageNumber} className="text-left" placeholder="Footer left" />}
          {(hf.showPageNumbers && hf.pageNumberPosition === "footer-center") ? (
              <EditableFooterZone value={hf.footerCenter} onChange={v => onHF("footerCenter", v)} pageNumber={pageNumber} className="text-center" placeholder="Page {PAGE}" />
          ): <EditableFooterZone value={hf.footerCenter} onChange={v => onHF("footerCenter", v)} pageNumber={pageNumber} className="text-center" placeholder="Footer center" />}
          {(hf.showPageNumbers && hf.pageNumberPosition === "footer-right") ? (
              <EditableFooterZone value={hf.footerRight} onChange={v => onHF("footerRight", v)} pageNumber={pageNumber} className="text-right" placeholder="Page {PAGE}" />
          ): <EditableFooterZone value={hf.footerRight} onChange={v => onHF("footerRight", v)} pageNumber={pageNumber} className="text-right" placeholder="Footer right" />}
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
  onAddTable, onDeleteTable, onUpdateCell, onClickBlank, onDeleteBlank, children }: {
  section: SectionNode; depth: number; isOnlyTop: boolean; isSelected: boolean;
  fields: TemplateField[];
  onSelect: () => void;
  onUpdate: (u: Partial<SectionNode>) => void;
  onAddChild: () => void; onAddSibling: () => void; onDelete: () => void;
  onToggleLock: () => void;
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

  return (
    <div ref={setNodeRef} style={style} id={section.id}
      className={`relative ${section.locked ? "locked-overlay" : ""} ${isSelected ? "ring-2 ring-primary/30 rounded" : ""}`}
      onClick={e => { e.stopPropagation(); onSelect(); }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => { setHovered(false); setShowTableForm(false); }}>

      {/* Hover toolbar */}
      {hovered && (
        <div className="absolute -top-1 right-0 flex gap-1 bg-white border border-gray-200 rounded shadow-md px-1.5 py-1 z-20 text-xs whitespace-nowrap">
          {/* Drag handle */}
          <button {...attributes} {...listeners} className="drag-handle px-1 py-0.5 rounded flex items-center" title="Drag to reorder">
            <GripVertical className="h-3 w-3" />
          </button>
          <button onClick={onToggleLock} title={section.locked ? "Unlock section" : "Lock section"}
            className="hover:bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-1 text-gray-700">
            {section.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
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
        {section.locked && <Lock className="h-3 w-3 text-slate-400 shrink-0 mt-1" />}
        <span className="font-mono text-gray-400 shrink-0 text-sm select-none">{section.number}</span>
        <EditableText value={section.title} onChange={v => onUpdate({ title: v })} className={headingClass} placeholder="Section title..." disabled={section.locked} />
      </div>

      {/* Section body — uses SectionContent for blank rendering */}
      <div className="ml-8" style={{ marginLeft: `${depth * 16 + 32}px` }}>
        <SectionContent content={section.content} fields={fields} locked={section.locked}
          onClickBlank={onClickBlank} onDeleteBlank={onDeleteBlank}
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
          {section.locked && <Lock className="h-2.5 w-2.5 text-slate-400 shrink-0" />}
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
    ? { ...s, children: [...s.children, { id: `sec-${Date.now()}`, number: "", title: "New Subsection", content: "", locked: true, tables: [], children: [] }] }
    : { ...s, children: addChildSection(s.children, parentId) });
}

// Inserts a new section directly after the sibling at the same nesting level
function addSiblingHelper(sections: SectionNode[], siblingId: string): { sections: SectionNode[]; added: boolean } {
  for (let i = 0; i < sections.length; i++) {
    if (sections[i].id === siblingId) {
      const newSec: SectionNode = { id: `sec-${Date.now()}`, number: "", title: "New Section", content: "", locked: true, tables: [], children: [] };
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

// ============= MAIN COMPONENT (inner) =============
// Split from the default export so useSearchParams() can be wrapped in Suspense (required by Next.js).
// All document state, blank state, DnD state, and render functions live here.
function SowEditPageInner() {
  const searchParams = useSearchParams();

  // Build initial document state once with useMemo.
  // If ?setup= param is present (base64 JSON from the /new form), decode and override defaults.
  const defaultData: TemplateData = useMemo(() => {
    const base: TemplateData = {
      documentName: "Untitled Document",
      fields: [],
      coverPage: {
        title: "Statement of Work", projectNumber: "SOW-2026-001", clientName: "Product Name",
        building: "3001", location: "Norman, Oklahoma", preparedBy: "Your Name",
        department: "Department Name", date: new Date().toISOString().split("T")[0],
        version: "1.0", confidentiality: "Confidential",
      },
      headerFooter: {
        headerLeft: "Statement of Work\n3 February 2025", headerCenter: "", headerRight: "",
        footerLeft: "SOW-2026-001", footerCenter: "", footerRight: "Page {PAGE}",
        showPageNumbers: true, pageNumberPosition: "footer-right",
      },
      sections: [
        { id: "sec-1", number: "1.0", title: "Scope of Work", content: "", locked: true, tables: [],
          children: [
            { id: "sec-1-1", number: "1.1", title: "Scope", content: "The following establishes the minimum requirement for the purchase, delivery, and installation of {YOUR PRODUCT}. The contractor should {do these things} and {provide this service}.", locked: false, tables: [], children: [] },
            { id: "sec-1-2", number: "1.2", title: "Background", content: "The {items to be purchased} are intended to be used at {a location} for {a purpose}. {the items} shoud be delivered to {a location} ", locked: false, tables: [], children: [] },
          ]
        },
        { id: "sec-2", number: "2.0", title: "Applicable Standards", content: "Contractor, at a minimum, is required to comply with the current editions of the following requirements for design, construction, installation, and safety as applicable. The term “most recent edition” shall be understood to mean “most recently released edition as of date of issuance of contract.” ", locked: true, tables: [],
          children: [
            { id: "sec-2-1", number: "2.1", title: "Government Standards", content: "The following documents form a part of this purchase description to the extent stipulated herein.", locked: true, tables: [], children: [] },
            { id: "sec-2-2", number: "2.2", title: "Non-Government Standards", content: "The following documents form a part of this document to the extent stipulated herein. ", locked: true, tables: [], children: [] },
            { id: "sec-2-3", number: "2.3", title: "Order of Precedence", content: "", locked: true, tables: [], children: [] },
            { id: "sec-2-4", number: "2.4", title: "Applicable Standards", content: "", locked: true, tables: [], children: [] },
            { id: "sec-2-5", number: "2.5", title: "Prohibited Materials", content: "", locked: true, tables: [], children: [] },
            { id: "sec-2-6", number: "2.6", title: "Environmental Protection", content: "Under the operating, service, transportation and storage conditions described herein the machine shall not emit materials hazardous to the ecological system as prohibited by federal, state or local statutes in effect at the point of installation. ", locked: true, tables: [], children: [] },
          ]
        },
        { id: "sec-3", number: "3.0", title: "Written Submittals", content: "", locked: true, tables: [], children: [] },
        { id: "sec-4", number: "4.0", title: "Government Furnished Property and Services", content: "", locked: true, tables: [], children: [] },
      ],
    };


    const setupParam = searchParams.get("setup");
    if (setupParam) {
      try {
        const setup = JSON.parse(atob(setupParam));
        if (setup.documentName) base.documentName = setup.documentName;
        if (setup.title) base.coverPage.title = setup.title;
        if (setup.projectNumber) { base.coverPage.projectNumber = setup.projectNumber; base.headerFooter.footerLeft = setup.projectNumber; }
        if (setup.clientName) base.coverPage.clientName = setup.clientName;
        if (setup.building) base.coverPage.building = setup.building;
        if (setup.location) base.coverPage.location = setup.location;
        if (setup.preparedBy) base.coverPage.preparedBy = setup.preparedBy;
        if (setup.department) base.coverPage.department = setup.department;
        if (setup.date) {
          base.coverPage.date = setup.date;
          const d = new Date(setup.date + "T00:00:00");
          const formatted = d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
          base.headerFooter.headerLeft = `${setup.title || "Statement of Work"}\n${formatted}`;
        }
        if (setup.confidentiality) base.coverPage.confidentiality = setup.confidentiality;
        if (setup.description) base.sections[0].content = setup.description;
      } catch { /* use defaults */ }
    }
    const saved = localStorage.getItem("current_draft");
    if (saved) {
      try {
        const setup = JSON.parse(saved);
        
        if (setup.documentName) base.documentName = setup.documentName;
        if (setup.title) base.coverPage.title = setup.title;
        if (setup.projectNumber) { base.coverPage.projectNumber = setup.projectNumber; base.headerFooter.footerLeft = setup.projectNumber; }
        if (setup.clientName) base.coverPage.clientName = setup.clientName;
        if (setup.building) base.coverPage.building = setup.building;
        if (setup.location) base.coverPage.location = setup.location;
        if (setup.preparedBy) base.coverPage.preparedBy = setup.preparedBy;
        if (setup.department) base.coverPage.department = setup.department;
        if (setup.date) {
          base.coverPage.date = setup.date;
          const d = new Date(setup.date + "T00:00:00");
          const formatted = d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
          base.headerFooter.headerLeft = `${setup.title || "Statement of Work"}\n${formatted}`;
        }
        if (setup.confidentiality) base.coverPage.confidentiality = setup.confidentiality;
        if (setup.description) base.sections[0].content = setup.description;

        if (setup.sections) base.sections = setup.sections;

      } catch { /* use defaults */ }

    }

    return base;
  }, [searchParams]);

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
  const [blankOptions, setBlankOptions] = useState(""); // Comma-separated list for dropdown options
  const [blankRequired, setBlankRequired] = useState(false);

  // Blank editing state
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  // ── Ribbon state ──
  const [activeTab, setActiveTab] = useState<RibbonTab>("home");
  const [formatState, setFormatState] = useState({ 
    bold: false, italic: false, underline: false, strikethrough: false,
    fontName: "Arial", fontSize: "3",
  });
  const [textColor, setTextColor] = useState("#000000");
  const [highlightColor, setHighlightColor] = useState("#ffff00");
  const savedSelectionRef = useRef<Range | null>(null);

  const selectedSection = selectedSectionId ? findSection(data.sections, selectedSectionId) : null;

  // Track formatting state at cursor via selectionchange
  useEffect(() => {
    const handleSelectionChange = () => {
      setFormatState({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strikethrough: document.queryCommandState("strikeThrough"),
        fontName: document.queryCommandValue("fontName")?.replace(/['"]/g, "") || "Arial",
        fontSize: document.queryCommandValue("fontSize") || "3",
      });

      // Maintain a persistent reference to the last text selection inside the editor
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        let node = sel.anchorNode;
        let isEditor = false;
        while (node && node.nodeName !== 'BODY') {
          if ((node as Element).hasAttribute && (node as Element).hasAttribute('contenteditable')) {
             isEditor = true; 
             break;
          }
          node = node.parentNode;
        }
        if (isEditor) {
          savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
        }
      }
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  // Save current selection (for restoring after dropdown interactions)
  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
  }, []);
  const restoreSelection = useCallback(() => {
    const range = savedSelectionRef.current;
    if (range) { const sel = window.getSelection(); if (sel) { sel.removeAllRanges(); sel.addRange(range); } }
  }, []);

  // Execute formatting command on the current selection
  const handleFormat = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    setFormatState({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikethrough: document.queryCommandState("strikeThrough"),
      fontName: document.queryCommandValue("fontName")?.replace(/['"]/g, "") || "Arial",
      fontSize: document.queryCommandValue("fontSize") || "3",
    });
  }, []);

  // Global keyboard shortcut: Cmd/Ctrl+S to save document
  // (handleSave is defined below, so we use a ref to avoid stale closure)
  const handleSaveRef = useRef<() => void>(() => {});

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

  // Save / Load / Export
  // handleSave serializes state to JSON and triggers a browser file download — no server involved
  function handleSave() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.documentName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
  }
  handleSaveRef.current = handleSave;

  // Global Cmd/Ctrl+S shortcut to save document
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveRef.current();
      }
    };
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // handleLoadJSON opens a file picker, reads the JSON file, and replaces the current document
  function handleLoadJSON() {
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
      options: blankType === "dropdown" ? blankOptions.split(",").map(s => s.trim()).filter(Boolean) : undefined,
    };

    if (savedSelectionRef.current) {
       restoreSelection();
       const fieldHtml = `<span contenteditable="false" class="blank-chip" data-id="${fieldId}" data-type="${blankType}"><span>${blankLabel.trim()}</span><span class="opacity-60 text-[10px]" style="pointer-events: none;">(${blankType})</span></span>&nbsp;`;
       document.execCommand("insertHTML", false, fieldHtml);
       setData(p => ({ ...p, fields: [...p.fields, newField] }));
    } else {
       setData(p => {
         const sec = findSection(p.sections, selectedSectionId);
         const newContent = sec ? (sec.content ? sec.content + ` {{${fieldId}}}` : `{{${fieldId}}}`) : "";
         return {
           ...p,
           fields: [...p.fields, newField],
           sections: updateSection(p.sections, selectedSectionId, { content: newContent }),
         };
       });
    }

    setBlankLabel(""); setBlankPlaceholder(""); setBlankRequired(false); setBlankOptions("");
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
          const onToggleLock = () => setData(p => ({ ...p, sections: updateSection(p.sections, section.id, { locked: !section.locked }) }));
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
              onDelete={onDelete} onToggleLock={onToggleLock}
              onAddTable={onAddTable} onDeleteTable={onDeleteTable} onUpdateCell={onUpdateCell}
              onClickBlank={id => setEditingFieldId(id)} onDeleteBlank={handleDeleteBlank}>
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

  // ============= RENDER =============
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        {/* Slim header — just sidebar trigger + doc name */}
        <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4 bg-background sticky top-0 z-10">
          <div className="flex items-center gap-2">
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
              {/* ── Microsoft Word-Style Ribbon ── */}
              {/* ── Microsoft Word-Style Ribbon ── */}
              <Tabs value={activeTab} onValueChange={v => setActiveTab(v as RibbonTab)} className="editor-ribbon sticky top-0 z-30 shrink-0 bg-background border-b focus-visible:outline-none focus:outline-none">
                {/* Tab bar */}
                <div className="flex items-center px-2 bg-muted/10">
                  <TabsList className="bg-transparent border-none p-0 h-auto gap-0 rounded-none focus-visible:outline-none focus:outline-none">
                    {(["home", "insert", "layout"] as RibbonTab[]).map(tab => (
                      <TabsTrigger key={tab} value={tab}
                        className="rounded-none border-t-0 border-x-0 border-b-2 border-b-transparent data-[state=active]:border-b-primary data-[state=active]:bg-background data-[state=active]:shadow-none outline-none ring-0 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none px-4 py-1.5 text-[11px] uppercase tracking-wide font-medium">
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <div className="flex-1" />
                  {selectedSection && (
                    <div className="flex items-center gap-1 px-3 text-xs text-muted-foreground self-center">
                      <span className="font-mono">{selectedSection.number}</span>
                      <span className="truncate max-w-[200px]">{selectedSection.title}</span>
                    </div>
                  )}
                </div>

                {/* Active tab content */}
                <div className="ribbon-content flex flex-row items-stretch px-2 py-1 bg-background" style={{ minHeight: '68px' }}>
                  <TabsContent value="home" className="flex flex-row items-stretch gap-1 m-0 focus-visible:outline-none">
                      <RibbonGroup label="Clipboard">
                        <RibbonBtn icon={Undo2} label="Undo" onClick={() => handleFormat("undo")} />
                        <RibbonBtn icon={Redo2} label="Redo" onClick={() => handleFormat("redo")} />
                      </RibbonGroup>

                      <RibbonGroup label="Font">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <Select value={FONT_FAMILIES.includes(formatState.fontName) ? formatState.fontName : "Arial"} onValueChange={v => { restoreSelection(); handleFormat("fontName", v); }}>
                              <SelectTrigger className="w-[120px] h-7! px-2 text-[11px] rounded-md focus:ring-0 focus-visible:ring-0 shadow-none border-input hover:bg-accent">
                                <SelectValue placeholder="Font" />
                              </SelectTrigger>
                              <SelectContent>
                                {FONT_FAMILIES.map(f => (
                                  <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <FontSizeInput formatState={formatState} restoreSelection={restoreSelection} handleFormat={handleFormat} />
                          </div>
                          <div className="flex items-center gap-0.5">
                            <RibbonBtn icon={Bold} label="Bold" onClick={() => handleFormat("bold")} active={formatState.bold} />
                            <RibbonBtn icon={Italic} label="Italic" onClick={() => handleFormat("italic")} active={formatState.italic} />
                            <RibbonBtn icon={Underline} label="Underline" onClick={() => handleFormat("underline")} active={formatState.underline} />
                            <RibbonBtn icon={Strikethrough} label="Strike" onClick={() => handleFormat("strikeThrough")} active={formatState.strikethrough} />
                            <div className="ribbon-color-btn" title="Text color">
                              <Type className="h-4 w-4" />
                              <div className="ribbon-color-swatch" style={{ background: textColor }} />
                              <input type="color" className="ribbon-color-input" value={textColor}
                                onMouseDown={saveSelection}
                                onChange={e => { setTextColor(e.target.value); restoreSelection(); handleFormat("foreColor", e.target.value); }} />
                            </div>
                            <div className="ribbon-color-btn" title="Highlight">
                              <Highlighter className="h-4 w-4" />
                              <div className="ribbon-color-swatch" style={{ background: highlightColor }} />
                              <input type="color" className="ribbon-color-input" value={highlightColor}
                                onMouseDown={saveSelection}
                                onChange={e => { setHighlightColor(e.target.value); restoreSelection(); handleFormat("hiliteColor", e.target.value); }} />
                            </div>
                          </div>
                        </div>
                      </RibbonGroup>

                      <RibbonGroup label="Paragraph">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-0.5">
                            <RibbonBtn icon={AlignLeft} label="Left" onClick={() => handleFormat("justifyLeft")} />
                            <RibbonBtn icon={AlignCenter} label="Center" onClick={() => handleFormat("justifyCenter")} />
                            <RibbonBtn icon={AlignRight} label="Right" onClick={() => handleFormat("justifyRight")} />
                            <RibbonBtn icon={AlignJustify} label="Justify" onClick={() => handleFormat("justifyFull")} />
                          </div>
                          <div className="flex items-center gap-0.5">
                            <RibbonBtn icon={List} label="Bullets" onClick={() => handleFormat("insertUnorderedList")} />
                            <RibbonBtn icon={ListOrdered} label="Numbers" onClick={() => handleFormat("insertOrderedList")} />
                            <RibbonBtn icon={IndentDecrease} label="Outdent" onClick={() => handleFormat("outdent")} />
                            <RibbonBtn icon={IndentIncrease} label="Indent" onClick={() => handleFormat("indent")} />
                          </div>
                        </div>
                      </RibbonGroup>

                      <RibbonGroup label="Section">
                        <RibbonBtn icon={selectedSection?.locked ? Lock : Unlock}
                          label={selectedSection?.locked ? "Locked" : "Unlocked"}
                          active={selectedSection?.locked}
                          disabled={!selectedSection}
                          onClick={() => {
                            if (!selectedSectionId) return;
                            setData(p => ({ ...p, sections: updateSection(p.sections, selectedSectionId, { locked: !selectedSection?.locked }) }));
                          }} />
                      </RibbonGroup>

                  </TabsContent>

                  <TabsContent value="insert" className="flex flex-row items-stretch gap-1 m-0 focus-visible:outline-none">
                      <RibbonGroup label="Sections">
                        <RibbonBtn icon={Plus} label="Section" onClick={() => setData(p => ({
                          ...p, sections: renumberSections([...p.sections, { id: `sec-${Date.now()}`, number: "", title: "New Section", content: "", locked: true, tables: [], children: [] }])
                        }))} />
                        <RibbonBtn icon={Plus} label="Sub" disabled={!selectedSection}
                          onClick={() => {
                            if (!selectedSectionId) return;
                            setData(p => ({ ...p, sections: renumberSections(addChildSection(p.sections, selectedSectionId)) }));
                            setExpandedIds(p => new Set([...p, selectedSectionId]));
                          }} />
                      </RibbonGroup>

                      <RibbonGroup label="Content">
                        <RibbonBtn icon={PlusCircle} label="Blank" disabled={!selectedSection}
                          onClick={() => setShowBlankForm(true)} />
                        <RibbonBtn icon={TableIcon} label="Table" disabled={!selectedSection}
                          onClick={() => {
                            if (!selectedSectionId) return;
                            const sec = findSection(data.sections, selectedSectionId);
                            if (sec) {
                              const newTable: TableData = { id: `t-${Date.now()}`, rows: 3, cols: 3, data: Array(3).fill(null).map(() => Array(3).fill("")) };
                              setData(p => ({ ...p, sections: updateSection(p.sections, selectedSectionId, { tables: [...(sec.tables || []), newTable] }) }));
                            }
                          }} />
                        <RibbonBtn icon={Minus} label="Rule" onClick={() => handleFormat("insertHorizontalRule")} />
                      </RibbonGroup>

                      <RibbonGroup label="File">
                        <RibbonBtn icon={Save} label="Save" onClick={handleSave} />
                        <RibbonBtn icon={Upload} label="Load" onClick={handleLoadJSON} />
                        <RibbonBtn icon={Download} label="Export" onClick={handleExport} />
                      </RibbonGroup>

                  </TabsContent>

                  <TabsContent value="layout" className="flex flex-row items-stretch gap-1 m-0 focus-visible:outline-none">
                      <RibbonGroup label="Structure">
                        <RibbonBtn icon={Trash2} label="Delete" danger disabled={!selectedSection || data.sections.length === 1}
                          onClick={() => {
                            if (!selectedSectionId || !confirm("Delete this section?")) return;
                            setData(p => ({ ...p, sections: renumberSections(deleteSection(p.sections, selectedSectionId)) }));
                            setSelectedSectionId(null);
                          }} />
                        <RibbonBtn icon={selectedSection?.locked ? Lock : Unlock}
                          label={selectedSection?.locked ? "Locked" : "Unlocked"}
                          active={selectedSection?.locked}
                          disabled={!selectedSection}
                          onClick={() => {
                            if (!selectedSectionId) return;
                            setData(p => ({ ...p, sections: updateSection(p.sections, selectedSectionId, { locked: !selectedSection?.locked }) }));
                          }} />
                      </RibbonGroup>

                      <RibbonGroup label="Formatting">
                        <RibbonBtn icon={Eraser} label="Clear" onClick={() => handleFormat("removeFormat")} />
                      </RibbonGroup>
                  </TabsContent>
                </div>
              </Tabs>

              {/* ── Insert Blank Form (shown below ribbon) ── */}
              {showBlankForm && (
                <div className="bg-muted/50 border-b px-4 py-3 flex items-end gap-3 shrink-0">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Label *</label>
                    <Input value={blankLabel} onChange={e => setBlankLabel(e.target.value)} placeholder="e.g. Project Name" className="h-8 w-40 text-sm" autoFocus />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Type</label>
                    <select value={blankType} onChange={e => setBlankType(e.target.value as FieldType)}
                      className="h-8 rounded border border-input bg-background px-2 text-sm">
                      {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Placeholder</label>
                    <Input value={blankPlaceholder} onChange={e => setBlankPlaceholder(e.target.value)} placeholder="Hint text..." className="h-8 w-32 text-sm" />
                  </div>
                  {blankType === "dropdown" && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-medium text-muted-foreground uppercase">Options</label>
                      <Input value={blankOptions} onChange={e => setBlankOptions(e.target.value)} placeholder="Comma separated..." className="h-8 w-40 text-sm" />
                    </div>
                  )}
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={blankRequired} onChange={e => setBlankRequired(e.target.checked)} className="rounded" />
                    Required
                  </label>
                  <Button size="sm" className="h-8 gap-1" onClick={handleInsertBlank} disabled={!blankLabel.trim()}>
                    <Check className="h-3 w-3" /> Insert
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowBlankForm(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* ── Edit Blank Properties (shown below ribbon when editing a blank) ── */}
              {editingField && (
                <div className="bg-blue-50/50 dark:bg-blue-950/20 border-b px-4 py-3 flex items-end gap-3 shrink-0">
                  <div className="text-xs font-medium text-muted-foreground flex items-center gap-1 mr-2">
                    Editing blank:
                    <span className="blank-chip" data-type={editingField.type} style={{ cursor: "default" }}>
                      {editingField.label} ({editingField.type})
                    </span>
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
                  {editingField.type === "dropdown" && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-medium text-muted-foreground uppercase">Options</label>
                      <Input value={editingField.options?.join(", ") || ""} onChange={e => handleUpdateField(editingField.id, { options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} placeholder="Comma separated..." className="h-8 w-40 text-sm" />
                    </div>
                  )}
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
                        <div className="flex items-baseline justify-center gap-2 mt-4">
                          <span className="text-3xl font-semibold select-none">BUILDING</span>
                          <EditableText value={data.coverPage.building} onChange={v => updateCover("building", v)} className="text-3xl font-semibold" placeholder="#" />
                        </div>
                        <div className="mt-16 space-y-3">
                          <EditableText value={data.coverPage.location} onChange={v => updateCover("location", v)} className="text-xl" placeholder="Location" />
                          <p className="text-lg font-semibold mt-4 select-none">Prepared by</p>
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
                    <button onClick={() => setData(p => ({
                      ...p, sections: renumberSections([...p.sections, { id: `sec-${Date.now()}`, number: "", title: "New Section", content: "", locked: true, tables: [], children: [] }])
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
  if (sessionData?.user.role !== "ADMIN"){
    router.push("/");
  }


  return (
    <div>
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading editor...</div>}>
        <SowEditPageInner />
      </Suspense>
    </div>
  );
}
