"use client";

/**
 * Lightweight markdown renderer for briefing SITREP notes.
 * Supports: headers (# ## ###), **bold**, *italic*, - lists, numbered lists,
 * --- horizontal rules, and `inline code`. No external dependencies.
 */

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listBuffer: { type: "ul" | "ol"; items: string[] } | null = null;
  let key = 0;

  function flushList() {
    if (!listBuffer) return;
    const Tag = listBuffer.type === "ul" ? "ul" : "ol";
    const cls =
      listBuffer.type === "ul"
        ? "list-disc list-inside"
        : "list-decimal list-inside";
    elements.push(
      <Tag
        key={key++}
        className={`${cls} font-mono text-sm text-text-dim leading-relaxed tracking-wide mb-2 ml-2`}
      >
        {listBuffer.items.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </Tag>
    );
    listBuffer = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      flushList();
      elements.push(
        <hr key={key++} className="border-border my-4" />
      );
      continue;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headerMatch) {
      flushList();
      const level = headerMatch[1].length;
      const text = headerMatch[2];
      const cls = {
        1: "font-mono text-base font-bold text-text-bright tracking-wide uppercase mb-2 mt-4",
        2: "font-mono text-sm font-bold text-text-bright tracking-wide uppercase mb-1.5 mt-3",
        3: "font-mono text-xs font-bold text-text-dim tracking-widest uppercase mb-1 mt-2",
      }[level as 1 | 2 | 3];
      elements.push(
        <div key={key++} className={cls}>
          {renderInline(text)}
        </div>
      );
      continue;
    }

    // Unordered list items (- or *)
    const ulMatch = line.match(/^[\-\*]\s+(.+)$/);
    if (ulMatch) {
      if (!listBuffer || listBuffer.type !== "ul") {
        flushList();
        listBuffer = { type: "ul", items: [] };
      }
      listBuffer.items.push(ulMatch[1]);
      continue;
    }

    // Ordered list items (1. 2. etc)
    const olMatch = line.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (!listBuffer || listBuffer.type !== "ol") {
        flushList();
        listBuffer = { type: "ol", items: [] };
      }
      listBuffer.items.push(olMatch[1]);
      continue;
    }

    // Regular text / blank line
    flushList();

    if (line.trim() === "") {
      elements.push(<div key={key++} className="h-3" />);
    } else {
      elements.push(
        <p
          key={key++}
          className="font-mono text-sm text-text-dim leading-relaxed tracking-wide"
        >
          {renderInline(line)}
        </p>
      );
    }
  }

  flushList();

  return <div className="space-y-0.5">{elements}</div>;
}

/**
 * Render inline formatting: **bold**, *italic*, `code`
 */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  // Regex: **bold** | *italic* | `code`
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partKey = 0;

  while ((match = regex.exec(text)) !== null) {
    // Push text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // **bold**
      parts.push(
        <strong key={partKey++} className="text-text-bright font-bold">
          {match[2]}
        </strong>
      );
    } else if (match[4]) {
      // *italic*
      parts.push(
        <em key={partKey++} className="text-accent-dim italic">
          {match[4]}
        </em>
      );
    } else if (match[6]) {
      // `code`
      parts.push(
        <code
          key={partKey++}
          className="bg-bg-elevated text-amber px-1.5 py-0.5 text-xs"
        >
          {match[6]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 && typeof parts[0] === "string"
    ? parts[0]
    : parts;
}
