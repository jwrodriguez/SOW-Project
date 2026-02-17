"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
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
} from "lucide-react";

// Generate a default project number based on current date
function generateProjectNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
  return `SOW-${year}-${seq}`;
}

export default function NewTemplatePage() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const [documentName, setDocumentName] = useState("");
  const [title, setTitle] = useState("Statement of Work");
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
    router.push(`/edit?setup=${encoded}`);
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 bg-background sticky top-0 z-10">
          <SidebarTrigger className="-ml-1" />
          <FilePlus className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">New Statement of Work</span>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto py-10 px-6">
            {/* Hero section */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight">
                Create a New SOW
              </h1>
              <p className="text-muted-foreground mt-1">
                Fill in the basic project details below. You can always edit
                these later in the document editor.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* ── Document Info ── */}
              <Card className="mb-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Document Information
                  </CardTitle>
                  <CardDescription>
                    Give your document a name and set the SOW title.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="documentName">
                      Document Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="documentName"
                      placeholder="e.g. HVAC Maintenance - Bldg 3001"
                      value={documentName}
                      onChange={(e) => setDocumentName(e.target.value)}
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      This is how the document appears in your project list.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">SOW Title</Label>
                      <Input
                        id="title"
                        placeholder="Statement of Work"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="projectNumber" className="flex items-center gap-1">
                        <Hash className="h-3 w-3" /> Project Number
                      </Label>
                      <Input
                        id="projectNumber"
                        placeholder="SOW-2026-001"
                        value={projectNumber}
                        onChange={(e) => setProjectNumber(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Optional — brief summary of this SOW's purpose..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* ── Project Details ── */}
              <Card className="mb-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Project Details
                  </CardTitle>
                  <CardDescription>
                    Client, location, and facility information.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Client / Product Name</Label>
                    <Input
                      id="clientName"
                      placeholder="e.g. Product Name"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
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
                        onChange={(e) => setBuilding(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location" className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Location
                      </Label>
                      <Input
                        id="location"
                        placeholder="e.g. Norman, Oklahoma"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── Author & Metadata ── */}
              <Card className="mb-8">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Author &amp; Metadata
                  </CardTitle>
                  <CardDescription>
                    Who is preparing this document and when.
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
                        onChange={(e) => setPreparedBy(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department" className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" /> Department
                      </Label>
                      <Input
                        id="department"
                        placeholder="Department Name"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
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
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confidentiality" className="flex items-center gap-1">
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

              {/* ── Actions ── */}
              <Separator className="mb-6" />
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push("/")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSubmit} className="gap-2">
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
