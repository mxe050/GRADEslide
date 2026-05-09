"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import clsx from "clsx";

interface Props {
  text: string;
  className?: string;
  inlineOnly?: boolean;
}

type MdNode = {
  type?: string;
  value?: string;
  children?: MdNode[];
  data?: {
    hName?: string;
  };
};

const remarkPlugins = [remarkGfm, remarkMark];

function remarkMark() {
  return (tree: unknown) => {
    transformMarkSyntax(tree as MdNode);
  };
}

function transformMarkSyntax(parent: MdNode) {
  if (!Array.isArray(parent.children)) return;

  const nextChildren: MdNode[] = [];
  for (const child of parent.children) {
    if (child.type === "text" && typeof child.value === "string") {
      nextChildren.push(...splitMarkText(child.value));
      continue;
    }
    transformMarkSyntax(child);
    nextChildren.push(child);
  }
  parent.children = nextChildren;
}

function splitMarkText(value: string): MdNode[] {
  const parts: MdNode[] = [];
  const pattern = /==([^=\n][\s\S]*?[^=\n]?)==/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: value.slice(lastIndex, match.index) });
    }
    parts.push({
      type: "emphasis",
      data: { hName: "mark" },
      children: [{ type: "text", value: match[1] }],
    });
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < value.length) {
    parts.push({ type: "text", value: value.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: "text", value }];
}

// Plain markdown renderer. Glossary term popups have been intentionally
// removed — they were noisy on mobile and the per-term hint duplicates the
// dialogue-style narration that explains terms in context.
export function MarkdownText({ text, className, inlineOnly }: Props) {
  if (inlineOnly) {
    return (
      <span className={clsx("markdown-body", className)}>
        <ReactMarkdown
          remarkPlugins={remarkPlugins}
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
      <ReactMarkdown remarkPlugins={remarkPlugins}>{text}</ReactMarkdown>
    </div>
  );
}
