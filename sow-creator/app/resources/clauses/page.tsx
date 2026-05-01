"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import { Search, Copy, Check, FileText } from "lucide-react";

// Static mock data — pre-approved contract language organized by SOW section category.
// In production this would be fetched from the PostgreSQL database.
// Categories match the standard sections in a Tinker AFB SOW.

// Each clause has an id, category (for filtering), title (for display), and content (the actual contract language to copy).
const mockClauses = [
  // Scope
  {
    id: "c1",
    category: "Scope",
    title: "General Scope Statement",
    content:
      "The Contractor shall provide all labor, materials, equipment, and supervision necessary to perform the services described herein in accordance with applicable technical orders, standards, and specifications.",
  },
  {
    id: "c2",
    category: "Scope",
    title: "Out of Scope Disclaimer",
    content:
      "Any work not explicitly described in this Statement of Work is considered out of scope and will require a formal modification to this contract prior to performance.",
  },
  {
    id: "c3",
    category: "Scope",
    title: "Government-Furnished Equipment",
    content:
      "The Government will provide all Government Furnished Equipment (GFE) as listed in Attachment A. The Contractor is responsible for the proper use and safeguarding of all GFE in their possession.",
  },
  // Deliverables
  {
    id: "c4",
    category: "Deliverables",
    title: "Written Reports",
    content:
      "The Contractor shall submit written reports within five (5) business days of task completion. Reports shall include a summary of work performed, any issues encountered, corrective actions taken, and recommendations for future maintenance.",
  },
  {
    id: "c5",
    category: "Deliverables",
    title: "Inspection Documentation",
    content:
      "The Contractor shall document all inspections using the applicable AF Form or approved equivalent. Completed forms shall be submitted to the Contracting Officer Representative (COR) within two (2) business days of inspection.",
  },
  // Performance Standards
  {
    id: "c6",
    category: "Performance Standards",
    title: "Response Time — Priority 1",
    content:
      "The Contractor shall respond to Priority 1 (emergency) service calls within two (2) hours of notification. Priority 1 issues are defined as those posing an immediate risk to personnel safety or mission-critical operations.",
  },
  {
    id: "c7",
    category: "Performance Standards",
    title: "Response Time — Priority 2",
    content:
      "The Contractor shall respond to Priority 2 (urgent) service calls within twenty-four (24) hours of notification. Priority 2 issues are defined as those that degrade operational capability but do not pose an immediate safety risk.",
  },
  {
    id: "c8",
    category: "Performance Standards",
    title: "Quality Control",
    content:
      "The Contractor shall establish and maintain a Quality Control Program (QCP) that ensures services are performed in accordance with the requirements of this contract. The QCP shall be submitted to the CO within fifteen (15) days of contract award.",
  },
  // Safety
  {
    id: "c9",
    category: "Safety",
    title: "Contractor Safety Requirements",
    content:
      "The Contractor shall comply with all applicable federal, state, and local safety laws and regulations, as well as all applicable Air Force Instructions (AFIs) and Occupational Safety and Health Administration (OSHA) standards while performing work on Government property.",
  },
  {
    id: "c10",
    category: "Safety",
    title: "Personal Protective Equipment",
    content:
      "The Contractor shall ensure all personnel are equipped with appropriate Personal Protective Equipment (PPE) as required by the task being performed. PPE shall meet or exceed OSHA and applicable industry standards.",
  },
  // Period of Performance
  {
    id: "c11",
    category: "Period of Performance",
    title: "Base Year + Options",
    content:
      "The period of performance consists of a base year of twelve (12) months from the date of contract award, with up to four (4) one-year option periods exercisable at the sole discretion of the Government.",
  },
  {
    id: "c12",
    category: "Period of Performance",
    title: "Hours of Operation",
    content:
      "Unless otherwise specified, all work shall be performed during normal duty hours, Monday through Friday, 0730–1630 local time, excluding federal holidays. Emergency services shall be available twenty-four (24) hours per day, seven (7) days per week.",
  },
];

// Extract unique categories from the mock clauses for the category filter buttons.
const categories = Array.from(new Set(mockClauses.map((c) => c.category)));

// Main page component for the Clause Library. Displays a searchable, filterable list of pre-approved contract clauses that users can click to copy.
export default function ClauseLibraryPage() {
  const [search, setSearch] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<string>("All");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Filter clauses based on search term and active category. Search matches against title, content, and category fields.
  const filtered = React.useMemo(() => {
    return mockClauses.filter((c) => {
      const matchesSearch =
        !search ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.content.toLowerCase().includes(search.toLowerCase()) ||
        c.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        activeCategory === "All" || c.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory]);

  // Group filtered clauses by category for display, creating a Map where the key is the category and the value is an array of clauses in that category.
  const grouped = React.useMemo(() => {
    const map = new Map<string, typeof mockClauses>();
    filtered.forEach((c) => {
      if (!map.has(c.category)) map.set(c.category, []);
      map.get(c.category)!.push(c);
    });
    return map;
  }, [filtered]);

  // Copies clause text to the clipboard and shows a brief checkmark for 2 seconds to confirm the action. 
  // Uses the Clipboard API to write text to the user's clipboard.
  function handleCopy(clause: (typeof mockClauses)[0]) {
    navigator.clipboard.writeText(clause.content);
    setCopiedId(clause.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Clause Library</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Pre-approved contract language you can reference or copy into your
          Statement of Work. Click any clause to copy it.
        </p>
      </div>

      {/* Search + category filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clauses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["All", ...categories].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state — shown when no clauses match the current search/filter */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No clauses found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try a different search term or category.
          </p>
        </div>
      ) : (
        // Render each category group with its clauses in a responsive 2-column grid
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([category, clauses]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {clauses.map((clause) => (
                  <Card
                    key={clause.id}
                    className="group hover:border-primary/40 transition-colors cursor-pointer"
                    onClick={() => handleCopy(clause)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm font-semibold leading-snug">
                          {clause.title}
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(clause);
                          }}
                        >
                          {copiedId === clause.id ? (
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="text-xs leading-relaxed line-clamp-3">
                        {clause.content}
                      </CardDescription>
                      {copiedId === clause.id && (
                        <p className="text-xs text-green-600 font-medium mt-2">
                          Copied to clipboard
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}