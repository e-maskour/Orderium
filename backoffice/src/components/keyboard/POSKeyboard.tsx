import React, { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useKeyboard } from '../../hooks/useKeyboard';
import type { KeyDefinition, KeyRow } from '../../types/keyboard.types';
import { LanguageSwitcher } from './LanguageSwitcher';
import { frenchLayout } from './layouts/french';
import { arabicLayout } from './layouts/arabic';
import { numericLayout } from './layouts/numeric';
import { symbolsLayout } from './layouts/symbols';
import './keyboard.css';

// ─── Layout map ───────────────────────────────────────────────────────────────

const LAYOUTS = {
  french: frenchLayout,
  arabic: arabicLayout,
  numeric: numericLayout,
  symbols: symbolsLayout,
} as const;

// ─── Key component ────────────────────────────────────────────────────────────

interface KeyProps {
  def: KeyDefinition;
  mode: 'lower' | 'upper';
  isShiftActive: boolean;
  onKey: (key: string) => void;
}

function Key({ def, mode, isShiftActive, onKey }: KeyProps) {
  const [pressed, setPressed] = useState(false);
  const [longPressVisible, setLongPressVisible] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayLabel = (() => {
    if (def.label) return def.label;
    if (def.isAction) return def.value;
    return mode === 'upper' && def.upper ? def.upper : def.value;
  })();

  const emittedValue = (() => {
    if (def.isAction) return def.action ?? def.value;
    return mode === 'upper' && def.upper ? def.upper : def.value;
  })();

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setPressed(true);

      if (def.longPressOptions && def.longPressOptions.length > 0) {
        longPressTimer.current = setTimeout(() => {
          setLongPressVisible(true);
        }, 450);
      }
    },
    [def.longPressOptions],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setPressed(false);

      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }

      if (!longPressVisible) {
        onKey(emittedValue);
      }
    },
    [emittedValue, longPressVisible, onKey],
  );

  const handlePointerLeave = useCallback(() => {
    setPressed(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleLongPressSelect = useCallback(
    (char: string) => {
      setLongPressVisible(false);
      onKey(char);
    },
    [onKey],
  );

  const classes = [
    'pk-key',
    def.isAction ? 'is-action' : '',
    def.action === 'enter' ? 'is-enter' : '',
    def.action === 'backspace' ? 'is-backspace' : '',
    def.action === 'shift' && isShiftActive ? 'is-shift-active' : '',
    pressed ? 'is-pressed' : '',
    def.className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const flexStyle: React.CSSProperties = {
    flex: def.widthMultiplier ?? 1,
  };

  return (
    <div style={{ flex: def.widthMultiplier ?? 1, position: 'relative' }}>
      <button
        className={classes}
        style={{ ...flexStyle, width: '100%' }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        tabIndex={-1}
        aria-label={def.label ?? def.value}
      >
        {displayLabel}
      </button>

      {longPressVisible && def.longPressOptions && (
        <div className="pk-longpress-popup" role="listbox" aria-label="Accented characters">
          {def.longPressOptions.map((opt) => (
            <button
              key={opt}
              role="option"
              className="pk-longpress-option"
              onPointerDown={(e) => {
                e.preventDefault();
                handleLongPressSelect(opt);
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Row component ────────────────────────────────────────────────────────────

interface KeyRowComponentProps {
  row: KeyRow;
  mode: 'lower' | 'upper';
  isShiftActive: boolean;
  onKey: (key: string) => void;
}

function KeyRowComponent({ row, mode, isShiftActive, onKey }: KeyRowComponentProps) {
  return (
    <div className="pk-row">
      {row.keys.map((def, i) => (
        <Key
          key={`${def.value}-${i}`}
          def={def}
          mode={mode}
          isShiftActive={isShiftActive}
          onKey={onKey}
        />
      ))}
    </div>
  );
}

// ─── Drag state ────────────────────────────────────────────────────────────────

interface FloatPosition {
  x: number;
  y: number;
}

interface DragStart {
  startMouseX: number;
  startMouseY: number;
  startPanelX: number;
  startPanelY: number;
}

// ─── POSKeyboard ──────────────────────────────────────────────────────────────

export function POSKeyboard() {
  const { isVisible, layout, mode, capsLock, setLayout, handleKey, hideKeyboard, theme, setTheme } =
    useKeyboard();

  // Drag / floating state
  const [floatPos, setFloatPos] = useState<FloatPosition | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragStart | null>(null);

  const handleDragPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Let button clicks inside the header pass through without starting a drag
      if ((e.target as HTMLElement).closest('button')) return;
      e.preventDefault();

      const panel = panelRef.current;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();

      // Capture the panel's current rendered position/size so width never changes
      const startPanelX = floatPos ? floatPos.x : rect.left;
      const startPanelY = floatPos ? floatPos.y : rect.top;

      // Lock the panel to its current rendered width on first drag
      if (!floatPos) {
        setFloatPos({ x: rect.left, y: rect.top });
        panel.style.width = `${rect.width}px`;
      }

      dragRef.current = {
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startPanelX,
        startPanelY,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [floatPos],
  );

  const handleDragPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startMouseX;
    const dy = e.clientY - dragRef.current.startMouseY;
    setFloatPos({
      x: dragRef.current.startPanelX + dx,
      y: dragRef.current.startPanelY + dy,
    });
  }, []);

  const handleDragPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // Clamp position so the panel stays on-screen
  const clampedPos: FloatPosition | null = floatPos
    ? {
        x: Math.max(8, Math.min(floatPos.x, window.innerWidth - 200)),
        y: Math.max(8, Math.min(floatPos.y, window.innerHeight - 100)),
      }
    : null;

  const isFloating = clampedPos !== null;

  // Fall back to french if layout is somehow 'english' (old state)
  const safeLayout = layout in LAYOUTS ? (layout as keyof typeof LAYOUTS) : 'french';
  const activeLayout = LAYOUTS[safeLayout];
  const isRtl = 'rtl' in activeLayout && activeLayout.rtl === true;
  const isCompact = 'compact' in activeLayout && activeLayout.compact === true;
  const isShiftActive = mode === 'upper' || capsLock;

  const panelClasses = [
    'pos-keyboard-panel',
    isVisible ? 'is-open' : '',
    theme === 'light' ? 'theme-light' : '',
    isFloating ? 'is-floating' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const rowsClasses = ['pk-rows', isRtl ? 'rtl' : '', isCompact ? 'compact' : '']
    .filter(Boolean)
    .join(' ');

  const floatStyle: React.CSSProperties = isFloating
    ? {
        left: clampedPos!.x,
        top: clampedPos!.y,
      }
    : {};

  return createPortal(
    <div className="pos-keyboard-overlay" aria-hidden={!isVisible} data-pos-keyboard="true">
      <div
        ref={panelRef}
        className={panelClasses}
        role="dialog"
        aria-label="Virtual keyboard"
        aria-modal="false"
        style={floatStyle}
      >
        {/* ── Drag handle + controls ── */}
        <div
          className="pk-header"
          onPointerDown={handleDragPointerDown}
          onPointerMove={handleDragPointerMove}
          onPointerUp={handleDragPointerUp}
        >
          <div className="pk-drag-indicator" aria-hidden="true" />
          <div className="pk-header-controls">
            <button
              className="pk-ctrl-btn"
              aria-label={theme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              {theme === 'light' ? (
                // Moon icon
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              ) : (
                // Sun icon
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </button>
            <button
              className="pk-ctrl-btn pk-close-btn"
              aria-label="Fermer le clavier"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={hideKeyboard}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Language / Layout tabs */}
        <LanguageSwitcher activeLayout={safeLayout} onLayoutChange={setLayout} />

        {/* Key rows */}
        <div className={rowsClasses}>
          {activeLayout.rows.map((row: KeyRow, rowIdx: number) => (
            <KeyRowComponent
              key={rowIdx}
              row={row}
              mode={mode}
              isShiftActive={isShiftActive}
              onKey={handleKey}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
