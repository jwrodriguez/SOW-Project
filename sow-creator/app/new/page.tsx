"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
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
  FilePlus,
  ArrowRight,
  CalendarDays,
  Building2,
  MapPin,
  User,
  Briefcase,
  Hash,
  FileText,
  ShieldCheck,
  Info,
} from "lucide-react";

function generateProjectNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
  return `SOW-${year}-${seq}`;
}

// Step indicator shown at the top of the form
function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Document Info" },
    { n: 2, label: "Project Details" },
    { n: 3, label: "Author & Metadata" },
  ];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((step, i) => (
        <React.Fragment key={step.n}>
          <div className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                step.n <= current
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step.n}
            </div>
            <span
              className={`text-sm ${
                step.n === current
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              }`}
            >
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

export default function NewSOWPage() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  // All fields that the edit page reads from the setup param
  const [documentName, setDocumentName] = useState("");
  const [title, setTitle] = useState("Statement of Work (SOW)");
  const [projectNumber, setProjectNumber] = useState(generateProjectNumber);
  const [clientName, setClientName] = useState("");
  const [building, setBuilding] = useState("");
  const [location, setLocation] = useState("");
  const [preparedBy, setPreparedBy] = useState("");
  const [department, setDepartment] = useState("");
  const [date, setDate] = useState(today);
  const [description, setDescription] = useState("");
  const [confidentiality, setConfidentiality] = useState("Confidential");

  const canSubmit = documentName.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    // Encode all fields and pass to the edit page via the setup param.
    // The edit page reads this in its useMemo defaultData block and pre-fills
    // the cover page, header, and footer accordingly.
    const setupData = {
      documentName: documentName.trim(),
      title,
      projectNumber,
      clientName,
      building,
      location,
      preparedBy,
      department,
      date,
      description,
      confidentiality,
    };

    const encoded = btoa(JSON.stringify(setupData));
    router.push(`/sow?setup=${encoded}`);
  }

  // Determine which step we're on based on filled fields
  const step: 1 | 2 | 3 = preparedBy || department || date !== today ? 3 : clientName || building || location ? 2 : 1;

  return (
    <SidebarProvider>
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 bg-background sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <FilePlus className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">New Statement of Work</span>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto bg-muted/20">
          <div className="max-w-2xl mx-auto py-10 px-6">

            {/* Page heading */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight">
                Create a New SOW
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Fill in the basic project details below. Everything here
                pre-fills the cover page and header — you can edit it again
                directly in the document editor.
              </p>
            </div>

            {/* Progress indicator */}
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
                    Give your document a name and set the project number.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Document name — only required field */}
                  <div className="space-y-2">
                    <Label htmlFor="documentName">
                      Document Name{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="documentName"
                      placeholder="e.g. HVAC Maintenance - Bldg 3001"
                      value={documentName}
                      onChange={(e) => setDocumentName(e.target.value)}
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      This is the saved filename.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* <div className="space-y-2">
                      <Label htmlFor="title">SOW Title</Label>
                      <Input
                        id="title"
                        placeholder="Statement of Work"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        This should be unique.
                      </p>
                    </div> */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="projectNumber"
                        className="flex items-center gap-1"
                      >
                        <Hash className="h-3 w-3" /> Project Number
                      </Label>
                      <Input
                        id="projectNumber"
                        placeholder="SOW-2026-001"
                        value={projectNumber}
                        onChange={(e) => setProjectNumber(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        This should be unique.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Optional — brief summary of this SOW's purpose. This is the 'Project Overview' section in the sow editor."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
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
                    Client, facility, and location information for the cover
                    page.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Product Name</Label>
                    <Input
                      id="clientName"
                      placeholder="e.g. Universal Fuel Accessories Test Stand (UFATS)"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="building"
                        className="flex items-center gap-1"
                      >
                        <Building2 className="h-3 w-3" /> Building
                      </Label>
                      <Input
                        id="building"
                        placeholder="e.g. 3001"
                        value={building}
                        onChange={(e) => setBuilding(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="location"
                        className="flex items-center gap-1"
                      >
                        <MapPin className="h-3 w-3" /> Location
                      </Label>
                      <Input
                        id="location"
                        placeholder="e.g. Tinker AFB, Oklahoma"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── Author & Metadata ── */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    Author &amp; Metadata
                  </CardTitle>
                  <CardDescription>
                    Who is preparing this document, their department, and the
                    classification level.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="preparedBy"
                        className="flex items-center gap-1"
                      >
                        <User className="h-3 w-3" /> Prepared By
                      </Label>
                      <Input
                        id="preparedBy"
                        placeholder="Your Name or Group Name"
                        value={preparedBy}
                        onChange={(e) => setPreparedBy(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="department"
                        className="flex items-center gap-1"
                      >
                        <Briefcase className="h-3 w-3" /> Department
                      </Label>
                      <Input
                        id="department"
                        placeholder="e.g. 76 MXSG/MXDEC"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="date"
                        className="flex items-center gap-1"
                      >
                        <CalendarDays className="h-3 w-3" /> Date
                      </Label>
                      <Input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="confidentiality"
                        className="flex items-center gap-1"
                      >
                        <ShieldCheck className="h-3 w-3" /> Confidentiality
                      </Label>
                      <Select
                        value={confidentiality}
                        onValueChange={setConfidentiality}
                      >
                        <SelectTrigger id="confidentiality" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Confidential">
                            Confidential
                          </SelectItem>
                          <SelectItem value="Internal Use Only">
                            Internal Use Only
                          </SelectItem>
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
                  All fields except Document Name are optional. Anything left
                  blank will show a placeholder in the editor that you can fill
                  in directly on the document page.
                </p>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex items-center justify-between pb-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push("/")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="gap-2 min-w-[160px]"
                >
                  Continue to Editor
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}