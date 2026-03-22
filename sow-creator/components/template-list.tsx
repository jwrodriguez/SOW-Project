"use client";

import * as React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
  Copy,
  Download,
  LayoutTemplate,
} from "lucide-react";
import { getTemplateIcon, getTemplateColor } from "@/lib/template-styles";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import type { Template } from "@/components/template-card";

interface TemplateListProps {
  templates: Template[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  currentUserId?: string;
  onUse?: (template: Template) => void;
  onEdit?: (template: Template) => void;
  onDuplicate?: (template: Template) => void;
  onShare?: (template: Template) => void;
  onExport?: (template: Template) => void;
  onDelete?: (template: Template) => void;
}

function TemplateListSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-3 flex-1">
        <Skeleton className="h-8 w-8 rounded" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

export function TemplateList({
  templates,
  isLoading = false,
  emptyMessage = "No templates found",
  emptyDescription = "Create your first template to get started.",
  currentUserId,
  onUse,
  onEdit,
  onDuplicate,
  onShare,
  onExport,
  onDelete,
}: TemplateListProps) {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-md border bg-card">
        {Array.from({ length: 5 }).map((_, i) => (
          <TemplateListSkeleton key={i} />
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
    <div className="rounded-md border bg-card">
      {templates.map((template, index) => {
        const isOwner = currentUserId === template.owner.id;
        const initials = template.owner.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        return (
          <div
            key={template.id}
            className={`flex items-center justify-between p-4 ${
              index !== templates.length - 1 ? "border-b" : ""
            } hover:bg-muted/50 transition-colors cursor-pointer group`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {(() => {
                const Icon = getTemplateIcon(template.icon);
                const color = getTemplateColor(template.color);
                return (
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${color.bg} ${color.text}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                );
              })()}
              <div className="grid gap-0.5 min-w-0 flex-1">
                <span className="font-medium text-sm truncate">
                  {template.name}
                </span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Avatar className="h-4 w-4">
                    <AvatarFallback className="text-[8px]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{template.owner.name}</span>
                </div>
              </div>
            </div>

            <div className="relative flex items-center">
              {/* Default state: tags, shared badge, date — in flow for sizing */}
              <div className="flex items-center gap-4 transition-opacity duration-150 group-hover:opacity-0 group-hover:pointer-events-none">
                {template.tags && template.tags.length > 0 && (
                  <div className="hidden md:flex items-center gap-1.5">
                    {template.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                    {template.tags.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{template.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
                {template.isShared && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    Shared
                  </span>
                )}
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(template.updatedAt)}
                </span>
              </div>
              {/* Hover state: action buttons — overlaid so no extra width */}
              <div className="absolute right-10 flex items-center gap-2 opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-hover:pointer-events-auto">
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-sm"
                    onClick={() => onEdit?.(template)}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                )}
                <Button
                  size="sm"
                  className="h-8 px-4 text-sm"
                  onClick={() => onUse?.(template)}
                >
                  Use Template
                </Button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">More actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onDuplicate?.(template)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onShare?.(template)}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExport?.(template)}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </DropdownMenuItem>
                  {isOwner && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDelete?.(template)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      })}
    </div>
  );
}
