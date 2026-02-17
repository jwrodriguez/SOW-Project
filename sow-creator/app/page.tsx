import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  FilePlus,
  LayoutTemplate,
  Clock,
  CheckCircle2,
  FileText,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  // Mock data for "Recent Projects"
  const recentSows = [
    {
      id: "1",
      title: "HVAC Maintenance - Bldg 3001",
      status: "Draft",
      date: "2h ago",
    },
    {
      id: "2",
      title: "IT Support Services FY26",
      status: "In Review",
      date: "Yesterday",
    },
    {
      id: "3",
      title: "Groundskeeping North Base",
      status: "Completed",
      date: "Oct 24, 2025",
    },
  ];

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-sm text-muted-foreground">Dashboard</h1>
        </header>

        <main className="flex flex-1 flex-col gap-6 px-6 pb-6">
          {/* 1. Statistics / Status Overview */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Drafts
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Review
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Approved (MTD)
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
              </CardContent>
            </Card>
          </div>

          {/* 2. Primary Actions */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="relative overflow-hidden group border-primary/20 hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutTemplate className="h-5 w-5 text-primary" />
                  Start from Template
                </CardTitle>
                <CardDescription>
                  Use a pre-approved SOW template to ensure compliance.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/templates/base">
                  <Button variant="outline" className="w-full">
                    Browse Templates
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FilePlus className="h-5 w-5 text-primary" />
                  Blank Statement
                </CardTitle>
                <CardDescription>
                  Create a custom SOW from scratch for unique requirements.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/new">
                  <Button variant="outline" className="w-full">
                    Create New
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* 3. Recent Projects (The "Recent Projects" you wanted to move) */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">
                Recent Statements of Work
              </h2>
              <Button variant="ghost" size="sm" className="gap-1">
                View all <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-md border bg-card">
              {recentSows.map((sow, index) => (
                <div
                  key={sow.id}
                  className={`flex items-center justify-between p-4 ${
                    index !== recentSows.length - 1 ? "border-b" : ""
                  } hover:bg-muted/50 transition-colors cursor-pointer`}
                >
                  <div className="grid gap-1">
                    <span className="font-medium text-sm">{sow.title}</span>
                    <span className="text-xs text-muted-foreground">
                      Modified {sow.date}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${
                        sow.status === "In Review"
                          ? "bg-blue-100 text-blue-700"
                          : sow.status === "Completed"
                            ? "bg-green-100 text-green-700"
                            : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {sow.status}
                    </span>
                    <Button variant="ghost" size="icon">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
