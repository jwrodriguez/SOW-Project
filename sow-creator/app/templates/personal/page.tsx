"use client";

import * as React from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from 'next/navigation';
import { TemplateGrid } from "@/components/template-grid";
import { TemplateList } from "@/components/template-list";
import { TemplateFilters, type SortOption } from "@/components/template-filters";
import { useViewMode } from "@/hooks/use-view-mode";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { mockTemplates } from "@/lib/mock-templates";
import type { Template } from "@/components/template-card";

// In the real implementation this filters to only templates owned by the
// current user. For now we simulate that by filtering mock data to a subset.
const mockMyTemplates = mockTemplates.filter((t) =>
  ["1", "2", "6"].includes(t.id)
);

export default function PersonalTemplatesPage() {
  const { data: sessionData } = useSession();
  const router = useRouter();
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

  // PROTOTYPE: In production this would fetch the template JSON by ID from the
  // database and pass it to the editor. For now we navigate to /edit and the
  // editor loads its default placeholder document.
  function handleUseTemplate(template: Template) {
    router.push(`/edit?template=${template.id}`);
  }

  function handleEditTemplate(template: Template) {
    router.push(`/edit?template=${template.id}`);
  }

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
        currentUserId={sessionData?.user?.id ?? "current-user"}
        emptyMessage="No templates yet"
        emptyDescription="Create your first template to start building your library."
        onUse={handleUseTemplate}
        onEdit={handleEditTemplate}
      />
    </div>
  );
}