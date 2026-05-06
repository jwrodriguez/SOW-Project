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
import { Grid2X2Plus, SquarePlus, Trash2, Type, Save, Download, FileText, ChevronRight, ChevronDown, Lock, ChevronLeft, CheckCircle2, Circle, FileDown, Plane } from "lucide-react";
import type { TemplateData, SectionNode, TemplateField, HeaderFooterData } from "@/types/pageTypes";
import { getGlobalTemplate } from "@/lib/db-pullTemp";

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
      id: "sec-1", number: "1.0", title: "Scope of Work", content: "", lockEdit: true, lockDelete: true, lockAddTable: true, lockAddSections: true, tables: [],
      children: [
        // Unlocked - engineer edits freely. Blanks here are still filled via the questionnaire.
        {
          id: "sec-1-1", number: "1.1", title: "Scope", lockEdit: false, lockDelete: false, lockAddTable: false, lockAddSections: false, tables: [], children: [],
          content: "The following establishes the minimum requirement for the purchase, delivery, and installation of {{field_product_name_001}}. The contractor should {{field_contractor_tasks_002}} and {{field_contractor_service_003}}.",
        },
        {
          id: "sec-1-2", number: "1.2", title: "Background", lockEdit: false, lockDelete: false, lockAddTable: false, lockAddSections: false, tables: [], children: [],
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

// ─── Questionnaire helpers ────────────────────────────────────────────────────

// Represents one question in the questionnaire bar - a blank field with
// the section context it belongs to so the bar can show where it lives.
type QuestionItem = {
  field: TemplateField | null;  // null when this is an unlocked section question
  sectionId: string;
  sectionNumber: string;
  sectionTitle: string;
  lockDelete: boolean;
  isUnlockedSection?: boolean; // true = "do you need this section?" prompt
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
      // Soft-deleted sections are invisible to the engineer — skip entirely
      if (section.deleted) continue;
      // Add unlocked sections (where engineer edits freely) as a
      // "do you need this section?" question ONLY when the admin designed
      // them as optional. Engineer-created sections (engineerCreated: true)
      // are always intentional additions — never ask to remove them.
      if (!section.lockDelete && !section.engineerCreated) {
        const seenKey = `__section__${section.id}`;
        if (!seen.has(seenKey)) {
          seen.add(seenKey);
          questions.push({
            field: null,
            sectionId: section.id,
            sectionNumber: section.number,
            sectionTitle: section.title,
            lockDelete: false,
            isUnlockedSection: true,
          });
        }
      }
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
            lockDelete: section.lockDelete,
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
function QuestionnaireBar({ questions, activeIndex, fieldValues, onChangeField, onChangeIndex, onDeleteSection, deletedSections, onRestoreSection }: {
  questions: QuestionItem[];
  activeIndex: number;
  fieldValues: Record<string, string>;
  onChangeField: (fieldId: string, value: string) => void;
  onChangeIndex: (index: number) => void;
  onDeleteSection: (sectionId: string) => void;
  deletedSections: SectionNode[];
  onRestoreSection: (sectionId: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Controls the "Removed sections" restore dropdown inside the ribbon
  const [showRestoreDropdown, setShowRestoreDropdown] = useState(false);

  // Focus the input whenever the active question changes
  useEffect(() => {
    inputRef.current?.focus();
    setShowDeleteConfirm(false);
  }, [activeIndex]);

  if (questions.length === 0) return null;

  const current = questions[activeIndex];
  const value = current.field ? (fieldValues[current.field.id] ?? current.field.defaultValue ?? "") : "";
  const isFilled = current.isUnlockedSection ? true : value.trim() !== "";
  // Compute answered/skipped status for every question for the dot tracker
  const statuses = questions.map((q, i) => {
    if (q.isUnlockedSection) return i === activeIndex ? "active" : "answered";
    const v = (fieldValues[q.field!.id] ?? q.field!.defaultValue ?? "").trim();
    if (i === activeIndex) return "active";
    if (v !== "") return "answered";
    return "skipped";
  });

  const filledCount = statuses.filter(s => s === "answered").length;
  const skippedCount = statuses.filter(s => s === "skipped" || (s === "active" && value.trim() === "")).length;
  const allDone = filledCount === questions.length || (filledCount === questions.length - 1 && value.trim() !== "");

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && activeIndex < questions.length - 1) {
      e.preventDefault();
      onChangeIndex(activeIndex + 1);
    }
  }

  // Finds the next unanswered question after the current index for the Skip button
  function findNextSkipped(): number | null {
    for (let i = activeIndex + 1; i < questions.length; i++) {
      if (questions[i].isUnlockedSection) continue;
      const v = (fieldValues[questions[i].field!.id] ?? questions[i].field!.defaultValue ?? "").trim();
      if (v === "") return i;
    }
    for (let i = 0; i < activeIndex; i++) {
      if (questions[i].isUnlockedSection) continue;
      const v = (fieldValues[questions[i].field!.id] ?? questions[i].field!.defaultValue ?? "").trim();
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
                    const v = q.field ? (fieldValues[q.field.id] ?? q.field.defaultValue ?? "").trim() : "";
                    const label = q.isUnlockedSection ? `Section: ${q.sectionTitle}` : q.field!.label;
                    const key = q.isUnlockedSection ? `__section__${q.sectionId}` : q.field!.id;
                    return (
                      <option key={key} value={i}>
                        {q.isUnlockedSection ? "?" : v !== "" ? "✓" : "○"} {label}
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

        {/* Progress summary + restore dropdown — grouped on the right */}
        <div className="flex items-center gap-3">
          {/* Restore removed sections dropdown — only shown when sections have been removed */}
          {deletedSections.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowRestoreDropdown(p => !p)}
                className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-full px-2.5 py-1 transition-colors"
                title="Restore a removed section"
              >
                <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-500 text-white text-[9px] font-bold leading-none">
                  {deletedSections.length}
                </span>
                Removed
                {showRestoreDropdown ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>

              {/* Dropdown panel — floats below the button */}
              {showRestoreDropdown && (
                <div className="absolute right-0 top-full mt-1.5 z-50 bg-background border border-amber-200 rounded-lg shadow-lg min-w-[220px] overflow-hidden">
                  <div className="px-3 py-2 border-b border-amber-100 bg-amber-50">
                    <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">Removed sections</span>
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {deletedSections.map(s => (
                      <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-amber-50 transition-colors">
                        <span className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="font-mono text-[10px] text-amber-500 shrink-0">{s.number}</span>
                          <span className="text-xs text-foreground truncate">{s.title}</span>
                        </span>
                        <button
                          onClick={() => {
                            onRestoreSection(s.id);
                            if (deletedSections.length === 1) setShowRestoreDropdown(false);
                          }}
                          className="text-[10px] font-semibold text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded shrink-0 transition-colors"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Progress summary */}
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
            key={questions[i].isUnlockedSection ? `__section__${questions[i].sectionId}` : questions[i].field!.id}
            onClick={() => onChangeIndex(i)}
            title={`Q${i + 1}: ${questions[i].isUnlockedSection ? questions[i].sectionTitle : questions[i].field!.label} - ${status === "answered" ? "answered" : status === "active" ? "current" : "unanswered"}`}
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

        {/* Question label + input — differs based on whether this is an
            unlocked section prompt or a regular blank field */}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          {current.isUnlockedSection ? (
            /* Unlocked section — ask if engineer needs this section */
            <div className="flex-1 flex items-center gap-3">
              <span className="text-sm font-semibold">
                Do you need the <span className="text-primary">{current.sectionTitle}</span> section?
              </span>
              <Button size="sm" variant="outline" className="h-8 px-3 text-xs border-green-500 text-green-600 hover:bg-green-50"
                onClick={() => {
                  if (activeIndex < questions.length - 1) {
                    onChangeIndex(activeIndex + 1);
                  }
                }}>
                Yes, keep it
              </Button>
              <Button size="sm" variant="outline" className="h-8 px-3 text-xs border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => { onDeleteSection(current.sectionId); }}>
                No, remove it
              </Button>
            </div>
          ) : (
            <>
              <label className="text-sm font-semibold shrink-0 flex items-center gap-1 min-w-fit">
                {current.field!.required && (
                  <span className="text-destructive text-xs" title="Required">*</span>
                )}
                {current.field!.label}
              </label>

              {current.field!.type === "paragraph" || current.field!.type === "list" ? (
                <div className="flex-1 flex flex-col gap-1 min-w-0">
                  <textarea
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    value={value}
                    onChange={e => onChangeField(current.field!.id, e.target.value)}
                    placeholder={current.field!.placeholder || `Enter ${current.field!.label.toLowerCase()}...`}
                    rows={2}
                    className="flex-1 border border-input rounded-md px-3 py-2 text-sm bg-background outline-none focus:border-primary resize-none"
                  />
                  {current.field!.type === "list" && value.trim() && (
                    <ul className="ml-4 list-disc text-xs text-muted-foreground space-y-0.5">
                      {value.split("\n").filter(l => l.trim()).map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : current.field!.type === "dropdown" ? (
                /* Dropdown blank — select from admin-defined options */
                <select
                  value={value}
                  onChange={e => onChangeField(current.field!.id, e.target.value)}
                  className="flex-1 h-9 border border-input rounded-md px-3 text-sm bg-background outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">— {current.field!.placeholder || `Select ${current.field!.label.toLowerCase()}`} —</option>
                  {(current.field!.options ?? []).map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  type={current.field!.type === "number" ? "number" : current.field!.type === "date" ? "date" : "text"}
                  value={value}
                  onChange={e => onChangeField(current.field!.id, e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={current.field!.placeholder || `Enter ${current.field!.label.toLowerCase()}...`}
                  className="flex-1 h-9 border border-input rounded-md px-3 text-sm bg-background outline-none focus:border-primary"
                />
              )}

              {/* Answered checkmark */}
              {isFilled && (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              )}
            </>
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

        {/* Not Needed button — always visible, behavior depends on lockDelete */}
        {!showDeleteConfirm && (
          <Button
            size="sm"
            variant="ghost"
            className={`h-9 px-3 text-xs shrink-0 ${
              current.lockDelete
                ? "text-muted-foreground/50 cursor-not-allowed"
                : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            }`}
            onClick={() => setShowDeleteConfirm(true)}
            title={current.lockDelete ? "This section is required and cannot be removed" : "Mark this section as not needed"}
          >
            Not Needed
          </Button>
        )}

        {/* Delete confirmation or locked message — replaces Not Needed button */}
        {showDeleteConfirm && (
          <div className="flex items-center gap-2 shrink-0 rounded-md px-3 py-1.5 border text-xs font-medium"
            style={{
              background: current.lockDelete ? "var(--muted)" : "hsl(var(--destructive) / 0.1)",
              borderColor: current.lockDelete ? "var(--border)" : "hsl(var(--destructive) / 0.3)",
            }}
          >
            {current.lockDelete ? (
              <>
                <span className="text-muted-foreground">
                  "{current.sectionTitle}" is required and cannot be removed.
                </span>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                  onClick={() => setShowDeleteConfirm(false)}>
                  OK
                </Button>
              </>
            ) : (
              <>
                <span className="text-destructive">
                  Remove "{current.sectionTitle}" and its subsections?
                </span>
                <Button size="sm" variant="destructive" className="h-7 px-2 text-xs"
                  onClick={() => {
                    onDeleteSection(current.sectionId);
                    setShowDeleteConfirm(false);
                  }}>
                  Yes, remove
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                  onClick={() => setShowDeleteConfirm(false)}>
                  Keep it
                </Button>
              </>
            )}
          </div>
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

// ─── Inline blank input ───────────────────────────────────────────────────────
// Short types (text, number, word, sentence, date) render as growing inline inputs.
// paragraph and list types render as block-level textareas.
// dropdown type renders a <select> populated from field.options.
// isActive = true when this field is the one currently shown in the questionnaire
// bar — applies a bold amber ring so the engineer can easily find it on the page.
function BlankInput({ field, value, onChange, onFocus, isActive = false }: {
  field: TemplateField;
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  isActive?: boolean;
}) {
  // Active state swaps the subtle primary tint for a vivid amber outline so the
  // blank being edited in the ribbon is immediately obvious in the document preview.
  const baseClass = isActive
    ? "border-2 border-amber-400 bg-amber-50 text-amber-900 rounded px-1 py-0.5 text-sm outline-none ring-2 ring-amber-300/60 transition-colors"
    : "border-b border-primary/60 bg-primary/5 text-primary rounded px-1 py-0.5 text-sm outline-none focus:border-primary focus:bg-primary/10 transition-colors";

  // ── Dropdown ──
  if (field.type === "dropdown") {
    return (
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        title={field.label}
        className={`inline align-baseline ${baseClass} border rounded px-1 cursor-pointer`}
      >
        <option value="">— {field.placeholder || field.label} —</option>
        {(field.options ?? []).map((opt, i) => (
          <option key={i} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  // ── Paragraph / List ──
  if (field.type === "paragraph" || field.type === "list") {
    return (
      <div className="my-1 w-full block">
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={onFocus}
          placeholder={field.placeholder || field.label}
          title={field.label}
          rows={Math.min(6, Math.max(2, (value.match(/\n/g) || []).length + 2))}
          className={`w-full block ${baseClass} border rounded px-2 py-1 resize-none overflow-y-auto`}
          style={{ maxHeight: "120px" }}
        />
        {field.type === "list" && value.trim() && (
          <ul className="mt-1 ml-4 space-y-0.5 list-disc text-sm">
            {value.split("\n").filter(l => l.trim()).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // ── Inline text / number / date / word / sentence ──
  // contenteditable div flows inline with surrounding text naturally.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value;
    }
  }, [value]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={e => onChange((e.currentTarget as HTMLDivElement).innerText)}
      onFocus={onFocus}
      title={field.label}
      className={`inline align-baseline ${baseClass} border rounded px-1 min-w-[80px] empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:italic`}
      data-placeholder={field.placeholder || field.label}
    />
  );
}

// ─── Engineer section content ─────────────────────────────────────────────────
// Parses {{field_id}} tokens. Locked = static text + fillable BlankInputs.
// Unlocked = click-to-edit textarea showing raw content with tokens.
// activeFieldId: the field currently focused in the questionnaire bar — passed
// down to BlankInput so the matching blank highlights itself on the page.
function EngineerSectionContent({ content, fields, fieldValues, locked, activeFieldId, onChangeContent, onChangeField, onFocusBlank }: {
  content: string;
  fields: TemplateField[];
  fieldValues: Record<string, string>;
  locked: boolean;
  activeFieldId?: string;
  onChangeContent: (v: string) => void;
  onChangeField: (fieldId: string, value: string) => void;
  onFocusBlank: (fieldId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const fieldMap = useMemo(() => new Map(fields.map(f => [f.id, f])), [fields]);

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
            onFocus={() => onFocusBlank(seg.fieldId)}
            isActive={seg.fieldId === activeFieldId}
          />
        );
      })}
      {!content && <span className="text-gray-400 italic text-sm">No content in this section.</span>}
    </div>
  );

  if (locked) return <div className="px-1">{renderedContent}</div>;

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
      className="cursor-text rounded px-2 py-1.5 bg-gray-100 border border-gray-300 hover:bg-gray-150 min-h-[1.5em]"
    >
      {content ? renderedContent : <span className="text-gray-400 italic text-sm">Click to add content...</span>}
    </div>
  );
}

// ─── Engineer section block ───────────────────────────────────────────────────
// Renders one section for the engineer. No hover toolbars, no admin controls.
// lockEdit controls whether the content text is editable. Tables are editable.
function EngineerSectionBlock({ section, depth, fields, fieldValues, activeFieldId, onChangeContent, onChangeTitle, onChangeField, onFocusBlank, onAddSection, onAddTable, onDeleteSection, onUpdateCell, onDeleteTable, hoveredSectionId, setHoveredSectionId, children }: {
  section: SectionNode;
  depth: number;
  fields: TemplateField[];
  fieldValues: Record<string, string>;
  activeFieldId?: string;
  onChangeContent: (sectionId: string, value: string) => void;
  onChangeTitle: (sectionId: string, title: string) => void;
  onChangeField: (fieldId: string, value: string) => void;
  onFocusBlank: (fieldId: string) => void;
  onAddSection: (parentId: string) => void;
  onAddTable: (sectionId: string, rows: number, cols: number) => void;
  onDeleteSection: (sectionId: string) => void;
  onUpdateCell: (tid: string, r: number, c: number, v: string) => void;
  onDeleteTable: (tableId: string) => void;
  hoveredSectionId: string | null;
  setHoveredSectionId: (id: string | null) => void;
  children?: React.ReactNode;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTableForm, setShowTableForm] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [tr, setTr] = useState(3);
  const [tc, setTc] = useState(3);
  const headingClass = depth === 0 ? "text-2xl font-bold" : depth === 1 ? "text-xl font-semibold" : "text-lg font-medium";
  const indent = depth * 16;
  const isUnlocked = !(section.lockEdit && section.lockDelete && section.lockAddSections && section.lockAddTable)

  return (
    <div id={section.id} style={{ marginLeft: `${indent}px`, marginBottom: depth === 0 ? "2rem" : "1.25rem" }} className="relative" onMouseMove={(e) => {
      let target = e.target as HTMLElement;
      while (target && target !== e.currentTarget) {
        if (target.id && target.id.startsWith('sec-')) {
          setHoveredSectionId(target.id);
          return;
        }
        target = target.parentElement!;
      }
      setHoveredSectionId(section.id);
    }} onMouseLeave={() => { setHoveredSectionId(null); setShowTableForm(false); }}>
      <div className="flex items-baseline gap-2 mb-1">
        {!isUnlocked && <Lock className="h-3 w-3 text-slate-400 shrink-0 mt-1" />}
        {isUnlocked && (section.lockEdit || section.lockDelete || section.lockAddSections || section.lockAddTable) && (
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
          </div>
        )}
        <span className="font-mono text-gray-400 shrink-0 text-sm select-none">{section.number}</span>
        {section.engineerCreated ? (
          /* Engineer-created sections: click the title to rename it */
          editingTitle ? (
            <input
              autoFocus
              value={section.title}
              onChange={e => onChangeTitle(section.id, e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={e => e.key === "Enter" && setEditingTitle(false)}
              className={`${headingClass} bg-blue-50 border border-blue-300 rounded px-1 outline-none w-full`}
            />
          ) : (
            <span
              onClick={() => setEditingTitle(true)}
              title="Click to rename"
              className={`${headingClass} cursor-text rounded px-1 hover:bg-blue-50/40 hover:outline hover:outline-1 hover:outline-blue-200`}
            >
              {section.title}
            </span>
          )
        ) : (
          /* Admin-defined sections: title is always locked */
          <span className={headingClass}>{section.title}</span>
        )}
      </div>

      {/* Table size picker */}
      {showTableForm && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs" style={{ marginLeft: `${32}px` }}>
          <span className="text-gray-600">Rows (1-20):</span>
          <input type="number" min={1} max={20} value={tr} onChange={e => setTr(Number(e.target.value) || 3)} className="w-12 border rounded px-1 py-0.5" />
          <span className="text-gray-600">× Cols (1-10):</span>
          <input type="number" min={1} max={10} value={tc} onChange={e => setTc(Number(e.target.value) || 3)} className="w-12 border rounded px-1 py-0.5" />
          <button onClick={() => { onAddTable(section.id, tr, tc); setShowTableForm(false); }}
            className="bg-primary text-primary-foreground px-2 py-0.5 rounded hover:opacity-90">Add</button>
          <button onClick={() => setShowTableForm(false)} className="px-2 py-0.5 rounded hover:bg-gray-200 text-gray-600">Cancel</button>
        </div>
      )}

      <div style={{ marginLeft: `${32}px` }}>
        <EngineerSectionContent
          content={section.content}
          fields={fields}
          fieldValues={fieldValues}
          locked={section.lockEdit}
          activeFieldId={activeFieldId}
          onChangeContent={v => onChangeContent(section.id, v)}
          onChangeField={onChangeField}
          onFocusBlank={onFocusBlank}
        />
      </div>
      {section.tables && section.tables.length > 0 && (
        <div style={{ marginLeft: `${32}px` }} className="mt-3 space-y-4">
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
                            className="w-full p-1.5 outline-none focus:bg-blue-50 text-sm" placeholder={`r${ri + 1}c${ci + 1}`} />
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
      {children}
      {hoveredSectionId === section.id && (
        <div className="absolute top-0 right-0 bg-white border border-gray-300 rounded shadow-lg p-2 z-10">
          {showDeleteConfirm ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm">Do you need the "{section.title}" section?</span>
              <div className="flex gap-1">
                <Button size="sm" onClick={() => setShowDeleteConfirm(false)}>Yes, keep it</Button>
                <Button size="sm" variant="destructive" onClick={() => { onDeleteSection(section.id); setShowDeleteConfirm(false); }}>No, delete it</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {!section.lockAddSections && <Button size="sm" onClick={() => onAddSection(section.id)}>Add Subsection</Button>}
              {!section.lockAddTable && <Button size="sm" onClick={() => setShowTableForm(true)}>Add Table</Button>}
              {/* {!section.lockDelete && <Button size="sm" variant="destructive" onClick={() => setShowDeleteConfirm(true)}>Delete Section</Button>} */}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Section content updater ──────────────────────────────────────────────────
function updateSectionContent(sections: SectionNode[], id: string, content: string): SectionNode[] {
  return sections.map(s =>
    s.id === id ? { ...s, content } : { ...s, children: updateSectionContent(s.children, id, content) }
  );
}

// ─── Section title updater ────────────────────────────────────────────────────
// Used by engineer-created sections so users can rename their own subsections.
function updateSectionTitle(sections: SectionNode[], id: string, title: string): SectionNode[] {
  return sections.map(s =>
    s.id === id ? { ...s, title } : { ...s, children: updateSectionTitle(s.children, id, title) }
  );
}

// ─── Document page wrapper ────────────────────────────────────────────────────
// Static header and footer — engineers cannot edit these zones.
function DocumentPage({ hf, pageNumber, children }: {
  hf: HeaderFooterData;
  pageNumber: number;
  children: React.ReactNode;
}) {
  const resolve = (text: string) => text.replace("{PAGE}", String(pageNumber));
  return (
    <div className="bg-white shadow-lg mx-auto text-black" style={{ width: "8.5in", minHeight: "11in", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "0.5in 1in 0.1in 1in" }}>
        <div className="grid grid-cols-3 gap-1 text-sm text-gray-700">
          <div className="whitespace-pre-wrap">{hf.headerLeft}</div>
          <div className="whitespace-pre-wrap text-center">{hf.headerCenter}</div>
          <div className="whitespace-pre-wrap text-right">{hf.headerRight}</div>
        </div>
      </div>
      <div style={{ padding: "0.1in 1in", flex: 1 }}>{children}</div>
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

// ─── TOC generator ────────────────────────────────────────────────────────────
function generateTOCEntries(sections: SectionNode[], depth = 0, startPage = 3) {
  const entries: Array<{ number: string; title: string; page: number; depth: number }> = [];
  let page = startPage;
  for (const s of sections) {
    if (s.deleted) continue; // soft-deleted sections don't appear in TOC
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

// ─── Restore helpers ─────────────────────────────────────────────────────────
// Collects every soft-deleted section in the tree (flat list, depth-first).
// Used to populate the Removed Sections restore panel in the nav.
function collectDeletedSections(sections: SectionNode[]): SectionNode[] {
  const result: SectionNode[] = [];
  for (const s of sections) {
    if (s.deleted) result.push(s);
    // Still recurse into children of deleted parents so nested removes surface
    result.push(...collectDeletedSections(s.children));
  }
  return result;
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

  // Hovered section ID to manage popup visibility (only deepest hovered section shows popup)
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);

  // Controls visibility of the "Removed Sections" restore panel in the left nav
  // (moved to QuestionnaireBar — kept as dead code placeholder, can be removed)

  // Ordered list of questions derived from the section tree and fields array.
  // Recomputed whenever data changes (e.g. after loading a new draft).
  const questions = useMemo(() => buildQuestionList(data.sections, data.fields), [data.sections, data.fields]);

  // Scrolls to the section containing the active question so the engineer
  // can see where the blank lives in the document while answering in the bar.
  function handleChangeQuestionIndex(index: number) {
    const safeIndex = Math.max(0, Math.min(index, questions.length - 1));
    setActiveQuestionIndex(safeIndex);
    const question = questions[safeIndex];
    if (question) {
      document.getElementById(question.sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }


  function toggleExpand(id: string) {
    setExpandedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
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

  // Exports the completed SOW as a Word document via the FastAPI docx service.
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
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.documentName.replace(/\s+/g, "-").toLowerCase()}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed — make sure the document service is running.");
    } finally {
      setExporting(false);
    }
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

  // Updates an unlocked section's content text
  function handleChangeContent(sectionId: string, value: string) {
    setData(p => ({ ...p, sections: updateSectionContent(p.sections, sectionId, value) }));
  }

  // Updates the title of an engineer-created section
  function handleChangeTitle(sectionId: string, title: string) {
    setData(p => ({ ...p, sections: updateSectionTitle(p.sections, sectionId, title) }));
  }

  // Updates a single field value the engineer typed into a blank
  function handleChangeField(fieldId: string, value: string) {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  }

  // Soft-deletes a section — marks it deleted:true so it disappears from the
  // document and questionnaire, but stays in the data tree and can be restored.
  // Hard deletion is intentionally avoided so engineers can undo mistakes.
  function handleDeleteSection(sectionId: string) {
    function markDeleted(sections: SectionNode[]): SectionNode[] {
      return sections.map(s =>
        s.id === sectionId
          ? { ...s, deleted: true }
          : { ...s, children: markDeleted(s.children) }
      );
    }
    // Renumber only the visible (non-deleted) sections so numbering stays clean
    function renumberVisible(sections: SectionNode[], prefix = ""): SectionNode[] {
      let activeCount = 0;
      return sections.map(s => {
        if (s.deleted) return { ...s, children: renumberVisible(s.children, s.number?.replace(/\.0$/, "") || "") };
        activeCount++;
        const number = prefix ? `${prefix}.${activeCount}` : `${activeCount}.0`;
        return { ...s, number, children: renumberVisible(s.children, number.replace(/\.0$/, "")) };
      });
    }
    setData(p => ({ ...p, sections: renumberVisible(markDeleted(p.sections)) }));
    setActiveQuestionIndex(prev => Math.max(0, prev - 1));
  }

  // Restores a soft-deleted section by clearing its deleted flag, then renumbers.
  function handleRestoreSection(sectionId: string) {
    function markRestored(sections: SectionNode[]): SectionNode[] {
      return sections.map(s =>
        s.id === sectionId
          ? { ...s, deleted: false }
          : { ...s, children: markRestored(s.children) }
      );
    }
    function renumberVisible(sections: SectionNode[], prefix = ""): SectionNode[] {
      let activeCount = 0;
      return sections.map(s => {
        if (s.deleted) return { ...s, children: renumberVisible(s.children, s.number?.replace(/\.0$/, "") || "") };
        activeCount++;
        const number = prefix ? `${prefix}.${activeCount}` : `${activeCount}.0`;
        return { ...s, number, children: renumberVisible(s.children, number.replace(/\.0$/, "")) };
      });
    }
    setData(p => ({ ...p, sections: renumberVisible(markRestored(p.sections)) }));
  }

  // Adds a new subsection to the specified parent section.
  function handleAddSection(parentId: string) {
    function addSection(sections: SectionNode[], parentId: string): SectionNode[] {
      return sections.map(s => {
        if (s.id === parentId) {
          const newId = `${s.id}-child-${Date.now()}`;
          const baseNumber = s.number.replace(/\.0$/, '');
          const newNumber = `${baseNumber}.${s.children.length + 1}`;
          const newSection: SectionNode = {
            id: newId,
            number: newNumber,
            title: 'New Subsection',
            content: '',
            lockEdit: false,
            lockDelete: false,
            lockAddSections: false,
            lockAddTable: false,
            engineerCreated: true, // engineer-created: never show "do you need this?" in questionnaire
            tables: [],
            children: []
          };
          return { ...s, children: [...s.children, newSection] };
        } else {
          return { ...s, children: addSection(s.children, parentId) };
        }
      });
    }
    setData(p => ({ ...p, sections: addSection(p.sections, parentId) }));
  }

  // Adds a new table to the specified section.
  function handleAddTable(sectionId: string, rows: number, cols: number) {
    function addTable(sections: SectionNode[], sectionId: string, rows: number, cols: number): SectionNode[] {
      return sections.map(s =>
        s.id === sectionId ? { ...s, tables: [...(s.tables ?? []), { id: `table-${Date.now()}`, rows, cols, data: Array.from({length: rows}, () => Array(cols).fill("")) }] } : { ...s, children: addTable(s.children, sectionId, rows, cols) }
      );
    }
    setData(p => ({ ...p, sections: addTable(p.sections, sectionId, rows, cols) }));
  }

  // Deletes a table from the specified section.
  function handleDeleteTable(tableId: string) {
    function deleteTable(sections: SectionNode[], tableId: string): SectionNode[] {
      return sections.map(s => ({
        ...s,
        tables: (s.tables ?? []).filter(t => t.id !== tableId),
        children: deleteTable(s.children, tableId)
      }));
    }
    setData(p => ({ ...p, sections: deleteTable(p.sections, tableId) }));
  }

  // Updates a cell in a table.
  function handleUpdateCell(tableId: string, row: number, col: number, value: string) {
    function updateCell(sections: SectionNode[], tableId: string, row: number, col: number, value: string): SectionNode[] {
      return sections.map(s => ({
        ...s,
        tables: (s.tables ?? []).map(t => t.id === tableId ? {
          ...t,
          data: t.data.map((r, ri) => ri === row ? r.map((c, ci) => ci === col ? value : c) : r)
        } : t),
        children: updateCell(s.children, tableId, row, col, value)
      }));
    }
    setData(p => ({ ...p, sections: updateCell(p.sections, tableId, row, col, value) }));
  }

  // When the engineer clicks a blank in the document preview, find its question
  // index and update the questionnaire bar to show that question.
  function handleFocusBlank(fieldId: string) {
    const index = questions.findIndex(q => q.field && q.field.id === fieldId);
    if (index !== -1) setActiveQuestionIndex(index);
  }

  // Recursively renders sections for the document page
  function renderSections(sections: SectionNode[], depth = 0): React.ReactNode {
    // The field ID currently shown in the questionnaire bar — used to highlight
    // the matching blank in the document preview so engineers can find it easily.
    const activeFieldId = questions[activeQuestionIndex]?.field?.id;
    return sections
      .filter(section => !section.deleted) // soft-deleted sections are hidden
      .map(section => (
      <EngineerSectionBlock
        key={section.id}
        section={section}
        depth={depth}
        fields={data.fields}
        fieldValues={fieldValues}
        activeFieldId={activeFieldId}
        onChangeContent={handleChangeContent}
        onChangeTitle={handleChangeTitle}
        onChangeField={handleChangeField}
        onFocusBlank={handleFocusBlank}
        onAddSection={handleAddSection}
        onAddTable={handleAddTable}
        onDeleteTable={handleDeleteTable}
        onUpdateCell={handleUpdateCell}
        onDeleteSection={handleDeleteSection}
        hoveredSectionId={hoveredSectionId}
        setHoveredSectionId={setHoveredSectionId}
      >
        {section.children.length > 0 && renderSections(section.children, depth + 1)}
      </EngineerSectionBlock>
    ));
  }

  // Renders the left navigator panel — click to scroll, expand/collapse
  function renderNav(sections: SectionNode[], depth = 0): React.ReactNode {
    return sections
      .filter(section => !section.deleted) // soft-deleted sections are hidden from nav
      .map(section => {
      const hasChildren = section.children.filter(c => !c.deleted).length > 0;
      const isExpanded = expandedIds.has(section.id);
      //if section is unlocked AT ALL, then the lock is removed
      const isUnlocked = !(section.lockEdit && section.lockDelete && section.lockAddSections && section.lockAddTable)
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
            {!isUnlocked && <Lock className="h-2.5 w-2.5 text-slate-400 shrink-0" />}
            <span className="font-mono text-gray-400 min-w-[35px] shrink-0">{section.number}</span>
            <span className="truncate">{section.title}</span>
          </button>
          {hasChildren && isExpanded && renderNav(section.children, depth + 1)}
        </div>
      );
    });
  }

  const tocData = generateTOCEntries(data.sections);
  // Flat list of all soft-deleted sections — drives the restore panel badge + list
  const deletedSections = useMemo(() => collectDeletedSections(data.sections), [data.sections]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4 bg-background sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg shrink-0">
              <Plane className="size-4" />
            </div>
            <div className="flex flex-col text-left leading-tight">
              <span className="text-sm font-semibold uppercase tracking-tighter">SoWizard</span>
              <span className="text-[10px] text-muted-foreground uppercase font-mono">Tinker AFB</span>
            </div>
          </a>
          <div className="h-6 w-px bg-border shrink-0" />
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

        {/* Right: questionnaire bar + document pages stacked vertically */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Questionnaire bar — only above the document, not the navigator */}
          {questions.length > 0 && (
            <QuestionnaireBar
              questions={questions}
              activeIndex={activeQuestionIndex}
              fieldValues={fieldValues}
              onChangeField={handleChangeField}
              onChangeIndex={handleChangeQuestionIndex}
              onDeleteSection={handleDeleteSection}
              deletedSections={deletedSections}
              onRestoreSection={handleRestoreSection}
            />
          )}

          {/* Document pages */}
          <div className="flex-1 overflow-y-auto bg-gray-200 p-8">
            <div className="space-y-8">

              {/* Cover page — read-only for engineers */}
              <div className="bg-white shadow-lg mx-auto relative text-black" style={{ width: "8.5in", height: "11in" }}>
                <div className="absolute inset-8 border-4 border-black pointer-events-none" />
                <div className="absolute inset-8 flex items-center justify-center">
                  <div className="text-center w-full px-12">
                    <p className="text-4xl font-bold">{data.coverPage.title}</p>
                    <p className="text-3xl font-semibold mt-6">FOR</p>
                    <p className="text-4xl font-bold mt-4">{data.coverPage.clientName || "—"}</p>
                    <div className="flex items-baseline justify-center gap-2 mt-4">
                      <span className="text-3xl font-semibold">BUILDING</span>
                      <span className="text-3xl font-semibold">{data.coverPage.building || "—"}</span>
                    </div>
                    <div className="mt-16 space-y-3">
                      <p className="text-xl">{data.coverPage.location || "—"}</p>
                      <p className="text-lg font-semibold mt-4">Prepared by</p>
                      <p className="text-xl">{data.coverPage.preparedBy || "—"}</p>
                      <p className="text-xl">{data.coverPage.department || "—"}</p>
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
      </div>
    </div>
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