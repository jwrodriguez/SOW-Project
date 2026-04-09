"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ChevronUp, ChevronDown, Save, ExternalLink, FileText, X, Lock, Unlock } from "lucide-react";
import type { SectionNode, TemplateData } from "@/types/pageTypes";

// ─── Pre-made section library ────────────────────────────────────────────────
// These are the building blocks admins pick from to assemble a template skeleton.
// Each entry has a title and starter content. When added to the canvas they get
// a unique ID, a locked default of true, and their number assigned automatically.
// Admins do detailed editing (blanks, locking, tables) in the full /edit page.
const SECTION_LIBRARY: Array<{ title: string; content: string; children?: Array<{ title: string; content: string }> }> = [
  {
    title: "Project Overview",
    content: "This Statement of Work outlines the scope, deliverables, and requirements for the engagement.",
    children: [
      { title: "Background", content: "Background information goes here." },
      { title: "Objectives", content: "The primary objectives of this engagement." },
    ],
  },
  {
    title: "Scope of Work",
    content: "This section defines the detailed scope of work to be performed.",
    children: [
      { title: "In Scope", content: "Items included within the scope of this engagement." },
      { title: "Out of Scope", content: "Items not explicitly mentioned are considered out of scope." },
    ],
  },
  {
    title: "Deliverables",
    content: "The following deliverables will be provided as part of this engagement.",
    children: [],
  },
  {
    title: "Performance Standards",
    content: "The contractor shall meet the following performance standards.",
    children: [
      { title: "Response Time", content: "Response time requirements are defined here." },
      { title: "Quality Control", content: "Quality control requirements are defined here." },
    ],
  },
  {
    title: "Period of Performance",
    content: "The period of performance for this engagement.",
    children: [
      { title: "Start Date", content: "The start date of the engagement." },
      { title: "Option Periods", content: "Option periods exercisable at the Government's discretion." },
    ],
  },
  {
    title: "Safety & Compliance",
    content: "The contractor shall comply with all applicable safety regulations.",
    children: [
      { title: "Safety Requirements", content: "Applicable OSHA and AFI safety standards." },
      { title: "Personal Protective Equipment", content: "PPE requirements for this engagement." },
    ],
  },
  {
    title: "Government Furnished Equipment",
    content: "The Government will provide the following equipment as listed in Attachment A.",
    children: [],
  },
  {
    title: "Contractor Furnished Equipment",
    content: "The contractor is responsible for providing the following equipment.",
    children: [],
  },
  {
    title: "Inspection & Acceptance",
    content: "All work is subject to inspection and acceptance by the Contracting Officer Representative.",
    children: [],
  },
  {
    title: "Reporting Requirements",
    content: "The contractor shall submit reports as described in this section.",
    children: [
      { title: "Progress Reports", content: "Progress reports shall be submitted monthly." },
      { title: "Final Report", content: "A final report shall be submitted upon completion." },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Assigns correct auto-numbers to the canvas section list.
// Top-level sections get "1.0", "2.0" etc. Children get "1.1", "1.2" etc.
function renumberSections(sections: SectionNode[], prefix = ""): SectionNode[] {
  return sections.map((s, i) => {
    const number = prefix ? `${prefix}.${i + 1}` : `${i + 1}.0`;
    return { ...s, number, children: renumberSections(s.children, number.replace(/\.0$/, "")) };
  });
}

// Builds a SectionNode from a library entry, generating unique IDs for it and its children.
function buildSectionNode(entry: typeof SECTION_LIBRARY[0]): SectionNode {
  const id = `sec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    number: "",
    title: entry.title,
    content: entry.content,
    locked: true,
    tables: [],
    children: (entry.children ?? []).map((child, i) => ({
      id: `${id}-child-${i}`,
      number: "",
      title: child.title,
      content: child.content,
      locked: true,
      tables: [],
      children: [],
    })),
  };
}

// Builds a complete TemplateData object from the current canvas sections.
// Uses sensible defaults for cover page and header/footer so the result
// loads cleanly in the full /edit page without any missing fields.
function buildTemplateData(documentName: string, sections: SectionNode[]): TemplateData {
  return {
    documentName,
    fields: [],
    coverPage: {
      title: "Statement of Work",
      projectNumber: "SOW-2026-001",
      clientName: "Product Name",
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
    sections,
  };
}

// Recursively sets the locked state on a section and all its children.
// Used to enforce hierarchy locking — locking a parent locks all descendants.
function setLockedRecursive(section: SectionNode, locked: boolean): SectionNode {
  return {
    ...section,
    locked,
    children: section.children.map(child => setLockedRecursive(child, locked)),
  };
}

// Applies a lock state change to one section by ID within the full tree.
// If locking, all children are locked too. If unlocking, only this section
// unlocks — children keep their individual lock state unless explicitly changed.
function applyLockToSection(sections: SectionNode[], id: string, locked: boolean): SectionNode[] {
  return sections.map(s => {
    if (s.id === id) {
      // When locking, cascade down to all children.
      // When unlocking, only unlock this section — children stay as-is.
      return locked
        ? setLockedRecursive(s, true)
        : { ...s, locked: false };
    }
    return { ...s, children: applyLockToSection(s.children, id, locked) };
  });
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SectionBuilderPage() {
  const router = useRouter();

  // The canvas holds the sections the admin has assembled so far.
  const [canvas, setCanvas] = useState<SectionNode[]>([]);
  const [documentName, setDocumentName] = useState("Untitled Template");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("Untitled Template");

  // Custom sections created by the admin during this session.
  // Once DB is live these should be saved to the templates table.
  const [customSections, setCustomSections] = useState<typeof SECTION_LIBRARY>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newSubsections, setNewSubsections] = useState<Array<{ title: string; content: string }>>([]);
  const [newSubTitle, setNewSubTitle] = useState("");

  // Adds a section from the library to the bottom of the canvas.
  function handleAddSection(entry: typeof SECTION_LIBRARY[0]) {
    const newSection = buildSectionNode(entry);
    setCanvas(prev => renumberSections([...prev, newSection]));
  }

  // Removes a section from the canvas by index.
  function handleRemove(index: number) {
    setCanvas(prev => renumberSections(prev.filter((_, i) => i !== index)));
  }

  // Moves a section up one position in the canvas.
  function handleMoveUp(index: number) {
    if (index === 0) return;
    setCanvas(prev => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return renumberSections(next);
    });
  }

  // Moves a section down one position in the canvas.
  function handleMoveDown(index: number) {
    setCanvas(prev => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return renumberSections(next);
    });
  }

  // Toggles the locked state of a section by ID.
  // Locking cascades down to all children. Unlocking only affects the target section.
  function handleToggleLock(sectionId: string, currentLocked: boolean) {
    setCanvas(prev => applyLockToSection(prev, sectionId, !currentLocked));
  }

  // Saves the form as a new custom section and adds it to the library.
  function handleCreateSection() {
    if (!newTitle.trim()) return;
    const entry = {
      title: newTitle.trim(),
      content: newContent.trim(),
      children: newSubsections,
    };
    setCustomSections(prev => [...prev, entry]);
    setNewTitle("");
    setNewContent("");
    setNewSubsections([]);
    setNewSubTitle("");
    setShowCreateForm(false);
  }

  // Adds a subsection row to the create form
  function handleAddSubsection() {
    if (!newSubTitle.trim()) return;
    setNewSubsections(prev => [...prev, { title: newSubTitle.trim(), content: "" }]);
    setNewSubTitle("");
  }

  // Downloads the assembled template as a JSON file that can be loaded
  // directly into the full /edit page using its Load button.
  function handleSave() {
    const template = buildTemplateData(documentName, canvas);
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${documentName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Encodes the current template as base64 and navigates to the full editor.
  // The editor reads this from the URL and pre-fills the document with these sections.
  // Note: for very large templates this URL approach may hit browser limits.
  // When the DB is live this should be replaced with a saved template ID.
  function handleOpenInEditor() {
    if (canvas.length === 0) return;
    const template = buildTemplateData(documentName, canvas);
    const encoded = btoa(JSON.stringify(template));
    router.push(`/edit?draft=${encoded}`);
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">

        {/* Header */}
        <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4 bg-background sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <FileText className="h-4 w-4 text-primary" />
            {/* Editable document name */}
            {isEditingName ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={editedName}
                  onChange={e => setEditedName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") { setDocumentName(editedName); setIsEditingName(false); }
                    if (e.key === "Escape") { setEditedName(documentName); setIsEditingName(false); }
                  }}
                  className="h-7 w-52 text-sm border border-input rounded px-2 bg-background"
                />
                <Button size="sm" variant="ghost" className="h-7 text-xs"
                  onClick={() => { setDocumentName(editedName); setIsEditingName(false); }}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs"
                  onClick={() => { setEditedName(documentName); setIsEditingName(false); }}>
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                className="text-sm font-semibold hover:text-primary transition-colors"
              >
                {documentName}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSave} disabled={canvas.length === 0}>
              <Save className="h-4 w-4 mr-1" /> Save JSON
            </Button>
            <Button size="sm" onClick={handleOpenInEditor} disabled={canvas.length === 0}>
              <ExternalLink className="h-4 w-4 mr-1" /> Open in Full Editor
            </Button>
          </div>
        </header>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left panel — section library */}
          <div className="w-72 border-r shrink-0 flex flex-col overflow-hidden bg-muted/20">
            <div className="px-4 py-3 border-b bg-background shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Section Library</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click a section to add it to your template.
                  </p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs shrink-0"
                  onClick={() => setShowCreateForm(v => !v)}>
                  {showCreateForm ? "Cancel" : "+ New"}
                </Button>
              </div>

              {/* Create section form */}
              {showCreateForm && (
                <div className="mt-3 space-y-2 border-t pt-3">
                  <input
                    autoFocus
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="Section title *"
                    className="w-full h-8 text-sm border border-input rounded px-2 bg-background outline-none focus:border-primary"
                  />
                  <textarea
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    placeholder="Default content (optional)"
                    rows={2}
                    className="w-full text-sm border border-input rounded px-2 py-1 bg-background outline-none resize-none focus:border-primary"
                  />

                  {/* Subsections added so far */}
                  {newSubsections.length > 0 && (
                    <div className="space-y-1">
                      {newSubsections.map((sub, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground font-mono shrink-0">
                            {i + 1}.
                          </span>
                          <span className="text-xs flex-1 truncate">{sub.title}</span>
                          <button
                            onClick={() => setNewSubsections(prev => prev.filter((_, j) => j !== i))}
                            className="text-red-400 hover:text-red-600 shrink-0"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add subsection input */}
                  <div className="flex gap-1">
                    <input
                      value={newSubTitle}
                      onChange={e => setNewSubTitle(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleAddSubsection()}
                      placeholder="Add subsection..."
                      className="flex-1 h-7 text-xs border border-input rounded px-2 bg-background outline-none focus:border-primary"
                    />
                    <Button size="sm" variant="outline" className="h-7 text-xs px-2"
                      onClick={handleAddSubsection}>
                      +
                    </Button>
                  </div>

                  <Button size="sm" className="w-full h-7 text-xs"
                    onClick={handleCreateSection}
                    disabled={!newTitle.trim()}>
                    Add to Library
                  </Button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {/* Custom sections appear at the top with a distinct style */}
              {customSections.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                    Custom
                  </p>
                  {customSections.map((entry, i) => (
                    <button
                      key={`custom-${i}`}
                      onClick={() => handleAddSection(entry)}
                      className="w-full text-left rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 hover:border-primary/60 hover:bg-primary/10 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">{entry.title}</p>
                        <Plus className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </div>
                      {entry.children && entry.children.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {entry.children.length} subsection{entry.children.length !== 1 ? "s" : ""}
                        </p>
                      )}
                    </button>
                  ))}
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-1">
                    Built-in
                  </p>
                </>
              )}

              {/* Built-in sections */}
              {SECTION_LIBRARY.map((entry) => (
                <button
                  key={entry.title}
                  onClick={() => handleAddSection(entry)}
                  className="w-full text-left rounded-lg border bg-background px-3 py-2.5 hover:border-primary/40 hover:bg-primary/5 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{entry.title}</p>
                    <Plus className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </div>
                  {entry.children && entry.children.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {entry.children.length} subsection{entry.children.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Right panel — canvas */}
          <div className="flex-1 overflow-y-auto p-8 bg-gray-100">
            {canvas.length === 0 ? (
              // Empty state
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No sections yet</p>
                <p className="text-xs text-muted-foreground max-w-[220px]">
                  Click sections from the library on the left to start building your template structure.
                </p>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    {canvas.length} section{canvas.length !== 1 ? "s" : ""} — reorder or remove as needed, then save or open in the full editor to add blanks and detailed content.
                  </p>
                </div>

                {/* Canvas section cards */}
                {canvas.map((section, index) => (
                  <div
                    key={section.id}
                    className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Section number, lock indicator, and title */}
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-xs text-muted-foreground shrink-0">
                            {section.number}
                          </span>
                          {section.locked
                            ? <Lock className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                            : <Unlock className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
                          }
                          <p className="text-sm font-semibold truncate text-foreground">{section.title}</p>
                        </div>

                        {/* Subsection list — shows individual lock state */}
                        {section.children.length > 0 && (
                          <div className="mt-2 ml-5 space-y-1">
                            {section.children.map(child => (
                              <div key={child.id} className="flex items-center gap-2">
                                <span className="font-mono text-xs text-muted-foreground shrink-0">
                                  {child.number}
                                </span>
                                {child.locked
                                  ? <Lock className="h-2.5 w-2.5 text-amber-400 shrink-0" />
                                  : <Unlock className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                                }
                                <p className="text-xs text-foreground/70 flex-1">{child.title}</p>
                                {/* Subsection lock toggle — independent of parent when parent is unlocked */}
                                <button
                                  onClick={() => handleToggleLock(child.id, child.locked)}
                                  className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                  title={child.locked ? "Unlock subsection" : "Lock subsection"}
                                >
                                  {child.locked ? "Unlock" : "Lock"}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Controls — lock/unlock, move up, move down, remove */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleToggleLock(section.id, section.locked)}
                          className={`p-1 rounded transition-colors ${
                            section.locked
                              ? "text-amber-500 hover:bg-amber-50"
                              : "text-slate-400 hover:bg-muted"
                          }`}
                          title={section.locked ? "Unlock section (and all subsections)" : "Lock section (and all subsections)"}
                        >
                          {section.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-30"
                          title="Move up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === canvas.length - 1}
                          className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-30"
                          title="Move down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemove(index)}
                          className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                          title="Remove section"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Bottom note explaining next steps */}
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Save as JSON and load it in the full editor, or click <strong>Open in Full Editor</strong> above to continue with detailed template editing.
                </p>
              </div>
            )}
          </div>

        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}