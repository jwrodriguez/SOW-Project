"use client";

import * as React from "react";
import { useSession } from "@/lib/auth-client";
import { TemplateGrid } from "@/components/template-grid";
import { TemplateList } from "@/components/template-list";
import { TemplateFilters, type SortOption } from "@/components/template-filters";
import { useViewMode } from "@/hooks/use-view-mode";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Template } from "@/components/template-card";

// Mock data - in real implementation, this would be filtered from the database
// to only show templates where ownerId matches the current user
const mockMyTemplates: Template[] = [
  {
    id: "1",
    name: "Standard HVAC Maintenance",
    description:
      "Template for heating, ventilation, and air conditioning maintenance contracts with annual inspection schedules.",
    tags: ["HVAC", "Maintenance", "Facilities"],
    icon: "wrench" as const,
    color: "orange" as const,
    owner: { id: "current-user", name: "You" },
    isShared: true,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },
  {
    id: "2",
    name: "IT Support Services",
    description:
      "Comprehensive IT support and maintenance agreement template including SLAs and response times.",
    tags: ["IT", "Support", "SLA"],
    icon: "monitor" as const,
    color: "blue" as const,
    owner: { id: "current-user", name: "You" },
    isShared: false,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
  },
  {
    id: "6",
    name: "Vehicle Fleet Maintenance",
    description:
      "Government vehicle fleet maintenance and repair services contract.",
    tags: ["Fleet", "Vehicles", "Maintenance"],
    icon: "truck" as const,
    color: "amber" as const,
    owner: { id: "current-user", name: "You" },
    isShared: false,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
  },
];

export default function PersonalTemplatesPage() {
  const { data: sessionData } = useSession();
  const { viewMode, setViewMode } = useViewMode();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState<SortOption>("date");
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const availableTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    mockMyTemplates.forEach((t) => t.tags?.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const filteredTemplates = React.useMemo(() => {
    let result = [...mockMyTemplates];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
      );
    }

    if (selectedTags.length > 0) {
      result = result.filter((t) =>
        selectedTags.some((tag) => t.tags?.includes(tag))
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "date":
        default:
          return b.updatedAt.getTime() - a.updatedAt.getTime();
      }
    });

    return result;
  }, [searchQuery, sortBy, selectedTags]);

  const ViewComponent = viewMode === "grid" ? TemplateGrid : TemplateList;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Templates</h2>
          <p className="text-muted-foreground">
            Templates you&apos;ve created and own.
          </p>
        </div>
        <Button>
          <Plus className="mr-1 h-4 w-4" />
          New Template
        </Button>
      </div>

      <TemplateFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        availableTags={availableTags}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <ViewComponent
        templates={filteredTemplates}
        isLoading={isLoading}
        currentUserId={sessionData?.user?.id ?? "current-user"}
        emptyMessage="No templates yet"
        emptyDescription="Create your first template to start building your library."
      />
    </div>
  );
}
