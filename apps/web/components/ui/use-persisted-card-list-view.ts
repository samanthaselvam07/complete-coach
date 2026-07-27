"use client";

import { useState } from "react";

import type { CardListViewMode } from "@/components/ui/card-list-view-toggle";

export function usePersistedCardListView(storageKey: string, defaultViewMode: CardListViewMode = "list") {
  const [viewMode, setViewMode] = useState<CardListViewMode>(() => getStoredViewMode(storageKey) ?? defaultViewMode);

  function updateViewMode(nextViewMode: CardListViewMode) {
    setViewMode(nextViewMode);
    setStoredViewMode(storageKey, nextViewMode);
  }

  return [viewMode, updateViewMode] as const;
}

function getStoredViewMode(storageKey: string): CardListViewMode | null {
  try {
    if (typeof window === "undefined") {
      return null;
    }

    const storedViewMode = window.localStorage?.getItem(storageKey);
    return storedViewMode === "cards" || storedViewMode === "list" ? storedViewMode : null;
  } catch {
    return null;
  }
}

function setStoredViewMode(storageKey: string, viewMode: CardListViewMode) {
  try {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage?.setItem(storageKey, viewMode);
  } catch {
    // Browsers without storage access should still keep the in-session state.
  }
}
