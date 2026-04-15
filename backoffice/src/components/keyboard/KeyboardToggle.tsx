import React from 'react';
import { useKeyboard } from '../../hooks/useKeyboard';

/**
 * KeyboardToggle — global floating action button (bottom-right of every page).
 * Renders via a portal in App.tsx so it is always on screen.
 */
export function KeyboardToggle() {
  const { isVisible, hideKeyboard, showKeyboard } = useKeyboard();

  const handleClick = () => {
    if (isVisible) {
      hideKeyboard();
    } else {
      const dummyRef = { current: null } as React.RefObject<HTMLInputElement | null>;
      showKeyboard(dummyRef, '', {});
    }
  };

  return (
    <div className={`pk-fab-wrapper${isVisible ? ' pk-fab-wrapper--active' : ''}`}>
      <button
        type="button"
        onClick={handleClick}
        onMouseDown={(e) => e.preventDefault()}
        aria-label={isVisible ? 'Masquer le clavier' : 'Afficher le clavier'}
        aria-pressed={isVisible}
        className={`pk-fab${isVisible ? ' pk-fab--active' : ''}`}
      >
        {/* Keyboard SVG icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
          <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
        </svg>
      </button>
    </div>
  );
}
