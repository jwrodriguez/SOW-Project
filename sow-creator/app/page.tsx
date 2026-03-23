"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TemplateCard } from "@/components/template-card";
import { mockTemplates } from "@/lib/mock-templates";
import { FilePlus, LayoutTemplate, ArrowRight, BookOpen, ClipboardCheck } from "lucide-react";
import type { Template } from "@/components/template-card";

// For the dashboard, we show a curated list of recent templates and key actions to get users started.
const recentTemplates = [...mockTemplates]
  .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  .slice(0, 3);

// Action tiles for the top of the dashboard — each has an icon, label, description, and destination URL.
const ACTIONS = [
  { icon: LayoutTemplate, label: "Browse Templates", description: "Find a pre-approved template", href: "/templates/base", primary: true  },
  { icon: FilePlus,        label: "Blank SOW",        description: "Start from scratch",           href: "/new",                  primary: false },
  { icon: ClipboardCheck,  label: "Compliance Check", description: "Review your SOW",              href: "/resources/compliance", primary: false },
  { icon: BookOpen,        label: "Clause Library",   description: "Browse approved language",     href: "/resources/clauses",    primary: false },
];

// Dashboard page for users and provides quick access to key actions and recent templates.
export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();

  // PROTOTYPE: routes to /edit with default placeholder content until DB is live
  function handleUseTemplate(t: Template) { router.push(`/edit?template=${t.id}`); }
  function handleEditTemplate(t: Template) { router.push(`/edit?template=${t.id}`); }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-6 border-b">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-sm text-muted-foreground">Dashboard</h1>
        </header>

        <main className="flex flex-1 flex-col gap-8 p-8">

          <div>
            <h2 className="text-2xl font-bold tracking-tight">Welcome to SoWizard</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Create standardized Statements of Work for Capital Investment Equipment procurement.
            </p>
          </div>

          {/* Quick-action tiles */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => router.push(action.href)}
                className={`flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition-all hover:shadow-sm ${
                  action.primary
                    ? "border-primary/30 bg-primary/5 hover:border-primary/60"
                    : "hover:border-primary/30 hover:bg-muted/40"
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.primary ? "bg-primary/10" : "bg-muted"}`}>
                  <action.icon className={`h-5 w-5 ${action.primary ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{action.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Recent templates */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Recent Templates</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Hover a card and click <strong>Use Template</strong> to open it in the editor.
                </p>
              </div>
              <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => router.push("/templates/base")}>
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {recentTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isOwner={session?.user?.id === template.owner.id}
                  onUse={handleUseTemplate}
                  onEdit={handleEditTemplate}
                />
              ))}
            </div>
          </div>

        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}