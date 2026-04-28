"use client";

import Image from "next/image";
import clsx from "clsx";
import type {
  CardVisual,
  ComparisonVisual,
  ImageCardVisual,
  ImageComparisonVisual,
  ImagePairVisual,
  ImageVisual,
  ListVisual,
  QuoteVisual,
  Slide,
  SlideImageVisual,
  TableVisual,
} from "@/lib/types";
import { getCitation } from "@/lib/slides";
import { MarkdownText } from "./MarkdownText";

interface Props {
  slide: Slide;
  present?: boolean;
}

export function VisualPanel({ slide, present }: Props) {
  // For slideImage, render the image full-bleed without any title overlay
  // (the original PowerPoint slide already contains its own title and visuals).
  if (slide.visual.type === "slideImage") {
    return (
      <div
        className={clsx(
          "fade-in w-full h-full flex items-center justify-center",
          present ? "" : "rounded-2xl overflow-hidden bg-black"
        )}
      >
        <SlideImageR data={slide.visual.data} present={present} />
      </div>
    );
  }
  return (
    <div
      className={clsx(
        "fade-in flex flex-col gap-3 w-full",
        present
          ? "h-full justify-center text-white"
          : "rounded-2xl bg-[var(--card)] border border-[var(--card-border)] shadow-sm p-4 md:p-6"
      )}
    >
      {!present && (
        <h2 className="text-lg md:text-2xl font-bold leading-tight tracking-tight">
          {slide.title}
        </h2>
      )}
      {present && (
        <h2 className="text-2xl md:text-4xl font-bold leading-tight tracking-tight text-white mb-2">
          {slide.title}
        </h2>
      )}
      <Renderer slide={slide} present={present} />
    </div>
  );
}

function Renderer({ slide, present }: Props) {
  const v = slide.visual;
  switch (v.type) {
    case "card":
      return <CardR data={v.data} present={present} />;
    case "table":
      return <TableR data={v.data} present={present} />;
    case "comparison":
      return <ComparisonR data={v.data} present={present} />;
    case "quote":
      return <QuoteR data={v.data} present={present} />;
    case "list":
      return <ListR data={v.data} present={present} />;
    case "image":
      return <ImageR data={v.data} present={present} />;
    case "imageCard":
      return <ImageCardR data={v.data} present={present} />;
    case "imageComparison":
      return <ImageComparisonR data={v.data} present={present} />;
    case "slideImage":
      return <SlideImageR data={v.data} present={present} />;
    case "imagePair":
      return <ImagePairR data={v.data} present={present} />;
  }
}

function ImagePairR({
  data,
  present,
}: {
  data: ImagePairVisual["data"];
  present?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 w-full h-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 flex-1 min-h-0">
        <PairBlock
          tone="bad"
          image={data.leftImage}
          caption={data.leftCaption}
          present={present}
        />
        <PairBlock
          tone="good"
          image={data.rightImage}
          caption={data.rightCaption}
          present={present}
        />
      </div>
    </div>
  );
}

function PairBlock({
  tone,
  image,
  caption,
  present,
}: {
  tone: "good" | "bad";
  image: { src: string; alt: string };
  caption?: string;
  present?: boolean;
}) {
  return (
    <figure
      className={clsx(
        "rounded-xl overflow-hidden border-2 flex flex-col bg-white",
        tone === "bad"
          ? "border-rose-500/40"
          : "border-emerald-500/50"
      )}
    >
      {caption && (
        <figcaption
          className={clsx(
            "px-3 py-1.5 text-sm font-semibold text-center",
            tone === "bad"
              ? "bg-rose-500/15 text-rose-800 dark:text-rose-200"
              : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
          )}
        >
          {caption}
        </figcaption>
      )}
      <div className="relative flex-1 flex items-center justify-center min-h-0 p-1">
        <Image
          src={image.src}
          alt={image.alt}
          width={1280}
          height={960}
          sizes={present ? "50vw" : "(min-width: 768px) 30vw, 100vw"}
          className="object-contain w-full h-auto max-h-full"
        />
      </div>
    </figure>
  );
}

function SlideImageR({
  data,
  present,
}: {
  data: SlideImageVisual["data"];
  present?: boolean;
}) {
  return (
    <Image
      src={data.src}
      alt={data.alt}
      width={1920}
      height={1080}
      sizes={present ? "100vw" : "(min-width: 768px) 60vw, 100vw"}
      className={clsx(
        "object-contain w-auto h-auto",
        present ? "max-w-full max-h-full" : "w-full max-h-[70vh]"
      )}
      priority
    />
  );
}

function CardR({ data, present }: { data: CardVisual["data"]; present?: boolean }) {
  const accent =
    data.accent === "warning"
      ? "border-l-4 border-[var(--warning-border)] bg-[var(--warning-bg)]/40"
      : data.accent === "good"
      ? "border-l-4 border-[var(--good)]"
      : "";
  return (
    <div className={clsx("flex flex-col gap-3 rounded-xl p-3 md:p-4", accent)}>
      {data.heading && (
        <h3 className={clsx("font-bold", present ? "text-2xl md:text-3xl" : "text-base md:text-lg")}>
          {data.heading}
        </h3>
      )}
      {data.body && (
        <MarkdownText
          text={data.body}
          className={clsx(present ? "text-xl md:text-2xl" : "text-sm md:text-base")}
        />
      )}
      {data.bullets && data.bullets.length > 0 && (
        <ul className={clsx("list-disc pl-5 space-y-2", present ? "text-xl md:text-2xl" : "text-sm md:text-base")}>
          {data.bullets.map((b, i) => (
            <li key={i} className="visual-bullet leading-relaxed">
              <MarkdownText text={b} inlineOnly />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TableR({ data, present }: { data: TableVisual["data"]; present?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className={clsx("w-full border-collapse", present ? "text-lg md:text-xl" : "text-sm md:text-base")}>
        <thead>
          <tr className="bg-[var(--primary)]/10">
            {data.headers.map((h, i) => (
              <th
                key={i}
                className={clsx(
                  "border border-[var(--card-border)] px-3 py-2 text-left font-semibold",
                  i === 0 && "w-12 text-center"
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, ri) => (
            <tr key={ri} className="even:bg-[var(--card-border)]/20">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={clsx(
                    "border border-[var(--card-border)] px-3 py-2 align-top",
                    ci === 0 && "text-center font-semibold text-[var(--primary)]"
                  )}
                >
                  <MarkdownText text={cell} inlineOnly />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.caption && (
        <p className="text-xs text-[var(--muted)] mt-2 italic">{data.caption}</p>
      )}
    </div>
  );
}

function ComparisonR({
  data,
  present,
}: {
  data: ComparisonVisual["data"];
  present?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className={clsx("w-full border-collapse", present ? "text-lg md:text-xl" : "text-sm md:text-base")}>
        <thead>
          <tr>
            <th className="border border-[var(--card-border)] px-3 py-2 bg-rose-500/10 text-left font-semibold">
              {data.leftHeader}
            </th>
            <th className="border border-[var(--card-border)] px-3 py-2 bg-emerald-500/10 text-left font-semibold">
              {data.rightHeader}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, ri) => (
            <tr key={ri} className="even:bg-[var(--card-border)]/20">
              <td className="border border-[var(--card-border)] px-3 py-2 align-top">
                <MarkdownText text={row.left} inlineOnly />
              </td>
              <td className="border border-[var(--card-border)] px-3 py-2 align-top">
                <MarkdownText text={row.right} inlineOnly />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.caption && (
        <p className="text-xs text-[var(--muted)] mt-2 italic">{data.caption}</p>
      )}
    </div>
  );
}

function QuoteR({ data, present }: { data: QuoteVisual["data"]; present?: boolean }) {
  const cite = data.citationId ? getCitation(data.citationId) : undefined;
  return (
    <figure
      className={clsx(
        "border-l-4 border-[var(--quote-border)] pl-4 md:pl-6 py-2",
        present ? "text-2xl md:text-3xl" : "text-base md:text-lg"
      )}
    >
      <blockquote className="leading-relaxed">「{data.text}」</blockquote>
      {cite && (
        <figcaption className="mt-3 text-sm text-[var(--muted)]">
          — {cite.label}
        </figcaption>
      )}
    </figure>
  );
}

function ListR({ data, present }: { data: ListVisual["data"]; present?: boolean }) {
  const className = clsx(
    data.ordered ? "list-decimal" : "list-disc",
    "pl-6 space-y-3",
    present ? "text-xl md:text-2xl" : "text-sm md:text-base"
  );
  const items = data.items.map((item, i) => (
    <li key={i} className="leading-relaxed visual-bullet">
      <MarkdownText text={item.text} inlineOnly />
      {item.subItems && item.subItems.length > 0 && (
        <ul className="list-disc pl-6 mt-2 space-y-1 text-[0.95em] text-[var(--muted)]">
          {item.subItems.map((s, j) => (
            <li key={j}>
              <MarkdownText text={s} inlineOnly />
            </li>
          ))}
        </ul>
      )}
    </li>
  ));
  return data.ordered ? <ol className={className}>{items}</ol> : <ul className={className}>{items}</ul>;
}

function ImageR({ data, present }: { data: ImageVisual["data"]; present?: boolean }) {
  return (
    <figure className="flex flex-col gap-2">
      <div className={clsx("relative w-full overflow-hidden rounded-lg bg-black/5", present ? "max-h-[70vh]" : "")}>
        <Image
          src={data.src}
          alt={data.alt}
          width={1280}
          height={720}
          className="w-full h-auto object-contain"
          priority
        />
      </div>
      {data.caption && (
        <figcaption className="text-xs md:text-sm text-[var(--muted)] italic">
          {data.caption}
        </figcaption>
      )}
    </figure>
  );
}

function ImageCardR({
  data,
  present,
}: {
  data: ImageCardVisual["data"];
  present?: boolean;
}) {
  return (
    <div className={clsx("grid gap-4 items-start", "md:grid-cols-[5fr_6fr]")}>
      <div className="relative w-full overflow-hidden rounded-xl border border-[var(--card-border)] bg-black/5">
        <Image
          src={data.image.src}
          alt={data.image.alt}
          width={1280}
          height={960}
          className="w-full h-auto object-contain"
          priority
        />
      </div>
      <div className="flex flex-col gap-3">
        <h3 className={clsx("font-bold", present ? "text-2xl md:text-3xl" : "text-base md:text-lg")}>
          {data.heading}
        </h3>
        <ul
          className={clsx(
            "list-disc pl-5 space-y-2",
            present ? "text-xl md:text-2xl" : "text-sm md:text-base"
          )}
        >
          {data.bullets.map((b, i) => (
            <li key={i} className="visual-bullet leading-relaxed">
              <MarkdownText text={b} inlineOnly />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ImageComparisonR({
  data,
  present,
}: {
  data: ImageComparisonVisual["data"];
  present?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <ComparisonImageBlock
          tone="bad"
          header={data.leftHeader}
          image={data.leftImage}
          present={present}
        />
        <ComparisonImageBlock
          tone="good"
          header={data.rightHeader}
          image={data.rightImage}
          present={present}
        />
      </div>
      <div className="overflow-x-auto">
        <table className={clsx("w-full border-collapse", present ? "text-lg md:text-xl" : "text-sm md:text-base")}>
          <tbody>
            {data.rows.map((row, ri) => (
              <tr key={ri} className="even:bg-[var(--card-border)]/20">
                <td className="border border-[var(--card-border)] px-3 py-2 align-top w-1/2">
                  <span className="md:hidden block text-xs font-semibold text-rose-700 mb-1">
                    {data.leftHeader}
                  </span>
                  <MarkdownText text={row.left} inlineOnly />
                </td>
                <td className="border border-[var(--card-border)] px-3 py-2 align-top w-1/2">
                  <span className="md:hidden block text-xs font-semibold text-emerald-700 mb-1">
                    {data.rightHeader}
                  </span>
                  <MarkdownText text={row.right} inlineOnly />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.caption && (
          <p className="text-xs text-[var(--muted)] mt-2 italic">{data.caption}</p>
        )}
      </div>
    </div>
  );
}

function ComparisonImageBlock({
  tone,
  header,
  image,
  present,
}: {
  tone: "good" | "bad";
  header: string;
  image: { src: string; alt: string };
  present?: boolean;
}) {
  return (
    <figure
      className={clsx(
        "rounded-xl overflow-hidden border-2",
        tone === "bad"
          ? "border-rose-500/40 bg-rose-500/5"
          : "border-emerald-500/50 bg-emerald-500/5"
      )}
    >
      <figcaption
        className={clsx(
          "px-3 py-1.5 text-sm font-semibold",
          tone === "bad" ? "bg-rose-500/15 text-rose-800 dark:text-rose-200" : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
        )}
      >
        {header}
      </figcaption>
      <div className={clsx("relative bg-white", present ? "max-h-[40vh]" : "")}>
        <Image
          src={image.src}
          alt={image.alt}
          width={1280}
          height={720}
          className="w-full h-auto object-contain"
        />
      </div>
    </figure>
  );
}
