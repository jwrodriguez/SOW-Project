"use client";

import React, { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Download, Save, FileText, ChevronRight, ChevronDown, ListOrdered, Edit2, Table as TableIcon } from "lucide-react";

// ============= TYPES =============
type SectionNode = { id: string; number: string; title: string; content: string; tables?: TableData[]; children: SectionNode[] };
type TableData = { id: string; rows: number; cols: number; data: string[][] };
type CoverPageData = { title: string; projectNumber: string; clientName: string; building: string; location: string; preparedBy: string; department: string; date: string; version: string; confidentiality: string };
type HeaderFooterData = { headerLeft: string; headerCenter: string; headerRight: string; footerLeft: string; footerCenter: string; footerRight: string; showPageNumbers: boolean; pageNumberPosition: "footer-center" | "footer-right" | "header-right" };
type TemplateData = { documentName: string; coverPage: CoverPageData; headerFooter: HeaderFooterData; sections: SectionNode[] };

// ============= INLINE EDITING HELPERS =============
// These replace the separate settings panels — click any text on the page to edit it

// Single-line: looks like document text, becomes <input> on click
function EditableText({ value, onChange, className = "", placeholder = "Click to edit", inputType = "text" }: {
  value: string; onChange: (v: string) => void; className?: string; placeholder?: string; inputType?: string;
}) {
  const [editing, setEditing] = useState(false);
  return editing ? (
    <input autoFocus type={inputType} value={value} onChange={e => onChange(e.target.value)}
      onBlur={() => setEditing(false)} onKeyDown={e => e.key === "Enter" && setEditing(false)}
      className={`bg-blue-50 border border-blue-300 rounded px-1 outline-none w-full ${className}`} />
  ) : (
    <div onClick={() => setEditing(true)}
      className={`cursor-text rounded px-1 hover:bg-blue-50/40 hover:outline hover:outline-1 hover:outline-blue-200 min-h-[1.2em] ${className}`}>
      {value || <span className="text-gray-400 italic text-sm font-normal">{placeholder}</span>}
    </div>
  );
}

// Multi-line: becomes <textarea> on click
function EditableArea({ value, onChange, className = "", placeholder = "Click to add content..." }: {
  value: string; onChange: (v: string) => void; className?: string; placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
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

// Footer zone: displays resolved page number, reveals {PAGE} template while editing so users understand the pattern
function EditableFooterZone({ value, onChange, pageNumber, className = "", placeholder = "" }: {
  value: string; onChange: (v: string) => void; pageNumber: number; className?: string; placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  return editing ? (
    <textarea autoFocus value={value} onChange={e => onChange(e.target.value)}
      onBlur={() => setEditing(false)} rows={Math.max(1, (value.match(/\n/g) || []).length + 1)}
      className={`bg-blue-50 border border-blue-300 rounded px-1 outline-none w-full resize-none text-sm ${className}`} />
  ) : (
    <div onClick={() => setEditing(true)}
      className={`cursor-text rounded px-1 hover:bg-blue-50/40 hover:outline hover:outline-1 hover:outline-blue-200 whitespace-pre-wrap min-h-[1.2em] text-sm ${className}`}>
      {value
        ? value.replace("{PAGE}", String(pageNumber))
        : <span className="text-gray-400 italic text-sm">{placeholder}</span>}
    </div>
  );
}

// Reusable page wrapper — header and footer zones are editable directly on the page
function DocumentPage({ hf, onHF, pageNumber, children }: {
  hf: HeaderFooterData; onHF: (k: keyof HeaderFooterData, v: string) => void; pageNumber: number; children: React.ReactNode;
}) {
  return (
    <div className="bg-white shadow-lg mx-auto text-black" style={{ width: "8.5in", minHeight: "11in", display: "flex", flexDirection: "column" }}>
      {/* Editable header — 3 independent zones */}
      <div style={{ padding: "0.5in 1in 0.1in 1in" }}>
        <div className="grid grid-cols-3 gap-1 text-sm text-gray-700">
          <EditableArea value={hf.headerLeft} onChange={v => onHF("headerLeft", v)} placeholder="Header left" />
          <EditableArea value={hf.headerCenter} onChange={v => onHF("headerCenter", v)} className="text-center" placeholder="Header center" />
          <EditableArea value={hf.headerRight} onChange={v => onHF("headerRight", v)} className="text-right" placeholder="Header right" />
        </div>
      </div>
      {/* Page body */}
      <div style={{ padding: "0.1in 1in", flex: 1 }}>{children}</div>
      {/* Editable footer — use {PAGE} token in any zone for the real page number */}
      <div style={{ padding: "0.1in 1in 0.5in 1in" }}>
        <div className="grid grid-cols-3 gap-1 text-gray-700">
          <EditableFooterZone value={hf.footerLeft} onChange={v => onHF("footerLeft", v)} pageNumber={pageNumber} placeholder="Footer left" />
          <EditableFooterZone value={hf.footerCenter} onChange={v => onHF("footerCenter", v)} pageNumber={pageNumber} className="text-center" placeholder="Footer center" />
          <EditableFooterZone value={hf.footerRight} onChange={v => onHF("footerRight", v)} pageNumber={pageNumber} className="text-right" placeholder="Page {PAGE}" />
        </div>
      </div>
    </div>
  );
}

// Section rendered on the document — hover to reveal add/delete/table actions
function SectionBlock({ section, depth, isOnlyTop, onUpdate, onAddChild, onAddSibling, onDelete, onAddTable, onDeleteTable, onUpdateCell, children }: {
  section: SectionNode; depth: number; isOnlyTop: boolean;
  onUpdate: (u: Partial<SectionNode>) => void;
  onAddChild: () => void; onAddSibling: () => void; onDelete: () => void;
  onAddTable: (r: number, c: number) => void;
  onDeleteTable: (id: string) => void;
  onUpdateCell: (tid: string, r: number, c: number, v: string) => void;
  children?: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const [showTableForm, setShowTableForm] = useState(false);
  const [tr, setTr] = useState(3);
  const [tc, setTc] = useState(3);
  const headingClass = depth === 0 ? "text-2xl font-bold" : depth === 1 ? "text-xl font-semibold" : "text-lg font-medium";

  return (
    <div id={section.id} className="relative" style={{ marginLeft: `${depth * 16}px`, marginBottom: depth === 0 ? "2rem" : "1.25rem" }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => { setHovered(false); setShowTableForm(false); }}>

      {/* Hover toolbar — appears at top-right of section on hover */}
      {hovered && (
        <div className="absolute -top-1 right-0 flex gap-1 bg-white border border-gray-200 rounded shadow-md px-1.5 py-1 z-20 text-xs whitespace-nowrap">
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

      {/* Inline table size picker — shown when Table button clicked */}
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

      {/* Section heading: auto-numbered + editable title */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-mono text-gray-400 shrink-0 text-sm select-none">{section.number}</span>
        <EditableText value={section.title} onChange={v => onUpdate({ title: v })} className={headingClass} placeholder="Section title..." />
      </div>

      {/* Section body text */}
      <div className="ml-8">
        <EditableArea value={section.content} onChange={v => onUpdate({ content: v })} className="text-sm leading-relaxed" />
      </div>

      {/* Tables for this section — inline editable cells */}
      {section.tables && section.tables.length > 0 && (
        <div className="ml-8 mt-3 space-y-4">
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

      {/* Recursively rendered child sections */}
      {children}
    </div>
  );
}

// ============= PURE SECTION HELPERS (no side effects) =============

function renumberSections(sections: SectionNode[], prefix = ""): SectionNode[] {
  return sections.map((s, i) => {
    const number = prefix ? `${prefix}.${i + 1}` : `${i + 1}.0`;
    return { ...s, number, children: renumberSections(s.children, number.replace(/\.0$/, "")) };
  });
}

function findSection(sections: SectionNode[], id: string): SectionNode | null {
  for (const s of sections) {
    if (s.id === id) return s;
    const found = findSection(s.children, id);
    if (found) return found;
  }
  return null;
}

function updateSection(sections: SectionNode[], id: string, updates: Partial<SectionNode>): SectionNode[] {
  return sections.map(s => s.id === id ? { ...s, ...updates } : { ...s, children: updateSection(s.children, id, updates) });
}

function addChildSection(sections: SectionNode[], parentId: string): SectionNode[] {
  return sections.map(s => s.id === parentId
    ? { ...s, children: [...s.children, { id: `sec-${Date.now()}`, number: "", title: "New Subsection", content: "", tables: [], children: [] }] }
    : { ...s, children: addChildSection(s.children, parentId) }
  );
}

function addSiblingHelper(sections: SectionNode[], siblingId: string): { sections: SectionNode[]; added: boolean } {
  for (let i = 0; i < sections.length; i++) {
    if (sections[i].id === siblingId) {
      const newSec: SectionNode = { id: `sec-${Date.now()}`, number: "", title: "New Section", content: "", tables: [], children: [] };
      const next = [...sections]; next.splice(i + 1, 0, newSec);
      return { sections: next, added: true };
    }
    const r = addSiblingHelper(sections[i].children, siblingId);
    if (r.added) return { sections: sections.map((s, j) => j === i ? { ...s, children: r.sections } : s), added: true };
  }
  return { sections, added: false };
}

function deleteSection(sections: SectionNode[], id: string): SectionNode[] {
  return sections.filter(s => s.id !== id).map(s => ({ ...s, children: deleteSection(s.children, id) }));
}

function generateTOCEntries(sections: SectionNode[], depth = 0, startPage = 2): { entries: Array<{ number: string; title: string; page: number; depth: number }>; nextPage: number } {
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

// ============= MAIN COMPONENT =============
export default function SowEditPage() {
  const searchParams = useSearchParams();

  const defaultData: TemplateData = useMemo(() => {
    // Base defaults
    const base: TemplateData = {
      documentName: "Untitled Document",
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
        { id: "sec-1", number: "1.0", title: "Project Overview", content: "This Statement of Work (SOW) outlines the scope, deliverables, and requirements for the engagement.", tables: [],
          children: [
            { id: "sec-1-1", number: "1.1", title: "Background", content: "Background information goes here...", tables: [], children: [] },
            { id: "sec-1-2", number: "1.2", title: "Objectives", content: "The primary objectives of this engagement...", tables: [], children: [] },
          ]
        },
        { id: "sec-2", number: "2.0", title: "Scope of Work", content: "This section defines the detailed scope of work to be performed.", tables: [],
          children: [
            { id: "sec-2-1", number: "2.1", title: "In Scope", content: "Items included within the scope of this engagement...", tables: [], children: [] },
            { id: "sec-2-2", number: "2.2", title: "Out of Scope", content: "Items not explicitly mentioned are considered out of scope.", tables: [], children: [] },
          ]
        },
        { id: "sec-3", number: "3.0", title: "Deliverables", content: "The following deliverables will be provided as part of this engagement.", tables: [], children: [] },
      ],
    };

    // Override with setup data from the /new page if present
    const setupParam = searchParams.get("setup");
    if (setupParam) {
      try {
        const setup = JSON.parse(atob(setupParam));
        if (setup.documentName) base.documentName = setup.documentName;
        if (setup.title) base.coverPage.title = setup.title;
        if (setup.projectNumber) {
          base.coverPage.projectNumber = setup.projectNumber;
          base.headerFooter.footerLeft = setup.projectNumber;
        }
        if (setup.clientName) base.coverPage.clientName = setup.clientName;
        if (setup.building) base.coverPage.building = setup.building;
        if (setup.location) base.coverPage.location = setup.location;
        if (setup.preparedBy) base.coverPage.preparedBy = setup.preparedBy;
        if (setup.department) base.coverPage.department = setup.department;
        if (setup.date) {
          base.coverPage.date = setup.date;
          // Format for header
          const d = new Date(setup.date + "T00:00:00");
          const formatted = d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
          base.headerFooter.headerLeft = `${setup.title || "Statement of Work"}\n${formatted}`;
        }
        if (setup.confidentiality) base.coverPage.confidentiality = setup.confidentiality;
        // Description seeds the first section's content if provided
        if (setup.description) {
          base.sections[0].content = setup.description;
        }
      } catch {
        // If decode fails, just use defaults
      }
    }

    return base;
  }, [searchParams]);

  const [data, setData] = useState<TemplateData>(defaultData);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(defaultData.sections.map(s => s.id)));
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(defaultData.documentName);

  // Shorthand updaters
  const updateCover = (k: keyof typeof data.coverPage, v: string) =>
    setData(p => ({ ...p, coverPage: { ...p.coverPage, [k]: v } }));
  const updateHF = (k: keyof HeaderFooterData, v: string) =>
    setData(p => ({ ...p, headerFooter: { ...p.headerFooter, [k]: v } }));

  function toggleExpand(id: string) {
    setExpandedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  // ============= SAVE / LOAD / EXPORT =============

  function handleSave() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.documentName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleLoadJSON() {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const loaded = JSON.parse(ev.target?.result as string);
          setData(loaded);
          setEditedName(loaded.documentName || "Untitled Document");
          setExpandedIds(new Set(loaded.sections.map((s: SectionNode) => s.id)));
        } catch { alert("Invalid JSON file"); }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function handleExport() {
    alert("Export to Word will generate a .docx file. Backend integration coming soon!");
  }

  // ============= SECTION RENDERING (recursive, with inline callbacks) =============

  function renderSections(sections: SectionNode[], depth = 0): React.ReactNode {
    return sections.map(section => {
      // All callbacks use functional setData updates to avoid stale closures
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
      const onUpdateCell = (tid: string, row: number, col: number, val: string) => setData(p => {
        const sec = findSection(p.sections, section.id);
        const tables = sec?.tables?.map(t => t.id === tid
          ? { ...t, data: t.data.map((r, ri) => r.map((c, ci) => ri === row && ci === col ? val : c)) } : t
        );
        return { ...p, sections: updateSection(p.sections, section.id, { tables }) };
      });

      return (
        <SectionBlock key={section.id} section={section} depth={depth}
          isOnlyTop={depth === 0 && data.sections.length === 1}
          onUpdate={onUpdate} onAddChild={onAddChild} onAddSibling={onAddSibling}
          onDelete={onDelete} onAddTable={onAddTable} onDeleteTable={onDeleteTable} onUpdateCell={onUpdateCell}>
          {section.children.length > 0 && renderSections(section.children, depth + 1)}
        </SectionBlock>
      );
    });
  }

  // Left panel: section navigator — click to scroll to section on the page
  function renderNav(sections: SectionNode[], depth = 0): React.ReactNode {
    return sections.map(section => {
      const hasChildren = section.children.length > 0;
      const isExpanded = expandedIds.has(section.id);
      return (
        <div key={section.id}>
          <button onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="w-full flex items-center gap-1 rounded px-2 py-1.5 text-left text-xs hover:bg-muted transition-colors"
            style={{ paddingLeft: `${8 + depth * 12}px` }}>
            {hasChildren
              ? <span onClick={e => { e.stopPropagation(); toggleExpand(section.id); }} className="cursor-pointer hover:bg-accent rounded p-0.5 inline-flex">
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </span>
              : <div className="w-4" />}
            <span className="font-mono text-gray-400 min-w-[35px]">{section.number}</span>
            <span className="truncate">{section.title}</span>
          </button>
          {hasChildren && isExpanded && renderNav(section.children, depth + 1)}
        </div>
      );
    });
  }

  const tocData = generateTOCEntries(data.sections);

  // ============= RENDER =============
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        {/* Toolbar — Save/Load/Export + editable document name */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 bg-background sticky top-0 z-10">
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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleLoadJSON}><Download className="h-4 w-4 mr-1" />Load</Button>
            <Button variant="outline" size="sm" onClick={handleSave}><Save className="h-4 w-4 mr-1" />Save</Button>
            <Button size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Export</Button>
          </div>
        </header>

        {/* Body: left nav + document pages — each scrolls independently */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: section navigator — fixed height, own scroll */}
          <div className="w-60 border-r shrink-0 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b flex items-center gap-2 shrink-0 bg-background">
              <ListOrdered className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Sections</span>
            </div>
            <div className="p-2 space-y-0.5 overflow-y-auto flex-1">{renderNav(data.sections)}</div>
          </div>

          {/* Right: document pages — own independent scroll */}
          <div className="flex-1 overflow-y-auto bg-gray-200 p-8">
            <div className="space-y-8">

              {/* ── Page 1: Cover Page ── */}
              <div className="bg-white shadow-lg mx-auto relative text-black" style={{ width: "8.5in", height: "11in" }}>
                {/* Decorative border frame */}
                <div className="absolute inset-8 border-4 border-black pointer-events-none" />
                <div className="absolute inset-8 flex items-center justify-center">
                  <div className="text-center w-full px-12">
                    {/* Title block — large fonts */}
                    <EditableText value={data.coverPage.title} onChange={v => updateCover("title", v)} className="text-4xl font-bold" placeholder="SOW Title" />
                    <p className="text-3xl font-semibold mt-6 select-none">FOR</p>
                    <EditableText value={data.coverPage.clientName} onChange={v => updateCover("clientName", v)} className="text-4xl font-bold mt-4" placeholder="Product Name" />
                    <div className="flex items-baseline justify-center gap-2 mt-4">
                      <span className="text-3xl font-semibold select-none">BUILDING</span>
                      <EditableText value={data.coverPage.building} onChange={v => updateCover("building", v)} className="text-3xl font-semibold" placeholder="#" />
                    </div>
                    {/* Details block — medium fonts */}
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

              {/* ── Page 2: Table of Contents (auto-generated, not directly editable) ── */}
              <DocumentPage hf={data.headerFooter} onHF={updateHF} pageNumber={2}>
                <h2 className="font-bold text-lg mb-6 text-center">Table of Contents</h2>
                <div className="space-y-0.5">
                  {tocData.entries.map((entry, i) => (
                    <div key={i} className="flex justify-between items-baseline text-[11px]" style={{ paddingLeft: `${entry.depth * 16}px` }}>
                      <div className="flex items-baseline gap-2 flex-1">
                        <span className="font-mono text-gray-600 shrink-0" style={{ minWidth: "40px" }}>{entry.number}</span>
                        <span>{entry.title}</span>
                        {/* Leader dots between title and page number */}
                        <span className="flex-1 border-b border-dotted border-gray-400 mx-1 mb-0.5" />
                      </div>
                      <span className="font-mono text-gray-600 shrink-0">{entry.page}</span>
                    </div>
                  ))}
                </div>
              </DocumentPage>

              {/* ── Page 3+: Section Content (fully editable inline) ── */}
              <DocumentPage hf={data.headerFooter} onHF={updateHF} pageNumber={3}>
                {renderSections(data.sections)}
                {/* Add a top-level section at the bottom of the document */}
                <button onClick={() => setData(p => ({
                  ...p,
                  sections: renumberSections([...p.sections, { id: `sec-${Date.now()}`, number: "", title: "New Section", content: "", tables: [], children: [] }])
                }))} className="mt-6 flex items-center gap-2 text-sm text-gray-400 hover:text-primary hover:border-primary border border-dashed border-gray-300 rounded px-4 py-2 w-full justify-center transition-colors">
                  <Plus className="h-4 w-4" /> Add Top-Level Section
                </button>
              </DocumentPage>

            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
