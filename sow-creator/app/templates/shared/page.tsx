"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { TemplateGrid } from "@/components/template-grid";
import { TemplateList } from "@/components/template-list";
import { TemplateFilters, type SortOption } from "@/components/template-filters";
import { useViewMode } from "@/hooks/use-view-mode";
import { mockTemplates } from "@/lib/mock-templates";
import type { Template } from "@/components/template-card";

// In the real implementation this queries the templateShares table.
// For now we simulate it by filtering to templates marked isShared: true.
const mockSharedTemplates = mockTemplates.filter((t) => t.isShared);

export default function SharedTemplatesPage() {
  const router = useRouter();
  const { data: session } = useSession();
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

  // PROTOTYPE: In production this would fetch the template JSON by ID from the
  // database and pass it to the editor. For now we navigate to /edit and the
  // editor loads its default placeholder document.
  function handleUseTemplate(template: Template) {
    router.push(`/edit?template=${template.id}`);
  }

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
        currentUserId={session?.user?.id}
        emptyMessage="No shared templates"
        emptyDescription="Templates shared with you by others will appear here."
        onUse={handleUseTemplate}
      />
    </div>
  );
}