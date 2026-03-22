"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Clock,
  Copy,
  Download,
} from "lucide-react";
import {
  type TemplateIcon,
  type TemplateColor,
  getTemplateIcon,
  getTemplateColor,
} from "@/lib/template-styles";

export interface Template {
  id: string;
  name: string;
  description?: string | null;
  tags?: string[];
  icon?: TemplateIcon;
  color?: TemplateColor;
  owner: {
    id: string;
    name: string;
  };
  isShared?: boolean;
  updatedAt: Date;
}

interface TemplateCardProps {
  template: Template;
  onUse?: (template: Template) => void;
  onEdit?: (template: Template) => void;
  onDuplicate?: (template: Template) => void;
  onShare?: (template: Template) => void;
  onExport?: (template: Template) => void;
  onDelete?: (template: Template) => void;
  isOwner?: boolean;
}

export function TemplateCard({
  template,
  onUse,
  onEdit,
  onDuplicate,
  onShare,
  onExport,
  onDelete,
  isOwner = false,
}: TemplateCardProps) {
  const initials = template.owner.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const IconComponent = getTemplateIcon(template.icon);
  const colorStyle = getTemplateColor(template.color);

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

  return (
    <Card className="group relative overflow-hidden hover:border-primary/50 transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorStyle.bg} ${colorStyle.text}`}>
              <IconComponent className="h-5 w-5" />
            </div>
            <div className="grid gap-0.5">
              <CardTitle className="text-base font-semibold leading-tight">
                {template.name}
              </CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Avatar className="h-4 w-4">
                  <AvatarFallback className="text-[8px]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span>{template.owner.name}</span>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
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
      </CardHeader>

      <CardContent className="pt-0">
        {template.description && (
          <CardDescription className="line-clamp-2 mb-3">
            {template.description}
          </CardDescription>
        )}
        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {template.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {/* Bottom row — fixed height, content swaps on hover */}
        <div className="relative h-8 flex items-center">
          {/* Default state: date + shared badge */}
          <div className="absolute inset-0 flex items-center justify-between transition-opacity duration-150 group-hover:opacity-0 group-hover:pointer-events-none">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatDate(template.updatedAt)}</span>
            </div>
            {template.isShared && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                Shared
              </span>
            )}
          </div>
          {/* Hover state: action buttons */}
          <div className="absolute inset-0 flex items-center justify-end gap-2 opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-hover:pointer-events-auto">
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
        </div>
      </CardContent>
    </Card>
  );
}
