// Base Templates. Browse all pre-approved SOW templates.
// Supports search, tag filtering, sorting, and grid/list toggle.
// Data from mock-templates.ts. Swap for API calls when DB is ready.
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { TemplateGrid } from "@/components/template-grid";
import { TemplateList } from "@/components/template-list";
import {
  TemplateFilters,
  type SortOption,
} from "@/components/template-filters";
import { useViewMode } from "@/hooks/use-view-mode";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { mockTemplates } from "@/lib/mock-templates";
import type { Template } from "@/components/template-card";

export default function BaseTemplatesPage() {
  const router = useRouter();
  const { data: sessionData } = useSession();
  const { viewMode, setViewMode } = useViewMode();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState<SortOption>("date");
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Collect unique tags from all templates for the filter dropdown.
  const availableTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    mockTemplates.forEach((t) => t.tags?.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, []);

  // Simulate a brief loading state for skeleton placeholders.
  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Filtering + sorting pipeline. Runs whenever search, tags, or sort change.
  const filteredTemplates = React.useMemo(() => {
    let result = [...mockTemplates];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.owner.name.toLowerCase().includes(query) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    if (selectedTags.length > 0) {
      result = result.filter((t) =>
        selectedTags.some((tag) => t.tags?.includes(tag)),
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

  // PROTOTYPE: In production this would fetch the template JSON by ID from the
  // database and pass it to the editor. For now we navigate to /edit and the
  // editor loads its default placeholder document.
  function handleUseTemplate(template: Template) {
    router.push(`/edit?template=${template.id}`);
  }

  function handleEditTemplate(template: Template) {
    router.push(`/edit?template=${template.id}`);
  }

  // Swap between TemplateGrid and TemplateList based on user preference.
  const ViewComponent = viewMode === "grid" ? TemplateGrid : TemplateList;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Base Templates</h2>
          <p className="text-muted-foreground">
            Pre-approved SOW templates for common service types.
          </p>
        </div>
        <Button onClick={() => router.push("/new")}>
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
        currentUserId={sessionData?.user?.id}
        emptyMessage="No templates found"
        emptyDescription="Try adjusting your search or create a new template."
        onUse={handleUseTemplate}
        onEdit={handleEditTemplate}
      />
    </div>
  );
}