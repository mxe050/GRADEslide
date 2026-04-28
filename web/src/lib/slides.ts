import type { AppData, Slide, SlideId } from "./types";
import data from "../../public/data/slides.json";

const appData = data as unknown as AppData;

const sortedSlides = [...appData.slides].sort((a, b) => a.order - b.order);
const idIndex = new Map<SlideId, number>();
sortedSlides.forEach((s, i) => idIndex.set(s.id, i));

export function getAppData(): AppData {
  return appData;
}

export function getAllSlides(): Slide[] {
  return sortedSlides;
}

export function getSlideById(id: SlideId): Slide | undefined {
  const i = idIndex.get(id);
  return i === undefined ? undefined : sortedSlides[i];
}

export function getSlideIndex(id: SlideId): number {
  return idIndex.get(id) ?? -1;
}

export function getNeighbors(id: SlideId): {
  prev: Slide | null;
  next: Slide | null;
  index: number;
  total: number;
} {
  const i = idIndex.get(id);
  if (i === undefined) {
    return { prev: null, next: null, index: -1, total: sortedSlides.length };
  }
  return {
    prev: i > 0 ? sortedSlides[i - 1] : null,
    next: i < sortedSlides.length - 1 ? sortedSlides[i + 1] : null,
    index: i,
    total: sortedSlides.length,
  };
}

export function getFirstSlide(): Slide {
  return sortedSlides[0];
}

export function getCitation(citationId: string) {
  return appData.citations[citationId];
}
