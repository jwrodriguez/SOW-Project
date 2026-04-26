"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  CalendarDays,
  Building2,
  MapPin,
  User,
  Briefcase,
  ShieldCheck,
  Info,
  FileText,
  Hash,
} from "lucide-react";
import type { TemplateData } from "@/types/pageTypes";

// Generates a draft SOW number for the engineer's working copy.
// When the DB is live this should come from the selected template instead.
function generateDraftNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
  return `SOW-${year}-${seq}`;
}

// Step indicator — same pattern as the admin /new page for visual consistency.
function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Document Info" },
    { n: 2, label: "Project Details" },
    { n: 3, label: "Your Information" },
  ];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((step, i) => (
        <React.Fragment key={step.n}>
          <div className="flex items-center gap-2">
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
              step.n <= current
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}>
              {step.n}
            </div>
            <span className={`text-sm ${
              step.n === current ? "font-medium text-foreground" : "text-muted-foreground"
            }`}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 mx-3 h-px ${step.n < current ? "bg-primary" : "bg-border"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// Builds a complete TemplateData object from the form fields with empty sections.
// The engineer will fill in the blanks in the SOW editor. Sections are empty here
// because the engineer loads a template or draft once they reach the SOW page.
// When the DB is live, the template should be fetched by ID and merged with this
// cover page data instead of sending empty sections.
function buildDraftTemplate(fields: {
  draftName: string;
  projectNumber: string;
  clientName: string;
  building: string;
  location: string;
  preparedBy: string;
  department: string;
  date: string;
  confidentiality: string;
}): TemplateData {
  return {
    documentName: fields.draftName || `Draft ${fields.projectNumber}`,
    fields: [],
    coverPage: {
      title: "Statement of Work",
      projectNumber: fields.projectNumber,
      clientName: fields.clientName,
      building: fields.building,
      location: fields.location,
      preparedBy: fields.preparedBy,
      department: fields.department,
      date: fields.date,
      version: "1.0",
      confidentiality: fields.confidentiality,
    },
    headerFooter: {
      headerLeft: `Statement of Work\n${new Date(fields.date + "T00:00:00").toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}`,
      headerCenter: "",
      headerRight: "",
      footerLeft: fields.projectNumber,
      footerCenter: "",
      footerRight: "Page {PAGE}",
      showPageNumbers: true,
      pageNumberPosition: "footer-right",
    },
    sections: [],
  };
}

export default function EngineerLandingPage() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  // Cover page fields the engineer fills in before entering the SOW editor.
  // These pre-fill the cover page and header/footer in app/sow/page.tsx.
  const [draftName, setDraftName] = useState("");
  const [projectNumber, setProjectNumber] = useState(generateDraftNumber);
  const [clientName, setClientName] = useState("");
  const [building, setBuilding] = useState("");
  const [location, setLocation] = useState("");
  const [preparedBy, setPreparedBy] = useState("");
  const [department, setDepartment] = useState("");
  const [date, setDate] = useState(today);
  const [confidentiality, setConfidentiality] = useState("Confidential");

  // Only the draft name is required — everything else pre-fills the cover page
  // but can be edited directly in the SOW editor if needed.
  const canSubmit = draftName.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const template = buildDraftTemplate({
      draftName: draftName.trim(),
      projectNumber,
      clientName,
      building,
      location,
      preparedBy,
      department,
      date,
      confidentiality,
    });

    // Encode the template as base64 and pass to the SOW editor.
    // app/sow/page.tsx reads this from the ?draft= param on load.
    // When the DB is live this should save the draft first and pass an ID instead.
    const encoded = btoa(JSON.stringify(template));
    router.push(`/sow?draft=${encoded}`);
  }

  // Step progress — same logic as the admin /new page
  const step: 1 | 2 | 3 = preparedBy || department || date !== today ? 3 : clientName || building || location ? 2 : 1;

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header — no sidebar since this is part of the overhaul */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-6 bg-background sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">New Statement of Work</span>
        </div>
      </header>

      {/* Scrollable form content */}
      <div className="max-w-2xl mx-auto py-10 px-6">

        {/* Page heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Start Your SOW</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Fill in your project details below. These pre-fill the cover page
            in the editor — you can update them directly on the document if needed.
          </p>
        </div>

        {/* Step progress indicator */}
        <StepIndicator current={step} />

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Document Information ── */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                Document Information
              </CardTitle>
              <CardDescription>
                Give your draft a name and set the SOW project number.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Draft name — only required field */}
              <div className="space-y-2">
                <Label htmlFor="draftName">
                  Draft Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="draftName"
                  placeholder="e.g. HVAC Maintenance - Bldg 3001"
                  value={draftName}
                  onChange={e => setDraftName(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Project number */}
              <div className="space-y-2">
                <Label htmlFor="projectNumber" className="flex items-center gap-1">
                  <Hash className="h-3 w-3" /> Project Number
                </Label>
                <Input
                  id="projectNumber"
                  placeholder="SOW-2026-001"
                  value={projectNumber}
                  onChange={e => setProjectNumber(e.target.value)}
                />
              </div>

            </CardContent>
          </Card>

          {/* ── Project Details ── */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                Project Details
              </CardTitle>
              <CardDescription>
                Client, facility, and location information for the cover page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="space-y-2">
                <Label htmlFor="clientName">Client / Product Name</Label>
                <Input
                  id="clientName"
                  placeholder="e.g. F-16 Block 50 Avionics Suite"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="building" className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> Building
                  </Label>
                  <Input
                    id="building"
                    placeholder="e.g. 3001"
                    value={building}
                    onChange={e => setBuilding(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Location
                  </Label>
                  <Input
                    id="location"
                    placeholder="e.g. Tinker AFB, Oklahoma"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                  />
                </div>
              </div>

            </CardContent>
          </Card>

          {/* ── Your Information ── */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                Your Information
              </CardTitle>
              <CardDescription>
                Your name, department, and the document date and classification.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preparedBy" className="flex items-center gap-1">
                    <User className="h-3 w-3" /> Prepared By
                  </Label>
                  <Input
                    id="preparedBy"
                    placeholder="Your Name"
                    value={preparedBy}
                    onChange={e => setPreparedBy(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department" className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> Department
                  </Label>
                  <Input
                    id="department"
                    placeholder="e.g. 76 MXSG/MXDEC"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" /> Date
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confidentiality" className="flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Confidentiality
                  </Label>
                  <Select value={confidentiality} onValueChange={setConfidentiality}>
                    <SelectTrigger id="confidentiality" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Confidential">Confidential</SelectItem>
                      <SelectItem value="Internal Use Only">Internal Use Only</SelectItem>
                      <SelectItem value="Public">Public</SelectItem>
                      <SelectItem value="Restricted">Restricted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Info note */}
          <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-900/20 px-4 py-3">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              Only Draft Name is required. All other fields pre-fill the cover page
              in the editor and can be changed there at any time.
            </p>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex items-center justify-between pb-4">
            <Button type="button" variant="ghost" onClick={() => router.push("/")}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit} className="gap-2 min-w-[160px]">
              Continue to Editor
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}