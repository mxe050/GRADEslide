import { notFound } from "next/navigation";
import { getAllSlides, getNeighbors, getSlideById } from "@/lib/slides";
import { NotesView } from "@/components/NotesView";

export function generateStaticParams() {
  return getAllSlides().map((s) => ({ id: s.id }));
}

export default async function NotesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const slide = getSlideById(id);
  if (!slide) notFound();
  const { index, total } = getNeighbors(id);
  return <NotesView slide={slide} index={index} total={total} />;
}
