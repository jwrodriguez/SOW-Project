"use client";

import * as React from "react";
import { useSession } from "@/lib/auth-client";
import { TemplateGrid } from "@/components/template-grid";
import { TemplateList } from "@/components/template-list";
import { TemplateFilters, type SortOption } from "@/components/template-filters";
import { useViewMode } from "@/hooks/use-view-mode";
import type { Template } from "@/components/template-card";

// Mock data. in real implementation, this would query the templateShares table
// to show templates shared with the current user
const mockSharedTemplates: Template[] = [
  {
    id: "3",
    name: "Facilities Management",
    description:
      "Building facilities management and janitorial services contract template.",
    tags: ["Facilities", "Janitorial", "Maintenance"],
    icon: "building" as const,
    color: "purple" as const,
    owner: { id: "user-2", name: "Jane Doe" },
    isShared: true,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
  },
  {
    id: "5",
    name: "Grounds Maintenance",
    description: "Landscaping and grounds maintenance services template.",
    tags: ["Landscaping", "Maintenance", "Grounds"],
    icon: "leaf" as const,
    color: "green" as const,
    owner: { id: "user-3", name: "Mike Johnson" },
    isShared: true,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
  },
];

export default function SharedTemplatesPage() {
  const { data: sessionData } = useSession();
  const { viewMode, setViewMode } = useViewMode();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState<SortOption>("date");
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const availableTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    mockSharedTemplates.forEach((t) => t.tags?.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const filteredTemplates = React.useMemo(() => {
    let result = [...mockSharedTemplates];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.owner.name.toLowerCase().includes(query)
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
        case "owner":
          return a.owner.name.localeCompare(b.owner.name);
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
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Shared with Me</h2>
        <p className="text-muted-foreground">
          Templates that others have shared with you.
        </p>
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
        currentUserId={sessionData?.user?.id}
        emptyMessage="No shared templates"
        emptyDescription="Templates shared with you by others will appear here."
      />
    </div>
  );
}
