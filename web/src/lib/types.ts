export type SlideId = string;

export interface Citation {
  id: string;
  label: string;
  source: string;
  url?: string;
}

export interface CardVisual {
  type: "card";
  data: {
    heading?: string;
    bullets?: string[];
    body?: string;
    accent?: "default" | "warning" | "good" | "critical" | "info" | "highlight";
  };
}

export interface TableVisual {
  type: "table";
  data: {
    headers: string[];
    rows: string[][];
    caption?: string;
  };
}

export interface ComparisonVisual {
  type: "comparison";
  data: {
    leftHeader: string;
    rightHeader: string;
    rows: { left: string; right: string }[];
    caption?: string;
  };
}

export interface QuoteVisual {
  type: "quote";
  data: {
    text: string;
    citationId?: string;
  };
}

export interface ListVisual {
  type: "list";
  data: {
    ordered: boolean;
    items: { text: string; subItems?: string[] }[];
  };
}

export interface ImageVisual {
  type: "image";
  data: {
    src: string;
    alt: string;
    caption?: string;
  };
}

export interface SlideImageVisual {
  type: "slideImage";
  data: {
    src: string;
    alt: string;
  };
}

export interface ImagePairVisual {
  type: "imagePair";
  data: {
    leftImage: { src: string; alt: string };
    rightImage: { src: string; alt: string };
    leftCaption?: string;
    rightCaption?: string;
  };
}

export interface ImageCardVisual {
  type: "imageCard";
  data: {
    heading: string;
    image: { src: string; alt: string };
    bullets: string[];
    side?: "left" | "right";
  };
}

export interface ImageComparisonVisual {
  type: "imageComparison";
  data: {
    leftHeader: string;
    rightHeader: string;
    leftImage: { src: string; alt: string };
    rightImage: { src: string; alt: string };
    rows: { left: string; right: string }[];
    caption?: string;
  };
}

export type Visual =
  | CardVisual
  | TableVisual
  | ComparisonVisual
  | QuoteVisual
  | ListVisual
  | ImageVisual
  | ImageCardVisual
  | ImageComparisonVisual
  | SlideImageVisual
  | ImagePairVisual;

export interface Slide {
  id: SlideId;
  order: number;
  section: string;
  title: string;
  visual: Visual;
  narration: string;
  speakerNotes?: string;
  warnings?: string[];
  citationIds?: string[];
}

export interface Section {
  id: string;
  title: string;
  startSlideId: SlideId;
}

export interface AppData {
  meta: {
    title: string;
    version: string;
    sections: Section[];
  };
  citations: Record<string, Citation>;
  slides: Slide[];
}
