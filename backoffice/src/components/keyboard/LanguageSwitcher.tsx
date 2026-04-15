import React from 'react';
import type { KeyboardLayout, LayoutTab } from '../../types/keyboard.types';

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS: LayoutTab[] = [
  { id: 'french', label: 'FR', ariaLabel: 'Français AZERTY' },
  { id: 'arabic', label: 'ع', ariaLabel: 'العربية' },
  { id: 'numeric', label: '123', ariaLabel: 'Numeric keypad' },
  { id: 'symbols', label: '@#&', ariaLabel: 'Symbols' },
];

interface LanguageSwitcherProps {
  activeLayout: KeyboardLayout;
  onLayoutChange: (layout: KeyboardLayout) => void;
}

export function LanguageSwitcher({ activeLayout, onLayoutChange }: LanguageSwitcherProps) {
  return (
    <div className="pk-lang-bar" role="tablist" aria-label="Keyboard layout">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeLayout === tab.id}
          aria-label={tab.ariaLabel}
          className={`pk-lang-tab${activeLayout === tab.id ? ' active' : ''}`}
          onPointerDown={(e) => {
            e.preventDefault(); // prevent blur on focused input
            onLayoutChange(tab.id);
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
