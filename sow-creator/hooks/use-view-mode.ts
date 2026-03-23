/**
 * useViewMode: persists grid/list toggle in localStorage.
 * Initializes to "grid" on server, syncs from localStorage on mount
 * to avoid hydration mismatch.
 */
"use client";

import * as React from "react";
import type { ViewMode } from "@/components/template-filters";

const STORAGE_KEY = "template-view-mode";

export function useViewMode() {
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid");
  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "grid" || stored === "list") {
      setViewMode(stored);
    }
    setIsHydrated(true);
  }, []);

  const handleSetViewMode = React.useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, []);

  return {
    viewMode,
    setViewMode: handleSetViewMode,
    isHydrated,
  };
}
