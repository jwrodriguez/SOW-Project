"use client";

import React, { Suspense, useMemo, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Save, Download, FileText, ChevronRight, ChevronDown, Lock, ChevronLeft, CheckCircle2, Circle } from "lucide-react";
import type { TemplateData, SectionNode, TemplateField, HeaderFooterData } from "@/types/pageTypes";

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

// ─── TOC generator ───────────────────────────────────────────────────────────
// Builds a flat list of TOC entries from the section tree for Page 2.
// Page numbers are estimates based on section count, not actual rendered height.
function generateTOCEntries(sections: SectionNode[], depth = 0, startPage = 3) {
  const entries: Array<{ number: string; title: string; page: number; depth: number }> = [];
  let page = startPage;
  for (const s of sections) {
    entries.push({ number: s.number, title: s.title, page, depth });
    page++;
    if (s.children.length > 0) {
      const r = generateTOCEntries(s.children, depth + 1, page);
      entries.push(...r.entries);
      page = r.nextPage;
    }
  }
  return { entries, nextPage: page };
}

// ─── Inline blank input ───────────────────────────────────────────────────────
// Renders a single blank field as an inline input inside section text.
// Engineers type directly into these - no colored chip, just a clean input.
function BlankInput({ field, value, onChange }: {
  field: TemplateField;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder || field.label}
      title={field.label}
      className="inline-block border-b border-primary/60 bg-primary/5 text-primary rounded px-1 py-0.5 text-sm min-w-[80px] max-w-[240px] outline-none focus:border-primary focus:bg-primary/10 transition-colors"
      style={{ width: `${Math.max(80, (value.length || field.label.length) * 8)}px` }}
    />
  );
}

// ─── Section content renderer ─────────────────────────────────────────────────
// Parses section content for {{field_id}} tokens. Locked sections render
// tokens as fillable BlankInputs but cannot edit surrounding text.
// Unlocked sections are fully editable text areas, with blanks still inline.
function EngineerSectionContent({ content, fields, fieldValues, locked, onChangeContent, onChangeField }: {
  content: string;
  fields: TemplateField[];
  fieldValues: Record<string, string>;
  locked: boolean;
  onChangeContent: (v: string) => void;
  onChangeField: (fieldId: string, value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const fieldMap = useMemo(() => new Map(fields.map(f => [f.id, f])), [fields]);

  // Parse content string into text and {{field_id}} segments
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

  // Renders the content with blank inputs inline
  const renderedContent = (
    <div className="whitespace-pre-wrap text-sm leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.type === "text") return <span key={i}>{seg.value}</span>;
        const field = fieldMap.get(seg.fieldId);
        if (!field) return <span key={i} className="text-red-400 text-xs">[unknown field]</span>;
        return (
          <BlankInput
            key={i}
            field={field}
            value={fieldValues[seg.fieldId] ?? field.defaultValue ?? ""}
            onChange={v => onChangeField(seg.fieldId, v)}
          />
        );
      })}
      {!content && (
        <span className="text-gray-400 italic text-sm">No content in this section.</span>
      )}
    </div>
  );

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

// ─── Engineer section block ───────────────────────────────────────────────────
// Renders one section for the engineer. No hover toolbars, no add/delete/reorder.
// Locked sections show a lock icon and are not editable (except their blanks).
// Heading size scales with depth like the admin editor.
function EngineerSectionBlock({ section, depth, fields, fieldValues, onChangeContent, onChangeField, children }: {
  section: SectionNode;
  depth: number;
  fields: TemplateField[];
  fieldValues: Record<string, string>;
  onChangeContent: (sectionId: string, value: string) => void;
  onChangeField: (fieldId: string, value: string) => void;
  children?: React.ReactNode;
}) {
  const headingClass = depth === 0 ? "text-2xl font-bold" : depth === 1 ? "text-xl font-semibold" : "text-lg font-medium";
  const indent = depth * 16;

  return (
    <div id={section.id} style={{ marginLeft: `${indent}px`, marginBottom: depth === 0 ? "2rem" : "1.25rem" }}>
      {/* Section heading - read-only for engineers, lock icon shown when locked */}
      <div className="flex items-baseline gap-2 mb-1">
        {section.locked && <Lock className="h-3 w-3 text-slate-400 shrink-0 mt-1" />}
        <span className="font-mono text-gray-400 shrink-0 text-sm select-none">{section.number}</span>
        <span className={headingClass}>{section.title}</span>
      </div>

      {/* Section body */}
      <div style={{ marginLeft: `${32}px` }}>
        <EngineerSectionContent
          content={section.content}
          fields={fields}
          fieldValues={fieldValues}
          locked={section.locked}
          onChangeContent={v => onChangeContent(section.id, v)}
          onChangeField={onChangeField}
        />
      </div>

      {/* Tables - read-only for engineers */}
      {section.tables && section.tables.length > 0 && (
        <div style={{ marginLeft: `${32}px` }} className="mt-3 space-y-4">
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
  // Resolve {PAGE} token in footer zones
  const resolve = (text: string) => text.replace("{PAGE}", String(pageNumber));

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

// ─── Section helpers ──────────────────────────────────────────────────────────

// Updates section content in the tree by section ID
function updateSectionContent(sections: SectionNode[], id: string, content: string): SectionNode[] {
  return sections.map(s =>
    s.id === id
      ? { ...s, content }
      : { ...s, children: updateSectionContent(s.children, id, content) }
  );
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
  const filledCount = questions.filter(q => (fieldValues[q.field.id] ?? q.field.defaultValue ?? "").trim() !== "").length;
  const isFilled = value.trim() !== "";

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && activeIndex < questions.length - 1) {
      e.preventDefault();
      onChangeIndex(activeIndex + 1);
    }
  }

  return (
    <div className="shrink-0 border-b bg-background/95 backdrop-blur px-4 py-3 z-20">
      {/* Top row - question counter, section badge, progress */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Dropdown to jump to any question */}
          <select
            value={activeIndex}
            onChange={e => onChangeIndex(Number(e.target.value))}
            className="text-xs border border-input rounded px-2 py-1 bg-background outline-none focus:border-primary cursor-pointer"
          >
            {questions.map((q, i) => (
              <option key={q.field.id} value={i}>
                Q{i + 1} - {q.sectionNumber} {q.field.label}
              </option>
            ))}
          </select>
          {/* Section context badge */}
          <span className="text-xs bg-primary/10 text-primary font-mono px-2 py-0.5 rounded">
            {current.sectionNumber}
          </span>
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
            {current.sectionTitle}
          </span>
        </div>
        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          {isFilled
            ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            : <Circle className="h-3.5 w-3.5 text-muted-foreground" />
          }
          <span className={`text-xs font-medium ${filledCount === questions.length ? "text-green-600" : "text-muted-foreground"}`}>
            {filledCount}/{questions.length} answered
          </span>
        </div>
      </div>

      {/* Bottom row - question label, input, prev/next */}
      <div className="flex items-center gap-3">
        {/* Prev button */}
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2 shrink-0"
          disabled={activeIndex === 0}
          onClick={() => onChangeIndex(activeIndex - 1)}
          title="Previous question"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Question label + input */}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <label className="text-sm font-medium shrink-0 flex items-center gap-1">
            {current.field.required && <span className="text-destructive text-xs">*</span>}
            {current.field.label}
          </label>
          {current.field.type === "paragraph" ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={value}
              onChange={e => onChangeField(current.field.id, e.target.value)}
              placeholder={current.field.placeholder || `Enter ${current.field.label.toLowerCase()}...`}
              rows={2}
              className="flex-1 border border-input rounded px-3 py-1.5 text-sm bg-background outline-none focus:border-primary resize-none"
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type={current.field.type === "number" ? "number" : current.field.type === "date" ? "date" : "text"}
              value={value}
              onChange={e => onChangeField(current.field.id, e.target.value)}
              onKeyDown={handleKey}
              placeholder={current.field.placeholder || `Enter ${current.field.label.toLowerCase()}...`}
              className="flex-1 h-8 border border-input rounded px-3 text-sm bg-background outline-none focus:border-primary"
            />
          )}
          {current.field.type !== "paragraph" && (
            <span className="text-xs text-muted-foreground shrink-0">
              Press Enter for next
            </span>
          )}
        </div>

        {/* Next button */}
        <Button
          size="sm"
          variant={activeIndex < questions.length - 1 ? "outline" : "default"}
          className="h-8 px-3 shrink-0"
          disabled={activeIndex === questions.length - 1}
          onClick={() => onChangeIndex(activeIndex + 1)}
          title="Next question"
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
    const draftParam = searchParams.get("draft");
    if (draftParam) {
      try {
        return JSON.parse(atob(draftParam)) as TemplateData;
      } catch {
        // fall through to default
      }
    }
    
    // const saved = localStorage.getItem("current_draft");
    // if (saved) {
    //   try {
    //     return JSON.parse(saved) as TemplateData;

    //   } catch { // use defaults }
    // }
    return DEFAULT_TEMPLATE;
    
  }, [searchParams]);

  // Template structure - engineers cannot change this, only their content edits and field values
  const [data, setData] = useState<TemplateData>(initialData);

  // Field values - maps field ID to the string the engineer typed in.
  // Stored separately from the template so we can merge on save.
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    initialData.fields.forEach(f => { if (f.defaultValue) initial[f.id] = f.defaultValue; });
    return initial;
  });

  // Navigator expand/collapse state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(initialData.sections.map(s => s.id))
  );

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

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Updates an unlocked section's content text
  function handleChangeContent(sectionId: string, value: string) {
    setData(p => ({ ...p, sections: updateSectionContent(p.sections, sectionId, value) }));
  }

  // Updates a single field value the engineer typed into a blank
  function handleChangeField(fieldId: string, value: string) {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  }

  // Saves a draft by merging field values back into the template fields
  // and downloading the result as a JSON file the engineer can reload later.
  function handleSave() {
    const merged: TemplateData = {
      ...data,
      fields: data.fields.map(f => ({
        ...f,
        defaultValue: fieldValues[f.id] ?? f.defaultValue,
      })),
    };
    const blob = new Blob([JSON.stringify(merged, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.documentName.replace(/\s+/g, "-").toLowerCase()}-draft-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Loads a previously saved draft JSON file
  function handleLoad() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const loaded = JSON.parse(ev.target?.result as string) as TemplateData;
          setData(loaded);
          const values: Record<string, string> = {};
          loaded.fields.forEach(f => { if (f.defaultValue) values[f.id] = f.defaultValue; });
          setFieldValues(values);
          setExpandedIds(new Set(loaded.sections.map(s => s.id)));
        } catch {
          alert("Invalid draft file.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // Recursively renders sections for the document page
  function renderSections(sections: SectionNode[], depth = 0): React.ReactNode {
    return sections.map(section => (
      <EngineerSectionBlock
        key={section.id}
        section={section}
        depth={depth}
        fields={data.fields}
        fieldValues={fieldValues}
        onChangeContent={handleChangeContent}
        onChangeField={handleChangeField}
      >
        {section.children.length > 0 && renderSections(section.children, depth + 1)}
      </EngineerSectionBlock>
    ));
  }

  // Renders the left navigator panel - click to scroll, expand/collapse
  function renderNav(sections: SectionNode[], depth = 0): React.ReactNode {
    return sections.map(section => {
      const hasChildren = section.children.length > 0;
      const isExpanded = expandedIds.has(section.id);
      return (
        <div key={section.id}>
          <button
            onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="w-full flex items-center gap-1 rounded px-2 py-1.5 text-left text-xs hover:bg-muted transition-colors"
            style={{ paddingLeft: `${8 + depth * 12}px` }}
          >
            {hasChildren ? (
              <span onClick={e => { e.stopPropagation(); toggleExpand(section.id); }}
                className="cursor-pointer hover:bg-accent rounded p-0.5 inline-flex shrink-0">
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </span>
            ) : (
              <div className="w-4 shrink-0" />
            )}
            {section.locked && <Lock className="h-2.5 w-2.5 text-slate-400 shrink-0" />}
            <span className="font-mono text-gray-400 min-w-[35px] shrink-0">{section.number}</span>
            <span className="truncate">{section.title}</span>
          </button>
          {hasChildren && isExpanded && renderNav(section.children, depth + 1)}
        </div>
      );
    });
  }

  const tocData = generateTOCEntries(data.sections);

  // Count how many blanks still need to be filled
  const totalBlanks = data.fields.length;
  const filledBlanks = data.fields.filter(f => (fieldValues[f.id] ?? f.defaultValue ?? "").trim() !== "").length;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">

        {/* Header */}
        <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4 bg-background sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">{data.documentName}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Blank completion indicator */}
            {totalBlanks > 0 && (
              <span className={`text-xs ${filledBlanks === totalBlanks ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                {filledBlanks}/{totalBlanks} fields filled
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleLoad}>
              <Download className="h-4 w-4 mr-1" /> Load Draft
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" /> Save Draft
            </Button>
          </div>
        </header>

        {/* Questionnaire bar - sits below the main header, above the document */}
        {questions.length > 0 && (
          <QuestionnaireBar
            questions={questions}
            activeIndex={activeQuestionIndex}
            fieldValues={fieldValues}
            onChangeField={handleChangeField}
            onChangeIndex={handleChangeQuestionIndex}
          />
        )}

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

          {/* Right: document pages */}
          <div className="flex-1 overflow-y-auto bg-gray-200 p-8">
            <div className="space-y-8">

              {/* Cover page - read-only for engineers */}
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
                </div>
              </div>

              {/* Table of Contents */}
              <DocumentPage hf={data.headerFooter} pageNumber={2}>
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

              {/* Section content */}
              <DocumentPage hf={data.headerFooter} pageNumber={3}>
                {data.sections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center gap-2">
                    <p className="text-sm text-muted-foreground">No sections loaded.</p>
                    <p className="text-xs text-muted-foreground">Load a saved draft using the button in the toolbar.</p>
                  </div>
                ) : (
                  renderSections(data.sections)
                )}
              </DocumentPage>

            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

// Suspense wrapper required by Next.js when using useSearchParams
export default function SowEngineerPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-sm text-muted-foreground">Loading...</div>}>
      <SowEngineerPageInner />
    </Suspense>
  );
}