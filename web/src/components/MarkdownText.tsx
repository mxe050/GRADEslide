"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import clsx from "clsx";
import { splitTextByTerms } from "@/lib/glossary";
import { GlossaryTerm } from "./GlossaryTerm";

interface Props {
  text: string;
  className?: string;
  inlineOnly?: boolean;
}

function wrapStringWithTerms(text: string, keyPrefix: string): React.ReactNode {
  const segments = splitTextByTerms(text);
  if (segments.length === 1 && segments[0].type === "text") return text;
  return segments.map((seg, i) => {
    if (seg.type === "term" && seg.entry) {
      return (
        <GlossaryTerm key={`${keyPrefix}-${i}`} entry={seg.entry}>
          {seg.text}
        </GlossaryTerm>
      );
    }
    return <React.Fragment key={`${keyPrefix}-${i}`}>{seg.text}</React.Fragment>;
  });
}

function processChildren(
  children: React.ReactNode,
  keyPrefix = "g"
): React.ReactNode {
  return React.Children.map(children, (child, i) => {
    if (typeof child === "string") {
      return wrapStringWithTerms(child, `${keyPrefix}-${i}`);
    }
    return child;
  });
}

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p>{processChildren(children, "p")}</p>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li>{processChildren(children, "li")}</li>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td>{processChildren(children, "td")}</td>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th>{processChildren(children, "th")}</th>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong>{processChildren(children, "strong")}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em>{processChildren(children, "em")}</em>
  ),
};

const inlineComponents = {
  ...mdComponents,
  p: ({ children }: { children?: React.ReactNode }) => (
    <>{processChildren(children, "p")}</>
  ),
};

export function MarkdownText({ text, className, inlineOnly }: Props) {
  if (inlineOnly) {
    return (
      <span className={clsx("markdown-body", className)}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={inlineComponents}>
          {text}
        </ReactMarkdown>
      </span>
    );
  }
  return (
    <div className={clsx("markdown-body", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
