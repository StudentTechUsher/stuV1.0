'use client';

import React from 'react';

interface MarkdownMessageProps {
  content: string;
}

/**
 * Simple markdown renderer for chat messages
 * Supports: **bold**, *italic*, bullet lists, numbered lists
 */
export default function MarkdownMessage({ content }: Readonly<MarkdownMessageProps>) {
  const parseMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
    let listKey = 0;

    const flushList = () => {
      if (currentList) {
        const ListTag = currentList.type;
        elements.push(
          <ListTag
            key={`list-${listKey++}`}
            className={currentList.type === 'ul' ? 'list-disc ml-4 mb-2' : 'list-decimal ml-4 mb-2'}
          >
            {currentList.items.map((item, i) => (
              <li key={i} className="mb-1">
                {parseInline(item)}
              </li>
            ))}
          </ListTag>
        );
        currentList = null;
      }
    };

    const parseInline = (line: string): React.ReactNode => {
      const parts: React.ReactNode[] = [];
      let remaining = line;
      let key = 0;

      while (remaining.length > 0) {
        // Match **bold**
        const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
        if (boldMatch) {
          parts.push(
            <strong key={`bold-${key++}`} className="font-semibold">
              {boldMatch[1]}
            </strong>
          );
          remaining = remaining.slice(boldMatch[0].length);
          continue;
        }

        // Match *italic*
        const italicMatch = remaining.match(/^\*([^*]+)\*/);
        if (italicMatch) {
          parts.push(
            <em key={`italic-${key++}`} className="italic">
              {italicMatch[1]}
            </em>
          );
          remaining = remaining.slice(italicMatch[0].length);
          continue;
        }

        // Match `code`
        const codeMatch = remaining.match(/^`([^`]+)`/);
        if (codeMatch) {
          parts.push(
            <code key={`code-${key++}`} className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">
              {codeMatch[1]}
            </code>
          );
          remaining = remaining.slice(codeMatch[0].length);
          continue;
        }

        // Regular text - consume until next special character
        const textMatch = remaining.match(/^[^*`]+/);
        if (textMatch) {
          parts.push(<React.Fragment key={`text-${key++}`}>{textMatch[0]}</React.Fragment>);
          remaining = remaining.slice(textMatch[0].length);
          continue;
        }

        // Single character that didn't match anything
        parts.push(<React.Fragment key={`char-${key++}`}>{remaining[0]}</React.Fragment>);
        remaining = remaining.slice(1);
      }

      return <>{parts}</>;
    };

    lines.forEach((line, index) => {
      // Bullet list
      const bulletMatch = line.match(/^[•\-*]\s+(.+)$/);
      if (bulletMatch) {
        if (!currentList || currentList.type !== 'ul') {
          flushList();
          currentList = { type: 'ul', items: [] };
        }
        currentList.items.push(bulletMatch[1]);
        return;
      }

      // Numbered list
      const numberedMatch = line.match(/^\d+\.\s+(.+)$/);
      if (numberedMatch) {
        if (!currentList || currentList.type !== 'ol') {
          flushList();
          currentList = { type: 'ol', items: [] };
        }
        currentList.items.push(numberedMatch[1]);
        return;
      }

      // Not a list item - flush any current list
      flushList();

      // Empty line
      if (line.trim() === '') {
        elements.push(<br key={`br-${index}`} />);
        return;
      }

      // Regular paragraph
      elements.push(
        <p key={`p-${index}`} className="mb-2 last:mb-0">
          {parseInline(line)}
        </p>
      );
    });

    // Flush any remaining list
    flushList();

    return elements;
  };

  return <div className="text-sm">{parseMarkdown(content)}</div>;
}
