import { notFound } from "next/navigation";
import { getAllSlides, getNeighbors, getSlideById } from "@/lib/slides";
import { SlideView } from "@/components/SlideView";

export function generateStaticParams() {
  return getAllSlides().map((s) => ({ id: s.id }));
}

export default async function SlidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const slide = getSlideById(id);
  if (!slide) notFound();
  const { prev, next, index, total } = getNeighbors(id);
  return (
    <SlideView
      slide={slide}
      prevId={prev?.id ?? null}
      nextId={next?.id ?? null}
      index={index}
      total={total}
    />
  );
}
