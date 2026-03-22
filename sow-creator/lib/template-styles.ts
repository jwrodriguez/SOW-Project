import {
  FileText,
  Wrench,
  Monitor,
  Building2,
  Shield,
  Leaf,
  Truck,
  Zap,
  Heart,
  Globe,
  type LucideIcon,
} from "lucide-react";

export type TemplateIcon =
  | "file"
  | "wrench"
  | "monitor"
  | "building"
  | "shield"
  | "leaf"
  | "truck"
  | "zap"
  | "heart"
  | "globe";

export type TemplateColor =
  | "blue"
  | "purple"
  | "green"
  | "orange"
  | "red"
  | "teal"
  | "pink"
  | "amber"
  | "indigo"
  | "emerald";

export const TEMPLATE_ICONS: Record<TemplateIcon, LucideIcon> = {
  file: FileText,
  wrench: Wrench,
  monitor: Monitor,
  building: Building2,
  shield: Shield,
  leaf: Leaf,
  truck: Truck,
  zap: Zap,
  heart: Heart,
  globe: Globe,
};

export const TEMPLATE_COLORS: Record<
  TemplateColor,
  { bg: string; text: string }
> = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-600 dark:text-purple-400",
  },
  green: { bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400" },
  orange: {
    bg: "bg-orange-500/10",
    text: "text-orange-600 dark:text-orange-400",
  },
  red: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400" },
  teal: { bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400" },
  pink: { bg: "bg-pink-500/10", text: "text-pink-600 dark:text-pink-400" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
  indigo: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-600 dark:text-indigo-400",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
  },
};

export function getTemplateIcon(icon?: TemplateIcon): LucideIcon {
  return TEMPLATE_ICONS[icon ?? "file"] ?? TEMPLATE_ICONS.file;
}

export function getTemplateColor(
  color?: TemplateColor
): { bg: string; text: string } {
  return TEMPLATE_COLORS[color ?? "blue"] ?? TEMPLATE_COLORS.blue;
}
