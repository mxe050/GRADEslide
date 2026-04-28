import { redirect } from "next/navigation";
import { getFirstSlide } from "@/lib/slides";

export default function Home() {
  redirect(`/slide/${getFirstSlide().id}`);
}
