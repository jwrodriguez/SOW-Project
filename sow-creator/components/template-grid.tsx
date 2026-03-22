"use client";

import * as React from "react";
import { TemplateCard, type Template } from "@/components/template-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { LayoutTemplate } from "lucide-react";

interface TemplateGridProps {
  templates: Template[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  currentUserId?: string;
  onUse?: (template: Template) => void;
  onEdit?: (template: Template) => void;
  onShare?: (template: Template) => void;
  onDelete?: (template: Template) => void;
}

function TemplateCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}

export function TemplateGrid({
  templates,
  isLoading = false,
  emptyMessage = "No templates found",
  emptyDescription = "Create your first template to get started.",
  currentUserId,
  onUse,
  onEdit,
  onShare,
  onDelete,
}: TemplateGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <TemplateCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <Empty>
        <EmptyMedia variant="icon">
          <LayoutTemplate className="h-6 w-6" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{emptyMessage}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          isOwner={currentUserId === template.owner.id}
          onUse={onUse}
          onEdit={onEdit}
          onShare={onShare}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
