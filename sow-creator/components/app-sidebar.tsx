// App sidebar. Data-driven nav (add routes in navData).
// Footer shows session user info with a loading skeleton.
"use client";

import * as React from "react";
import { useSession } from "@/lib/auth-client";
import {
  BookOpen,
  Plane,
  Send,
  LayoutTemplate,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

// Navigation data. Adding a new page is as simple as appending an object.
// `isActive` controls whether the collapsible section starts expanded.
const navData = {
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboard,
      isActive: true,
      items: [],
    },
    {
      title: "Templates",
      url: "/templates",
      icon: LayoutTemplate,
      isActive: true,
      items: [
        { title: "Base Templates", url: "/templates/base" },
        { title: "My Templates", url: "/templates/personal" },
        { title: "Shared with Me", url: "/templates/shared" },
      ],
    },
    {
      title: "Resources",
      url: "/resources",
      icon: ShieldCheck,
      isActive: true,
      items: [
        { title: "Clause Library", url: "/resources/clauses" },
        { title: "Compliance Check", url: "/resources/compliance" },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Documentation",
      url: "/docs",
      icon: BookOpen,
    },
    {
      title: "Feedback",
      url: "/feedback",
      icon: Send,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: sessionData, isPending } = useSession();

  // Build user object from session, or null while loading/unauthenticated.
  // The footer conditionally renders: skeleton -> user info -> nothing.
  const user = sessionData?.user
    ? {
        name: sessionData.user.name ?? "User",
        email: sessionData.user.email ?? "",
        avatar: sessionData.user.image ?? "",
      }
    : null;

  return (
    <Sidebar variant="floating" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Plane className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold uppercase tracking-tighter">
                    SoWizard
                  </span>
                  <span className="truncate text-xs text-muted-foreground uppercase font-mono">
                    Tinker AFB
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navData.navMain} />
        <NavSecondary items={navData.navSecondary} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        {isPending ? (
          <div className="flex items-center gap-2 p-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ) : user ? (
          <NavUser user={user} />
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}