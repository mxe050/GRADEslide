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

/**
 * VisualPanel renders a slide INSIDE a 16:9 container (the .reading-stage in
 * normal mode, the .present-stage in present mode). Both containers are
 * container-query roots, so child fonts scale with cqw + clamp() and the
 * --stage-scale variable inherited from .text-scale-{sm|md|lg}.
 */
export function VisualPanel({ slide, present }: Props) {
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
        "fade-in w-full h-full flex flex-col stage-inner",
        present ? "justify-center text-white" : "justify-start"
      )}
    >
      <div className="mb-2 md:mb-3">
        <span
          className={clsx(
            "stage-section-band",
            present ? "bg-white/15 text-white" : ""
          )}
        >
          {slide.section}
        </span>
        <h2
          className={clsx(
            "stage-title mt-1",
            present ? "text-white" : ""
          )}
        >
          {slide.title}
        </h2>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <Renderer slide={slide} present={present} />
      </div>
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
  const accentClass =
    data.accent === "warning"
      ? "border-l-[6px] border-[var(--warning-border)] bg-[var(--warning-bg)]/60 pl-3"
      : data.accent === "good"
      ? "border-l-[6px] border-[var(--good)] bg-[var(--good-soft)]/40 pl-3"
      : data.accent === "critical"
      ? "border-l-[6px] border-[var(--critical-border)] bg-[var(--critical-soft)]/50 pl-3"
      : data.accent === "info"
      ? "border-l-[6px] border-[var(--info-border)] bg-[var(--info-soft)]/50 pl-3"
      : data.accent === "highlight"
      ? "border-l-[6px] border-[var(--highlight-border)] bg-[var(--highlight-soft)]/50 pl-3"
      : "";
  return (
    <div
      className={clsx(
        "flex-1 flex flex-col gap-3 rounded-xl",
        accentClass
      )}
    >
      {data.heading && (
        <h3
          className={clsx(
            "stage-heading",
            present ? "text-white" : ""
          )}
        >
          {data.heading}
        </h3>
      )}
      {data.body && (
        <div className={clsx("stage-body", present ? "text-white/90" : "")}>
          <MarkdownText text={data.body} />
        </div>
      )}
      {data.bullets && data.bullets.length > 0 && (
        <ul
          className={clsx(
            "stage-bullet list-disc pl-[1.4em] space-y-[0.5em] flex-1 min-h-0",
            present ? "text-white" : ""
          )}
        >
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
  const firstColIsIndex = data.headers[0] === "#" || data.headers[0]?.length === 1;
  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <table className="stage-table w-full border-collapse">
        <thead>
          <tr
            className={clsx(
              present ? "bg-white/15 text-white" : "bg-[var(--primary)] text-white"
            )}
          >
            {data.headers.map((h, i) => (
              <th
                key={i}
                className={clsx(
                  "border border-[var(--card-strong-border)] text-left font-bold align-top",
                  firstColIsIndex && i === 0 && "w-[6%] text-center"
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, ri) => (
            <tr
              key={ri}
              className={clsx(
                present
                  ? ri % 2 === 1
                    ? "bg-white/5"
                    : ""
                  : ri % 2 === 1
                  ? "bg-[var(--primary-soft)]/40"
                  : "bg-[var(--card)]"
              )}
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={clsx(
                    "border border-[var(--card-border)] align-top",
                    firstColIsIndex &&
                      ci === 0 &&
                      "text-center font-bold text-[var(--primary)]"
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
        <p
          className={clsx(
            "stage-caption mt-2 italic",
            present ? "text-white/70" : "text-[var(--muted)]"
          )}
        >
          {data.caption}
        </p>
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
    <div className="flex-1 min-h-0 overflow-auto">
      <table className="stage-table w-full border-collapse">
        <thead>
          <tr>
            <th
              className={clsx(
                "border border-[var(--card-strong-border)] text-left font-bold w-1/2",
                present ? "bg-rose-500/30 text-white" : "bg-[var(--bad)]/15 text-[var(--bad)]"
              )}
            >
              {data.leftHeader}
            </th>
            <th
              className={clsx(
                "border border-[var(--card-strong-border)] text-left font-bold w-1/2",
                present ? "bg-emerald-500/30 text-white" : "bg-[var(--good)]/15 text-[var(--good)]"
              )}
            >
              {data.rightHeader}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, ri) => (
            <tr
              key={ri}
              className={clsx(
                present
                  ? ri % 2 === 1
                    ? "bg-white/5"
                    : ""
                  : ri % 2 === 1
                  ? "bg-[var(--card-border)]/30"
                  : ""
              )}
            >
              <td className="border border-[var(--card-border)] align-top">
                <MarkdownText text={row.left} inlineOnly />
              </td>
              <td className="border border-[var(--card-border)] align-top">
                <MarkdownText text={row.right} inlineOnly />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.caption && (
        <p
          className={clsx(
            "stage-caption mt-2 italic",
            present ? "text-white/70" : "text-[var(--muted)]"
          )}
        >
          {data.caption}
        </p>
      )}
    </div>
  );
}

function QuoteR({ data, present }: { data: QuoteVisual["data"]; present?: boolean }) {
  const cite = data.citationId ? getCitation(data.citationId) : undefined;
  return (
    <figure
      className={clsx(
        "flex-1 flex flex-col justify-center stage-quote border-l-[6px] pl-4 md:pl-5 rounded-r-lg",
        present
          ? "border-[var(--primary-hover)] text-white bg-white/5"
          : "border-[var(--quote-border)] bg-[var(--primary-soft)]/40"
      )}
    >
      <blockquote className="font-medium">「{data.text}」</blockquote>
      {cite && (
        <figcaption
          className={clsx(
            "stage-caption mt-3",
            present ? "text-white/70" : "text-[var(--muted)]"
          )}
        >
          — {cite.label}
        </figcaption>
      )}
    </figure>
  );
}

function ListR({ data, present }: { data: ListVisual["data"]; present?: boolean }) {
  const className = clsx(
    data.ordered ? "list-decimal" : "list-disc",
    "stage-bullet pl-[1.6em] space-y-[0.6em] flex-1 min-h-0",
    present ? "text-white" : ""
  );
  const items = data.items.map((item, i) => (
    <li key={i} className="visual-bullet leading-relaxed">
      <MarkdownText text={item.text} inlineOnly />
      {item.subItems && item.subItems.length > 0 && (
        <ul className="list-disc pl-[1.4em] mt-[0.3em] space-y-[0.3em] text-[0.85em] opacity-90">
          {item.subItems.map((s, j) => (
            <li key={j}>
              <MarkdownText text={s} inlineOnly />
            </li>
          ))}
        </ul>
      )}
    </li>
  ));
  return data.ordered ? (
    <ol className={className}>{items}</ol>
  ) : (
    <ul className={className}>{items}</ul>
  );
}

function ImageR({ data, present }: { data: ImageVisual["data"]; present?: boolean }) {
  return (
    <figure className="flex-1 min-h-0 flex flex-col gap-2 items-center">
      <div
        className={clsx(
          "relative flex-1 min-h-0 w-full overflow-hidden rounded-lg flex items-center justify-center",
          present ? "" : "bg-white border border-[var(--card-border)]"
        )}
      >
        <Image
          src={data.src}
          alt={data.alt}
          width={1600}
          height={900}
          sizes={present ? "100vw" : "(min-width: 768px) 60vw, 100vw"}
          className="w-full h-full object-contain"
          priority
        />
      </div>
      {data.caption && (
        <figcaption
          className={clsx(
            "stage-caption italic text-center",
            present ? "text-white/80" : "text-[var(--muted)]"
          )}
        >
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
    <div className="flex-1 min-h-0 grid gap-3 grid-cols-1 @sm:grid-cols-[5fr_6fr]">
      <div
        className={clsx(
          "relative w-full overflow-hidden rounded-xl flex items-center justify-center",
          present ? "" : "bg-white border border-[var(--card-border)]"
        )}
      >
        <Image
          src={data.image.src}
          alt={data.image.alt}
          width={1280}
          height={960}
          sizes="(min-width: 768px) 30vw, 100vw"
          className="w-full h-auto max-h-full object-contain"
          priority
        />
      </div>
      <div className="flex flex-col gap-2 min-h-0 overflow-auto">
        {data.heading && (
          <h3
            className={clsx(
              "stage-heading",
              present ? "text-white" : ""
            )}
          >
            {data.heading}
          </h3>
        )}
        <ul
          className={clsx(
            "stage-bullet list-disc pl-[1.4em] space-y-[0.5em]",
            present ? "text-white" : ""
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
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <div className="grid grid-cols-2 gap-2 md:gap-3 flex-1 min-h-0">
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
    </div>
  );
}

function ImagePairR({
  data,
  present,
}: {
  data: ImagePairVisual["data"];
  present?: boolean;
}) {
  return (
    <div className="flex-1 min-h-0 grid grid-cols-2 gap-2 md:gap-3">
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
        "rounded-xl overflow-hidden border-2 flex flex-col bg-white min-h-0",
        tone === "bad" ? "border-rose-500/40" : "border-emerald-500/50"
      )}
    >
      {caption && (
        <figcaption
          className={clsx(
            "stage-caption font-semibold text-center px-2 py-1",
            tone === "bad"
              ? "bg-rose-500/15 text-rose-800"
              : "bg-emerald-500/15 text-emerald-800",
            present && "py-1.5"
          )}
        >
          {caption}
        </figcaption>
      )}
      <div className="relative flex-1 min-h-0 flex items-center justify-center p-1">
        <Image
          src={image.src}
          alt={image.alt}
          width={1280}
          height={960}
          sizes="(min-width: 768px) 30vw, 50vw"
          className="object-contain w-full h-full"
        />
      </div>
    </figure>
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
        "rounded-xl overflow-hidden border-2 flex flex-col bg-white min-h-0",
        tone === "bad" ? "border-rose-500/40" : "border-emerald-500/50"
      )}
    >
      <figcaption
        className={clsx(
          "stage-caption font-semibold text-center px-2 py-1",
          tone === "bad"
            ? "bg-rose-500/15 text-rose-800"
            : "bg-emerald-500/15 text-emerald-800",
          present && "py-1.5"
        )}
      >
        {header}
      </figcaption>
      <div className="relative flex-1 min-h-0 flex items-center justify-center p-1">
        <Image
          src={image.src}
          alt={image.alt}
          width={1280}
          height={720}
          sizes="(min-width: 768px) 30vw, 50vw"
          className="object-contain w-full h-full"
        />
      </div>
    </figure>
  );
}
