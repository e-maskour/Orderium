import { X, Square, CheckSquare, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { ReactNode, useEffect, useState } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'whatsapp';

/** One choice inside a `FloatingAction`'s menu. */
export interface FloatingActionMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  hidden?: boolean;
}

export interface FloatingAction {
  id: string;
  label: string;
  icon?: ReactNode;
  /** Ignored when `items` holds more than one choice — the action opens the menu instead. */
  onClick?: () => void;
  /**
   * Turns the action into a menu: a popover above the bar on desktop, a pushed
   * list inside the sheet on mobile. A menu left with a single choice runs that
   * choice directly rather than opening.
   */
  items?: FloatingActionMenuItem[];
  variant?: Variant;
  hidden?: boolean;
}

interface FloatingActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onSelectAll?: () => void;
  isAllSelected?: boolean;
  totalCount?: number;
  actions: FloatingAction[];
  /** Singular/plural label for the item, e.g. "order" */
  itemLabel?: string;
  /**
   * How many actions stay in the bar before the rest collapse into the overflow
   * menu. Defaults to the viewport width — 3 on a narrow window, up to 6 on a
   * wide one.
   */
  maxInlineActions?: number;
}

/** Menu-path entry standing for the overflow list rather than for one action. */
const OVERFLOW_ID = '__fab_overflow__';

/* ─────────────────────────────────────────────────────────
   Scoped CSS — injected once into <head> via <style> tag.
   All class names are prefixed with "fab-" to avoid conflicts.

   The bar and the sheet are one material: the same slate surface,
   the same rows, the same accents. Colours come from the product's
   own slate/blue scale so the bar reads as part of the app rather
   than a widget dropped on top of it.
───────────────────────────────────────────────────────── */
const FAB_STYLES = `
  .fab-scope {
    --fab-surface: #0f172a;
    --fab-raised: #1b2536;
    --fab-line: rgba(148,163,184,0.16);
    --fab-line-strong: rgba(148,163,184,0.26);
    --fab-ink: #f8fafc;
    --fab-ink-mid: #cbd5e1;
    --fab-ink-dim: #8b9cb3;
    --fab-accent: #3b82f6;
    --fab-accent-dim: rgba(59,130,246,0.18);
    --fab-danger: #f87171;
    --fab-danger-dim: rgba(248,113,113,0.15);
    --fab-go: #25d366;
    --fab-go-dim: rgba(37,211,102,0.16);
  }

  @keyframes fab-rise {
    from { opacity: 0; transform: translateY(14px) scale(0.985); }
    to   { opacity: 1; transform: translateY(0)    scale(1); }
  }
  @keyframes fab-slide-up {
    from { opacity: 0; transform: translateY(100%); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fab-menu-in {
    from { opacity: 0; transform: translateY(8px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0)   scale(1); }
  }
  @keyframes fab-tick {
    from { opacity: 0.3; transform: translateY(-0.15em); }
    to   { opacity: 1;   transform: none; }
  }

  /* ═══════════════════════════════
     DESKTOP BAR  (≥ 640 px)
  ═══════════════════════════════ */
  .fab-scrim {
    position: fixed;
    inset: auto 0 0 0;
    height: 8rem;
    z-index: 9990;
    background: linear-gradient(to top, rgba(15,23,42,0.14), transparent);
    pointer-events: none;
  }
  .fab-wrap {
    position: fixed;
    inset: auto 0 1.75rem 0;
    z-index: 9999;
    display: flex;
    justify-content: center;
    padding: 0 1.5rem;
    pointer-events: none;
  }
  .fab-bar {
    position: relative;
    max-width: min(92vw, 74rem);
    width: max-content;
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.5rem 0.5rem 0.875rem;
    border-radius: 0.9rem;
    background: rgba(15, 23, 42, 0.94);
    border: 1px solid var(--fab-line);
    backdrop-filter: blur(28px) saturate(180%);
    -webkit-backdrop-filter: blur(28px) saturate(180%);
    box-shadow:
      0 20px 48px -12px rgba(15,23,42,0.5),
      0 4px 12px -4px rgba(15,23,42,0.32),
      inset 0 1px 0 rgba(255,255,255,0.06);
    animation: fab-rise 0.26s cubic-bezier(0.22,1,0.36,1) both;
  }

  /* selection progress — clipped to the bar's radius, never over the buttons */
  .fab-bar__track {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    overflow: hidden;
    pointer-events: none;
  }
  .fab-bar__track::before {
    content: '';
    position: absolute;
    inset: auto 0 0 0;
    height: 2px;
    background: var(--fab-progress-bg, rgba(148,163,184,0.14));
  }
  .fab-bar__progress {
    position: absolute;
    bottom: 0;
    inset-inline-start: 0;
    height: 2px;
    background: var(--fab-accent);
    box-shadow: 0 0 10px rgba(59,130,246,0.55);
    transition: width 0.42s cubic-bezier(0.22,1,0.36,1);
  }

  /* count — plain and tabular; no decoration layered over information */
  .fab-count {
    display: inline-flex;
    align-items: baseline;
    gap: 0.3rem;
    flex-shrink: 0;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .fab-count__num {
    font-size: 1.0625rem; font-weight: 700; line-height: 1;
    letter-spacing: -0.02em;
    color: var(--fab-ink);
    animation: fab-tick 0.2s ease-out;
  }
  .fab-count__of  { font-size: 0.8rem; color: var(--fab-ink-dim); line-height: 1; }
  .fab-count__lbl { font-size: 0.78rem; color: var(--fab-ink-mid); font-weight: 500; line-height: 1; }

  /* select-all toggle */
  .fab-chk {
    flex-shrink: 0;
    display: inline-flex; align-items: center; justify-content: center;
    width: 1.875rem; height: 1.875rem;
    border-radius: 0.5rem;
    background: transparent;
    border: 1px solid var(--fab-line);
    color: var(--fab-ink-dim);
    cursor: pointer; padding: 0;
    transition: background 0.14s, color 0.14s, border-color 0.14s;
  }
  .fab-chk:hover { background: rgba(148,163,184,0.12); color: var(--fab-ink); }
  .fab-chk--on   { background: var(--fab-accent-dim); border-color: rgba(59,130,246,0.45); color: #93c5fd; }

  .fab-sep    { width: 1px; height: 1.5rem; background: var(--fab-line); flex-shrink: 0; }
  .fab-spacer { flex: 1 1 1.25rem; min-width: 0.75rem; }

  .fab-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  /* action buttons */
  .fab-btn {
    display: inline-flex; align-items: center; gap: 0.375rem;
    padding: 0.4375rem 0.7rem;
    border-radius: 0.5rem;
    font: 600 0.8125rem/1 inherit;
    white-space: nowrap;
    border: 1px solid transparent;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.14s, border-color 0.14s, color 0.14s;
  }
  .fab-btn:active { transform: scale(0.97); }
  .fab-btn--primary         { background: var(--fab-accent); color: #fff; box-shadow: 0 1px 8px rgba(59,130,246,0.3); }
  .fab-btn--primary:hover   { background: #2563eb; }
  .fab-btn--secondary       { background: transparent; color: var(--fab-ink-mid); }
  .fab-btn--secondary:hover { background: rgba(148,163,184,0.13); color: var(--fab-ink); }
  .fab-btn--danger          { background: transparent; color: var(--fab-danger); }
  .fab-btn--danger:hover    { background: var(--fab-danger-dim); }
  .fab-btn--whatsapp        { background: transparent; color: #4ade80; }
  .fab-btn--whatsapp:hover  { background: var(--fab-go-dim); color: #86efac; }

  /* overflow trigger — icon only; the name lives in the tooltip and the menu header */
  .fab-more {
    display: inline-flex; align-items: center; justify-content: center;
    width: 1.875rem; height: 1.875rem;
    border-radius: 0.5rem;
    background: transparent;
    border: 1px solid var(--fab-line);
    color: var(--fab-ink-mid);
    cursor: pointer; padding: 0; flex-shrink: 0;
    transition: background 0.14s, color 0.14s, border-color 0.14s;
  }
  .fab-more:hover, .fab-more--on {
    background: rgba(148,163,184,0.14);
    border-color: var(--fab-line-strong);
    color: var(--fab-ink);
  }

  .fab-close {
    flex-shrink: 0;
    display: inline-flex; align-items: center; justify-content: center;
    width: 1.875rem; height: 1.875rem;
    border-radius: 0.5rem;
    background: transparent;
    border: 1px solid transparent;
    color: var(--fab-ink-dim);
    cursor: pointer; padding: 0; font-family: inherit;
    transition: background 0.14s, color 0.14s;
  }
  .fab-close:hover { background: var(--fab-danger-dim); color: var(--fab-danger); }

  /* ═══════════════════════════════
     MENU — popover above the bar.
     Anchored to .fab-bar, not to the action row, so it is never clipped.
  ═══════════════════════════════ */
  .fab-menu {
    position: absolute;
    bottom: calc(100% + 0.5rem);
    inset-inline-end: 0;
    width: 15rem;
    max-height: min(60vh, 21rem);
    display: flex;
    flex-direction: column;
    border-radius: 0.75rem;
    background: var(--fab-raised);
    border: 1px solid var(--fab-line-strong);
    box-shadow: 0 20px 44px -12px rgba(15,23,42,0.6), 0 4px 10px -4px rgba(15,23,42,0.4);
    overflow: hidden;
    z-index: 10000;
    animation: fab-menu-in 0.16s cubic-bezier(0.22,1,0.36,1) both;
  }
  .fab-menu__hd {
    display: flex; align-items: center; gap: 0.375rem;
    padding: 0.5rem 0.625rem;
    border-bottom: 1px solid var(--fab-line);
    font-size: 0.75rem; font-weight: 600;
    color: var(--fab-ink-dim);
    flex-shrink: 0;
  }
  .fab-menu__back {
    display: inline-flex; align-items: center; justify-content: center;
    width: 1.375rem; height: 1.375rem;
    margin-inline-start: -0.125rem;
    border-radius: 0.375rem;
    border: none; background: transparent;
    color: var(--fab-ink-dim); cursor: pointer; padding: 0;
    transition: background 0.14s, color 0.14s;
  }
  .fab-menu__back:hover { background: rgba(148,163,184,0.14); color: var(--fab-ink); }
  .fab-menu__list {
    display: flex; flex-direction: column;
    gap: 0.0625rem;
    padding: 0.25rem;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  /* ─── Rows — shared by the desktop popover and the mobile sheet ─── */
  .fab-row {
    display: flex; align-items: center; gap: 0.625rem;
    width: 100%;
    padding: 0.5rem;
    border: none; background: transparent;
    border-radius: 0.5rem;
    font: 600 0.8125rem/1.25 inherit;
    color: var(--fab-ink);
    cursor: pointer;
    text-align: start;
    transition: background 0.13s;
  }
  .fab-row:hover  { background: rgba(148,163,184,0.13); }
  .fab-row:active { background: rgba(148,163,184,0.2); }
  .fab-row__icon {
    display: flex; align-items: center; justify-content: center;
    width: 1.125rem; height: 1.125rem;
    flex-shrink: 0;
    color: var(--fab-ink-dim);
  }
  .fab-row__label { flex: 1; min-width: 0; }
  .fab-row__more  { flex-shrink: 0; color: var(--fab-ink-dim); }
  [dir='rtl'] .fab-row__more { transform: scaleX(-1); }

  .fab-row--primary  .fab-row__icon  { color: #93c5fd; }
  .fab-row--whatsapp .fab-row__icon  { color: #4ade80; }
  .fab-row--danger   .fab-row__icon  { color: var(--fab-danger); }
  .fab-row--danger   .fab-row__label { color: var(--fab-danger); }

  /* dark, unobtrusive scrollbars for both scrolling lists */
  .fab-menu__list, .fab-sheet__list {
    scrollbar-width: thin;
    scrollbar-color: rgba(148,163,184,0.35) transparent;
  }
  .fab-menu__list::-webkit-scrollbar,
  .fab-sheet__list::-webkit-scrollbar { width: 6px; }
  .fab-menu__list::-webkit-scrollbar-thumb,
  .fab-sheet__list::-webkit-scrollbar-thumb {
    background: rgba(148,163,184,0.32);
    border-radius: 3px;
  }
  .fab-menu__list::-webkit-scrollbar-track,
  .fab-sheet__list::-webkit-scrollbar-track { background: transparent; }

  /* ═══════════════════════════════
     MOBILE SHEET  (< 640 px)
     Same surface as the bar; actions become one scrollable list.
  ═══════════════════════════════ */
  .fab-sheet {
    position: fixed;
    inset: auto 0 0 0;
    z-index: 9999;
    background: var(--fab-surface);
    border-radius: 1.125rem 1.125rem 0 0;
    border-top: 1px solid var(--fab-line);
    box-shadow: 0 -12px 36px rgba(15,23,42,0.34);
    padding-bottom: calc(3.5rem + env(safe-area-inset-bottom, 0px) + 0.5rem);
    animation: fab-slide-up 0.24s cubic-bezier(0.22,1,0.36,1) both;
  }
  .fab-sheet::before {
    content: '';
    display: block;
    width: 2.25rem; height: 3px;
    border-radius: 9999px;
    background: var(--fab-line-strong);
    margin: 0.5rem auto 0;
  }
  .fab-sheet__hd {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.625rem 0.875rem 0.625rem 1rem;
  }
  .fab-sheet__title {
    flex: 1; min-width: 0;
    display: flex; align-items: baseline; gap: 0.3rem;
    font-variant-numeric: tabular-nums;
    white-space: nowrap; overflow: hidden;
  }
  .fab-sheet__track {
    height: 2px;
    margin-inline: 1rem;
    border-radius: 2px;
    background: var(--fab-progress-bg, rgba(148,163,184,0.14));
    overflow: hidden;
  }
  .fab-sheet__progress {
    height: 100%;
    border-radius: 2px;
    background: var(--fab-accent);
    transition: width 0.42s cubic-bezier(0.22,1,0.36,1);
  }
  .fab-sheet__list {
    display: flex; flex-direction: column;
    gap: 0.125rem;
    padding: 0.5rem;
    max-height: min(52vh, 24rem);
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .fab-sheet__list .fab-row { padding: 0.75rem 0.5rem; font-size: 0.875rem; }
  .fab-sheet__list .fab-row__icon { width: 1.25rem; height: 1.25rem; }
  .fab-sheet__back {
    display: flex; align-items: center; gap: 0.35rem;
    align-self: flex-start;
    padding: 0.3rem 0.5rem;
    margin-bottom: 0.125rem;
    border: none; background: transparent;
    border-radius: 0.5rem;
    font: 600 0.75rem/1 inherit;
    color: var(--fab-ink-dim); cursor: pointer;
  }
  .fab-sheet__back:hover { background: rgba(148,163,184,0.13); color: var(--fab-ink); }
  [dir='rtl'] .fab-sheet__back svg { transform: scaleX(-1); }

  /* ─── Focus ──────────────────────────────────────────── */
  .fab-btn:focus-visible,
  .fab-row:focus-visible,
  .fab-chk:focus-visible,
  .fab-more:focus-visible,
  .fab-close:focus-visible,
  .fab-menu__back:focus-visible,
  .fab-sheet__back:focus-visible {
    outline: 2px solid var(--fab-accent);
    outline-offset: 2px;
  }

  /* ─── Breakpoint gating ──────────────────────────────── */
  @media (min-width: 640px) { .fab-sheet { display: none !important; } }
  @media (max-width: 639px) { .fab-wrap, .fab-scrim { display: none !important; } }

  /* ─── Tablet: lift the bar above the mobile bottom nav ── */
  @media (min-width: 640px) and (max-width: 1023px) {
    .fab-wrap { inset: auto 0 calc(3.5rem + env(safe-area-inset-bottom, 0px) + 0.75rem) 0; }
    .fab-scrim { bottom: calc(3.5rem + env(safe-area-inset-bottom, 0px)); }
  }

  @media (prefers-reduced-motion: reduce) {
    .fab-bar, .fab-sheet, .fab-menu, .fab-count__num { animation: none; }
    .fab-bar__progress, .fab-sheet__progress { transition: none; }
    .fab-btn:active { transform: none; }
  }
` as const;

function btnClass(v?: Variant) {
  if (v === 'danger') return 'fab-btn fab-btn--danger';
  if (v === 'secondary') return 'fab-btn fab-btn--secondary';
  if (v === 'whatsapp') return 'fab-btn fab-btn--whatsapp';
  return 'fab-btn fab-btn--primary';
}

function rowClass(v?: Variant) {
  if (v === 'danger') return 'fab-row fab-row--danger';
  if (v === 'secondary') return 'fab-row fab-row--secondary';
  if (v === 'whatsapp') return 'fab-row fab-row--whatsapp';
  return 'fab-row fab-row--primary';
}

/** One entry in a list — an action, or a choice inside an action's menu. */
interface Row {
  id: string;
  label: string;
  icon?: ReactNode;
  variant?: Variant;
  hasChildren?: boolean;
  onSelect: () => void;
}

function RowButton({ row }: { row: Row }) {
  return (
    <button type="button" role="menuitem" className={rowClass(row.variant)} onClick={row.onSelect}>
      <span className="fab-row__icon">{row.icon}</span>
      <span className="fab-row__label">{row.label}</span>
      {row.hasChildren && (
        <ChevronRight className="fab-row__more" style={{ width: '0.9rem', height: '0.9rem' }} />
      )}
    </button>
  );
}

export function FloatingActionBar({
  selectedCount,
  onClearSelection,
  onSelectAll,
  isAllSelected = false,
  totalCount,
  actions,
  itemLabel,
  maxInlineActions,
}: FloatingActionBarProps) {
  const { t } = useLanguage();

  /**
   * Path to the open menu: [] closed, [actionId] one action's menu,
   * [OVERFLOW_ID] the overflow list, [OVERFLOW_ID, actionId] a menu reached
   * through it. Going back pops one level.
   */
  const [menuPath, setMenuPath] = useState<string[]>([]);

  // How many actions fit in the bar before the rest collapse behind "More".
  const [inlineCap, setInlineCap] = useState(4);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const steps = [
      { mq: window.matchMedia('(min-width: 1600px)'), cap: 6 },
      { mq: window.matchMedia('(min-width: 1280px)'), cap: 5 },
      { mq: window.matchMedia('(min-width: 1024px)'), cap: 4 },
    ];
    const apply = () => setInlineCap(steps.find((s) => s.mq.matches)?.cap ?? 3);
    apply();
    steps.forEach(({ mq }) => mq.addEventListener('change', apply));
    return () => steps.forEach(({ mq }) => mq.removeEventListener('change', apply));
  }, []);

  // Dismiss on a click outside the component, or on Escape.
  useEffect(() => {
    if (menuPath.length === 0) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Element | null;
      if (!target?.closest?.('[data-fab]')) setMenuPath([]);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuPath([]);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuPath.length]);

  // A changed selection can invalidate the open menu's actions — close it.
  useEffect(() => setMenuPath([]), [selectedCount]);

  if (selectedCount === 0) return null;

  const progressPct =
    totalCount && totalCount > 0
      ? Math.min(100, Math.round((selectedCount / totalCount) * 100))
      : null;

  // Resolve each action's menu down to the choices actually on offer, then drop
  // any menu action left with nothing to show.
  const visible = actions
    .filter((a) => !a.hidden)
    .map((a) => (a.items ? { ...a, items: a.items.filter((i) => !i.hidden) } : a))
    .filter((a) => !a.items || a.items.length > 0);

  /** A single remaining choice isn't worth a menu — the button just runs it. */
  const hasMenu = (action: FloatingAction) => (action.items?.length ?? 0) > 1;

  // One leftover action is not worth hiding behind "More".
  const cap = maxInlineActions ?? inlineCap;
  const overflows = visible.length > cap + 1;
  const inlineActions = overflows ? visible.slice(0, cap) : visible;
  const overflowActions = overflows ? visible.slice(cap) : [];

  const openMenu = (path: string[]) =>
    setMenuPath((current) => (current.join(' ') === path.join(' ') ? [] : path));

  const runAction = (action: FloatingAction, path: string[] = []) => {
    if (hasMenu(action)) {
      openMenu([...path, action.id]);
      return;
    }
    setMenuPath([]);
    if (action.items?.length === 1) action.items[0].onClick();
    else action.onClick?.();
  };

  const toRow = (action: FloatingAction, path: string[] = []): Row => ({
    id: action.id,
    label: action.label,
    icon: action.icon,
    variant: action.variant,
    hasChildren: hasMenu(action),
    onSelect: () => runAction(action, path),
  });

  const toChoiceRow = (item: FloatingActionMenuItem, variant?: Variant): Row => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    variant,
    onSelect: () => {
      setMenuPath([]);
      item.onClick();
    },
  });

  /** What the open menu should render — title, rows, and whether it can go back. */
  const menu = (() => {
    if (menuPath.length === 0) return null;
    const [first, second] = menuPath;

    if (first === OVERFLOW_ID && !second) {
      if (overflowActions.length === 0) return null;
      return {
        title: t('moreActions'),
        canGoBack: false,
        rows: overflowActions.map((a) => toRow(a, [OVERFLOW_ID])),
      };
    }

    const parent = visible.find((a) => a.id === (second ?? first));
    if (!parent?.items) return null;
    return {
      title: parent.label,
      canGoBack: menuPath.length > 1,
      rows: parent.items.map((i) => toChoiceRow(i, parent.variant)),
    };
  })();

  const goBack = () => setMenuPath((current) => current.slice(0, -1));

  const countLabel = itemLabel ?? t('selected');
  const selectAllTitle = isAllSelected ? t('deselectAll') : t('selectAll');

  const selectAllButton = onSelectAll && totalCount != null && (
    <button
      type="button"
      className={`fab-chk${isAllSelected ? ' fab-chk--on' : ''}`}
      onClick={onSelectAll}
      title={selectAllTitle}
      aria-label={selectAllTitle}
      aria-pressed={isAllSelected}
    >
      {isAllSelected ? (
        <CheckSquare style={{ width: '0.9rem', height: '0.9rem' }} />
      ) : (
        <Square style={{ width: '0.9rem', height: '0.9rem' }} />
      )}
    </button>
  );

  const count = (
    <>
      <span className="fab-count__num" key={selectedCount}>
        {selectedCount}
      </span>
      {totalCount != null && <span className="fab-count__of">/ {totalCount}</span>}
      <span className="fab-count__lbl">{countLabel}</span>
    </>
  );

  return (
    <>
      <style>{FAB_STYLES}</style>

      {/* DESKTOP — floating bar (≥ 640px) */}
      <div className="fab-scrim" />
      <div className="fab-wrap fab-scope" data-fab>
        <div className="fab-bar">
          {/* Selection progress, clipped to the bar's radius */}
          <div className="fab-bar__track">
            <div
              className="fab-bar__progress"
              style={{ width: progressPct !== null ? `${progressPct}%` : '0%' }}
            />
          </div>

          <div className="fab-count">{count}</div>

          {selectAllButton}

          <div className="fab-spacer" />

          <div className="fab-actions">
            {inlineActions.map((action) => {
              const expanded = menuPath.length === 1 && menuPath[0] === action.id;
              return (
                <button
                  key={action.id}
                  type="button"
                  className={btnClass(action.variant)}
                  onClick={() => runAction(action)}
                  title={action.label}
                  aria-haspopup={hasMenu(action) ? 'menu' : undefined}
                  aria-expanded={hasMenu(action) ? expanded : undefined}
                >
                  {action.icon}
                  {action.label}
                  {hasMenu(action) && (
                    <ChevronRight
                      style={{
                        width: '0.75rem',
                        height: '0.75rem',
                        opacity: 0.65,
                        transform: 'rotate(-90deg)',
                      }}
                    />
                  )}
                </button>
              );
            })}

            {overflowActions.length > 0 && (
              <button
                type="button"
                className={`fab-more${menuPath[0] === OVERFLOW_ID ? ' fab-more--on' : ''}`}
                onClick={() => openMenu([OVERFLOW_ID])}
                title={t('moreActions')}
                aria-label={t('moreActions')}
                aria-haspopup="menu"
                aria-expanded={menuPath[0] === OVERFLOW_ID}
              >
                <MoreHorizontal style={{ width: '1rem', height: '1rem' }} />
              </button>
            )}
          </div>

          <div className="fab-sep" />

          <button type="button" className="fab-close" onClick={onClearSelection} title={t('close')}>
            <X style={{ width: '0.9rem', height: '0.9rem' }} />
          </button>

          {/* Menu — anchored to the bar so the action row can never clip it */}
          {menu && (
            <div className="fab-menu" role="menu" aria-label={menu.title}>
              <div className="fab-menu__hd">
                {menu.canGoBack && (
                  <button
                    type="button"
                    className="fab-menu__back"
                    onClick={goBack}
                    aria-label={t('back')}
                  >
                    <ChevronLeft style={{ width: '0.85rem', height: '0.85rem' }} />
                  </button>
                )}
                {menu.title}
              </div>
              <div className="fab-menu__list">
                {menu.rows.map((row) => (
                  <RowButton key={row.id} row={row} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE — bottom sheet (< 640px). Every action is listed; the list scrolls. */}
      <div className="fab-sheet fab-scope" data-fab>
        <div className="fab-sheet__hd">
          <span className="fab-sheet__title">{count}</span>
          {selectAllButton}
          <button
            type="button"
            className="fab-close"
            onClick={onClearSelection}
            aria-label={t('close')}
          >
            <X style={{ width: '0.9rem', height: '0.9rem' }} />
          </button>
        </div>

        {progressPct !== null && (
          <div className="fab-sheet__track">
            <div className="fab-sheet__progress" style={{ width: `${progressPct}%` }} />
          </div>
        )}

        {visible.length > 0 && (
          <div className="fab-sheet__list" role="menu">
            {menu ? (
              <>
                <button type="button" className="fab-sheet__back" onClick={goBack}>
                  <ChevronLeft style={{ width: '0.85rem', height: '0.85rem' }} />
                  {menu.title}
                </button>
                {menu.rows.map((row) => (
                  <RowButton key={row.id} row={row} />
                ))}
              </>
            ) : (
              visible.map((action) => <RowButton key={action.id} row={toRow(action)} />)
            )}
          </div>
        )}
      </div>
    </>
  );
}
