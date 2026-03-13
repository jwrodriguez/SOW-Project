"use client";

import * as React from "react";
import { Check, X, AlertCircle, CheckCircle2, Circle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ── Checklist data ────────────────────────────────────────────────────────────
// Based on scope: standardized language and consistency requirements.
// Grouped by SOW section so engineers know where to look.

const checklistSections = [
  {
    section: "Cover Page",
    items: [
      { id: "cp1", label: "SOW title is clearly stated" },
      { id: "cp2", label: "Project number is present and correctly formatted (e.g. SOW-YYYY-###)" },
      { id: "cp3", label: "Client / product name is specified" },
      { id: "cp4", label: "Building number is included" },
      { id: "cp5", label: "Location (city, state or base) is listed" },
      { id: "cp6", label: "Prepared by name and department are filled in" },
      { id: "cp7", label: "Document date is set" },
      { id: "cp8", label: "Confidentiality marking is present" },
    ],
  },
  {
    section: "Project Overview",
    items: [
      { id: "po1", label: "Background section explains why this work is needed" },
      { id: "po2", label: "Objectives are clearly defined and measurable" },
      { id: "po3", label: "End items or systems the work applies to are identified" },
    ],
  },
  {
    section: "Scope of Work",
    items: [
      { id: "sw1", label: "In-scope tasks are explicitly listed" },
      { id: "sw2", label: "Out-of-scope items are explicitly stated" },
      { id: "sw3", label: "Applicable Technical Orders (TOs) are referenced" },
      { id: "sw4", label: "Power requirements are documented (if applicable)" },
      { id: "sw5", label: "Government-furnished equipment is identified (if applicable)" },
      { id: "sw6", label: "Contractor-furnished equipment is identified (if applicable)" },
    ],
  },
  {
    section: "Deliverables",
    items: [
      { id: "dl1", label: "All deliverables are listed with clear descriptions" },
      { id: "dl2", label: "Due dates or delivery schedule are specified for each deliverable" },
      { id: "dl3", label: "Required report format or template is referenced (if applicable)" },
    ],
  },
  {
    section: "Performance Standards",
    items: [
      { id: "ps1", label: "Response time requirements are defined" },
      { id: "ps2", label: "Quality control requirements are included" },
      { id: "ps3", label: "Inspection and acceptance criteria are described" },
    ],
  },
  {
    section: "Period of Performance",
    items: [
      { id: "pp1", label: "Start date or award date is specified" },
      { id: "pp2", label: "End date or duration is specified" },
      { id: "pp3", label: "Option periods are described (if applicable)" },
      { id: "pp4", label: "Hours of operation are stated" },
    ],
  },
  {
    section: "Safety & Compliance",
    items: [
      { id: "sc1", label: "Applicable safety regulations are referenced (OSHA, AFI, etc.)" },
      { id: "sc2", label: "PPE requirements are addressed" },
      { id: "sc3", label: "Hazardous materials handling is addressed (if applicable)" },
    ],
  },
  {
    section: "Document Quality",
    items: [
      { id: "dq1", label: "Table of contents is present and accurate" },
      { id: "dq2", label: "All sections are numbered consistently" },
      { id: "dq3", label: "Headers and footers include project number and page numbers" },
      { id: "dq4", label: "No placeholder text or empty required fields remain" },
      { id: "dq5", label: "Document has been reviewed by a second engineer or supervisor" },
    ],
  },
];

const allItemIds = checklistSections.flatMap((s) => s.items.map((i) => i.id));

// ── Component ─────────────────────────────────────────────────────────────────
export default function ComplianceCheckPage() {
  const [checked, setChecked] = React.useState<Set<string>>(new Set());

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function checkAll() {
    setChecked(new Set(allItemIds));
  }

  function clearAll() {
    setChecked(new Set());
  }

  const total = allItemIds.length;
  const done = checked.size;
  const pct = Math.round((done / total) * 100);

  const statusColor =
    pct === 100
      ? "text-green-600"
      : pct >= 50
      ? "text-amber-600"
      : "text-muted-foreground";

  const progressColor =
    pct === 100 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-primary";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page heading */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Compliance Check</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Use this checklist to self-review your SOW before submitting for
            approval. Check off each item as you confirm it is addressed in your
            document.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={clearAll}>
            Clear all
          </Button>
          <Button size="sm" onClick={checkAll}>
            Check all
          </Button>
        </div>
      </div>

      {/* Progress summary */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className={`text-sm font-semibold ${statusColor}`}>
              {done}/{total} items ({pct}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {pct === 100 && (
            <div className="flex items-center gap-2 mt-3 text-green-600 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              All items checked — your SOW is ready for review.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checklist sections */}
      <div className="space-y-5">
        {checklistSections.map((section) => {
          const sectionIds = section.items.map((i) => i.id);
          const sectionDone = sectionIds.filter((id) => checked.has(id)).length;
          const allDone = sectionDone === sectionIds.length;

          return (
            <Card key={section.section} className={allDone ? "border-green-200 dark:border-green-900/50" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    {allDone ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    ) : sectionDone > 0 ? (
                      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    {section.section}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {sectionDone}/{sectionIds.length}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {section.items.map((item) => {
                  const isChecked = checked.has(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`flex items-start gap-3 p-2.5 rounded-md cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-green-50 dark:bg-green-900/20"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      {/* Custom checkbox */}
                      <div
                        onClick={() => toggle(item.id)}
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                          isChecked
                            ? "bg-green-600 border-green-600"
                            : "border-input bg-background"
                        }`}
                      >
                        {isChecked && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <span
                        onClick={() => toggle(item.id)}
                        className={`text-sm leading-snug ${
                          isChecked
                            ? "line-through text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {item.label}
                      </span>
                    </label>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}