import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BookOpen,
  User,
  ShieldCheck,
  FileText,
  Lock,
  Download,
  LayoutTemplate,
  ChevronRight,
  Server,
} from "lucide-react";

// ── Section data ──────────────────────────────────────────────────────────────
const sections = [
  {
    id: "overview",
    icon: BookOpen,
    title: "Overview",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          SoWizard is a browser-based tool for creating standardized Statements
          of Work (SOWs) for Capital Investment Equipment (CIP) procurement at
          Tinker AFB. It addresses the problem of inconsistent SOW formatting
          across engineers with varying levels of contract-writing experience.
        </p>
        <p>
          The app is built around a template system: administrators create and
          lock SOW templates, and regular users fill in only the sections
          designated for their input. This ensures consistent structure and
          approved language across all SOWs while still allowing engineers to
          provide the project-specific details their SOW requires.
        </p>
        <p>
          SoWizard is a prototype intended for future deployment on a
          base-hosted server. All document data currently stays in your browser
          session. Once deployed, it will connect to a PostgreSQL database for
          persistent storage and use Microsoft SSO for authentication.
        </p>
      </div>
    ),
  },
  {
    id: "user-guide",
    icon: User,
    title: "User Guide — Creating a SOW",
    content: (
      <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
        <div>
          <p className="font-semibold text-foreground mb-1">Step 1 — Choose a Template</p>
          <p>
            From the Dashboard or the Templates → Base Templates page, browse
            the available SOW templates. Each card shows the template name,
            category tags, and who created it. Click <strong>Use Template</strong> on
            the card that matches your project type.
          </p>
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">Step 2 — Fill In the Cover Page</p>
          <p>
            In the editor, Page 1 is the cover page. Click any field directly
            on the page to edit it — project number, client name, building,
            location, prepared by, department, and date. Fields set by your
            administrator may be locked and shown in grey; these cannot be
            changed.
          </p>
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">Step 3 — Complete the Sections</p>
          <p>
            Page 3 contains all the SOW sections. Locked sections (set by the
            admin) display a padlock icon and cannot be edited — they contain
            standardized language that must remain consistent. Unlocked
            subsections are where you enter your project-specific content. Click
            any unlocked section title or body text to edit it inline.
          </p>
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">Step 4 — Use the Clause Library</p>
          <p>
            If you need pre-approved contract language for a section, go to
            Resources → Clause Library. Filter by category, find the appropriate
            clause, and click the card to copy the text to your clipboard. Paste
            it into the relevant section in your SOW.
          </p>
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">Step 5 — Save Your Work</p>
          <p>
            Click <strong>Save</strong> in the top toolbar to download your SOW
            as a <code>.json</code> file to your computer. This file contains
            all your document content. Keep it — it is your document. You can
            reload it at any time using the <strong>Load</strong> button.
          </p>
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">Step 6 — Export to Word</p>
          <p>
            When your SOW is complete, click <strong>Export</strong> to generate
            a formatted <code>.docx</code> file suitable for submission. The
            exported document includes all borders, headers, footers, and a
            table of contents. (Note: Word export requires the Python
            microservice to be running — see Deployment for details.)
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "admin-guide",
    icon: ShieldCheck,
    title: "Admin Guide — Managing Templates",
    content: (
      <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
        <div>
          <p className="font-semibold text-foreground mb-1">Creating a New Template</p>
          <p>
            Navigate to <strong>Templates → Base Templates</strong> and click{" "}
            <strong>New Template</strong>. This opens the SOW editor where you
            build the full template structure: cover page fields, headers and
            footers, top-level sections, and any subsections the template
            requires.
          </p>
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">Locking Sections</p>
          <p>
            As an admin, hovering over any section in the editor reveals a
            toolbar that includes a lock toggle. Click the lock icon to lock
            that section. Locked sections display a padlock indicator and cannot
            be edited by regular users — only admins can unlock them. Lock
            sections that contain standardized language, required headers, or
            legally specified text.
          </p>
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">What to Lock vs. Leave Open</p>
          <p>
            Lock: top-level section titles, standardized clauses, cover page
            structural elements, headers and footers. Leave open: subsections
            where engineers need to enter project-specific details like
            equipment descriptions, technical order numbers, power requirements,
            and personnel information.
          </p>
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">Adding Tables</p>
          <p>
            Hover any section and click <strong>Table</strong> in the toolbar.
            Set the number of rows (max 20) and columns (max 10) and click Add.
            Tables are useful for deliverables lists, inspection schedules, and
            equipment specifications.
          </p>
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">Saving a Template</p>
          <p>
            Click <strong>Save</strong> to download the template as a{" "}
            <code>.json</code> file. Templates saved this way can be loaded by
            any user with the Load button. Once the database is deployed,
            templates will be saved and published directly from the editor.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "locking",
    icon: Lock,
    title: "The Locking System",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          The locking system is the core mechanism for maintaining SOW
          consistency. It operates at the individual section level within the
          editor.
        </p>
        <p>
          <strong className="text-foreground">Admin view:</strong> A lock icon
          appears in the hover toolbar on every section. Clicking it toggles
          the section between locked and unlocked. Admins can always edit any
          section regardless of lock state.
        </p>
        <p>
          <strong className="text-foreground">User view:</strong> Locked
          sections are visually indicated with a padlock icon and greyed-out
          styling. Clicking a locked section does nothing. Unlocked sections
          behave normally — click to edit inline.
        </p>
        <p>
          The cover page, headers, footers, and top-level section titles in an
          admin-published template are always locked for users. Only the
          subsections the admin designated as editable are available for user
          input.
        </p>
      </div>
    ),
  },
  {
    id: "editor",
    icon: FileText,
    title: "Editor Reference",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          The editor displays your SOW as actual document pages at 8.5×11 inch
          size, reflecting how the exported Word document will look.
        </p>
        <ul className="space-y-2 list-none">
          {[
            ["Page 1", "Cover page — all fields are click-to-edit"],
            ["Page 2", "Table of contents — auto-generated from your sections, updates live"],
            ["Page 3", "Section content — fully editable inline"],
            ["Left panel", "Section navigator — click any section to scroll to it"],
            ["Headers & Footers", "Click any zone to edit; use {PAGE} for auto page numbers"],
            ["Hover toolbar", "Hover a section to reveal Add Sub / Add Section / Table / Delete / Lock"],
          ].map(([label, desc]) => (
            <li key={label} className="flex gap-2">
              <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
              <span>
                <strong className="text-foreground">{label}:</strong> {desc}
              </span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: "templates-ref",
    icon: LayoutTemplate,
    title: "Templates Reference",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          The Templates section has three views:
        </p>
        <ul className="space-y-2 list-none">
          {[
            ["Base Templates", "All published templates available to everyone. This is where users start when creating a new SOW."],
            ["My Templates", "Templates you have created. Only visible to you unless shared."],
            ["Shared with Me", "Templates that other users or admins have explicitly shared with you."],
          ].map(([label, desc]) => (
            <li key={label} className="flex gap-2">
              <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
              <span>
                <strong className="text-foreground">{label}:</strong> {desc}
              </span>
            </li>
          ))}
        </ul>
        <p>
          Each template card shows the template name, owner, tags, and last
          modified date. Hover the card to reveal <strong>Use Template</strong>{" "}
          (for users) and <strong>Edit</strong> (for the template owner).
        </p>
      </div>
    ),
  },
  {
    id: "export",
    icon: Download,
    title: "Saving & Exporting",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          <strong className="text-foreground">Save (.json):</strong> Downloads
          all document content as a JSON file. This is your working file — load
          it back into the editor at any time to continue editing. The filename
          includes the document name and today&apos;s date.
        </p>
        <p>
          <strong className="text-foreground">Load:</strong> Opens a file picker
          to load a previously saved <code>.json</code> file. Replaces the
          current document in the editor.
        </p>
        <p>
          <strong className="text-foreground">Export (.docx):</strong> Sends the
          document data to the Python microservice which generates a fully
          formatted Word document with proper borders, headers, footers, and a
          table of contents. This requires the microservice to be running. In
          the prototype, this shows a placeholder message.
        </p>
      </div>
    ),
  },
  {
    id: "deployment",
    icon: Server,
    title: "Deployment Guide",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          SoWizard is containerized using Docker and consists of three
          services: the Next.js web app, a PostgreSQL database, and a Python
          microservice for Word document generation.
        </p>
        <p>
          <strong className="text-foreground">Requirements:</strong> A server
          capable of running Docker containers, accessible from the base
          network. No special file system permissions are needed — all
          application data is stored within the database container.
        </p>
        <p>
          <strong className="text-foreground">To deploy:</strong> Clone the
          repository, copy <code>.env.example</code> to <code>.env</code> and
          fill in the required environment variables (database credentials,
          NextAuth secret), then run <code>docker-compose up -d</code>. The
          app will be available on port 3000.
        </p>
        <p>
          <strong className="text-foreground">Microsoft SSO:</strong> The app
          uses NextAuth.js which is provider-agnostic. To enable Microsoft SSO,
          add your Azure AD application credentials to the <code>.env</code>{" "}
          file under <code>AZURE_AD_CLIENT_ID</code>,{" "}
          <code>AZURE_AD_CLIENT_SECRET</code>, and{" "}
          <code>AZURE_AD_TENANT_ID</code>. The auth configuration is in{" "}
          <code>auth.ts</code> at the project root.
        </p>
        <p>
          <strong className="text-foreground">User roles:</strong> After first
          login, an administrator must manually set the <code>role</code> field
          in the <code>users</code> table to <code>admin</code> for privileged
          accounts. All other users default to the <code>user</code> role.
        </p>
      </div>
    ),
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function DocsPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-6 border-b">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-sm text-muted-foreground">Documentation</h1>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                SoWizard Documentation
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Operations manual covering how to use, manage, and deploy
                SoWizard.
              </p>
            </div>

            {sections.map((section) => (
              <Card key={section.id} id={section.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                      <section.icon className="h-4 w-4 text-primary" />
                    </div>
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>{section.content}</CardContent>
              </Card>
            ))}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}