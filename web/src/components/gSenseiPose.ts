import type { Slide } from "@/lib/types";

const poses = [
  "point-up",
  "clipboard",
  "present",
  "talk-side",
  "point-side",
  "wave",
  "clipboard-point",
  "invite",
] as const;

export function getGSenseiInlinePose(slide: Slide): (typeof poses)[number] {
  const offset =
    slide.visual.type === "table" ? 1 : slide.visual.type === "comparison" ? 4 : 0;
  const baseIndex = (slide.order + offset) % poses.length;
  return poses[(baseIndex + 3) % poses.length];
}
