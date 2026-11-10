import { createElement, type ElementType } from 'react';

/**
 * Server-side word splitter for reveal animations. Words stay whole (Arabic letters keep
 * joining) and real spaces remain between them, so the text reads and copies normally.
 */
export function Split({ as = 'h2', text, className, id }: { as?: ElementType; text: string; className?: string; id?: string }) {
  const words = text.split(' ');
  return createElement(
    as,
    { className, id, 'data-split': '' },
    words.flatMap((w, i) => [
      <span className="w" key={i}>
        <span>{w}</span>
      </span>,
      i < words.length - 1 ? ' ' : null,
    ]),
  );
}
