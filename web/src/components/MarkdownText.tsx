"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import clsx from "clsx";

interface Props {
  text: string;
  className?: string;
  inlineOnly?: boolean;
}

// Plain markdown renderer. Glossary term popups have been intentionally
// removed — they were noisy on mobile and the per-term hint duplicates the
// dialogue-style narration that explains terms in context.
export function MarkdownText({ text, className, inlineOnly }: Props) {
  if (inlineOnly) {
    return (
      <span className={clsx("markdown-body", className)}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <>{children}</>,
          }}
        >
          {text}
        </ReactMarkdown>
      </span>
    );
  }
  return (
    <div className={clsx("markdown-body", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
