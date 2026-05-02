"use client";

/**
 * Edit store — overlays user edits on top of the immutable slides.json.
 *
 * Design choice (safety-first):
 *   - The original slides.json is NEVER modified at runtime.
 *   - User edits are stored as per-slide overlay objects in localStorage.
 *   - Components consume the merged slide via mergeSlide().
 *   - When the user wants to persist edits to source, they export a merged
 *     slides.json file via exportMergedSlidesJson() and commit it manually.
 *   - The edit drawer only changes TEXT fields (no add/remove/reorder of
 *     bullets/rows); this keeps the rendered layout identical to the
 *     original visual structure.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Slide, Visual } from "./types";

export interface SlideOverlay {
  title?: string;
  section?: string;
  narration?: string;
  visual?: Visual;
}

interface EditState {
  editMode: boolean;
  overlays: Record<string, SlideOverlay>;
  toggleEditMode: () => void;
  setEditMode: (v: boolean) => void;
  setOverlay: (id: string, patch: SlideOverlay) => void;
  clearOne: (id: string) => void;
  clearAll: () => void;
}

export const useEditStore = create<EditState>()(
  persist(
    (set) => ({
      editMode: false,
      overlays: {},
      toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),
      setEditMode: (v) => set({ editMode: v }),
      setOverlay: (id, patch) =>
        set((s) => ({ overlays: { ...s.overlays, [id]: patch } })),
      clearOne: (id) =>
        set((s) => {
          const next = { ...s.overlays };
          delete next[id];
          return { overlays: next };
        }),
      clearAll: () => set({ overlays: {} }),
    }),
    {
      name: "gradeslide-edit",
      storage: createJSONStorage(() => localStorage),
      // Don't persist editMode itself — it should default to off on each
      // session so the user explicitly opts in.
      partialize: (s) => ({ overlays: s.overlays }),
    }
  )
);

export function mergeSlide(s: Slide, ov?: SlideOverlay): Slide {
  if (!ov) return s;
  return {
    ...s,
    title: ov.title ?? s.title,
    section: ov.section ?? s.section,
    narration: ov.narration ?? s.narration,
    visual: ov.visual ?? s.visual,
  };
}

/**
 * Has any overlay value that differs from the original slide?
 * Used to show a "編集済み" badge.
 */
export function hasMeaningfulOverlay(s: Slide, ov?: SlideOverlay): boolean {
  if (!ov) return false;
  if (ov.title !== undefined && ov.title !== s.title) return true;
  if (ov.section !== undefined && ov.section !== s.section) return true;
  if (ov.narration !== undefined && ov.narration !== s.narration) return true;
  if (ov.visual !== undefined) {
    try {
      return JSON.stringify(ov.visual) !== JSON.stringify(s.visual);
    } catch {
      return true;
    }
  }
  return false;
}
