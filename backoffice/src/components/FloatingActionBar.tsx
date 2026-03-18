import { X, Square, CheckSquare } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { ReactNode } from 'react';

export interface FloatingAction {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
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
}

/* ─────────────────────────────────────────────────────────
   Scoped CSS — injected once into <head> via <style> tag.
   All class names are prefixed with "fab-" to avoid conflicts.
───────────────────────────────────────────────────────── */
const FAB_STYLES = `
  @keyframes fab-bounce-in {
    0%   { opacity: 0; transform: translateY(24px) scale(0.96); }
    65%  { opacity: 1; transform: translateY(-5px) scale(1.015); }
    100% { opacity: 1; transform: translateY(0)    scale(1); }
  }
  @keyframes fab-slide-up {
    from { opacity: 0; transform: translateY(100%); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ═══════════════════════════════
     DESKTOP PILL  (≥ 640 px)
  ═══════════════════════════════ */
  .fab-scrim {
    position: fixed;
    inset: auto 0 0 0;
    height: 9rem;
    z-index: 9990;
    background: linear-gradient(to top, rgba(0,0,0,0.16), transparent);
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
  .fab-pill {
    max-width: 60rem;
    width: 100%;
    pointer-events: auto;
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.875rem 0.75rem;
    border-radius: 1rem;
    background: rgba(9, 11, 19, 0.94);
    border: 1px solid rgba(255,255,255,0.07);
    backdrop-filter: blur(36px) saturate(200%);
    -webkit-backdrop-filter: blur(36px) saturate(200%);
    box-shadow: 0 24px 60px -8px rgba(0,0,0,0.55), 0 6px 18px -3px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05);
    animation: fab-bounce-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
  }

  /* progress stripe */
  .fab-pill::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 2px;
    background: var(--fab-progress-bg, rgba(255,255,255,0.04));
  }
  .fab-pill__progress {
    position: absolute;
    top: 0; left: 0;
    height: 2px;
    background: linear-gradient(90deg, #1e3a8a, #235ae4, #60a5fa);
    border-radius: 0 2px 2px 0;
    box-shadow: 0 0 8px rgba(35,90,228,0.65);
    transition: width 0.5s cubic-bezier(0.4,0,0.2,1);
    pointer-events: none;
  }

  /* left badge */
  .fab-pill__badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.7rem 0.3rem 0.55rem;
    border-radius: 0.5rem;
    background: linear-gradient(135deg, #1e3a8a 0%, #235ae4 60%, #3b82f6 100%);
    box-shadow: 0 2px 8px rgba(35,90,228,0.4), inset 0 1px 0 rgba(255,255,255,0.2);
    flex-shrink: 0;
    white-space: nowrap;
  }
  .fab-pill__badge-num  { font-weight: 800; color: #fff; font-size: 0.875rem; letter-spacing: -0.03em; line-height: 1; }
  .fab-pill__badge-of   { color: rgba(255,255,255,0.38); font-size: 0.7rem; line-height: 1; margin: 0 0.1rem; }
  .fab-pill__badge-lbl  { color: rgba(255,255,255,0.68); font-size: 0.72rem; font-weight: 500; }

  /* select-all icon-only checkbox */
  .fab-pill__chk {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.5rem;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.09);
    color: rgba(255,255,255,0.45);
    cursor: pointer;
    padding: 0;
    transition: background 0.14s, color 0.14s, border-color 0.14s;
  }
  .fab-pill__chk:hover { background: rgba(255,255,255,0.12); color: #fff; border-color: rgba(255,255,255,0.18); }
  .fab-pill__chk--active { background: rgba(37,99,235,0.28); border-color: rgba(37,99,235,0.55); color: #60a5fa; }

  /* divider */
  .fab-pill__div {
    width: 1px; height: 1.5rem;
    background: rgba(255,255,255,0.08);
    flex-shrink: 0;
  }

  /* spacer — pushes actions to the right */
  .fab-pill__spacer { flex: 1; min-width: 0.25rem; }

  /* actions row — right-aligned, scrollable */
  .fab-pill__actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
    max-width: 60%;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .fab-pill__actions::-webkit-scrollbar { display: none; }

  /* action buttons (desktop pill) */
  .fab-btn {
    display: inline-flex; align-items: center; gap: 0.325rem;
    padding: 0.375rem 0.65rem;
    border-radius: 0.5rem;
    font: 600 0.78rem/1 inherit;
    white-space: nowrap;
    border: none;
    cursor: pointer;
    flex-shrink: 0;
    transition: transform 0.12s, opacity 0.12s;
  }
  .fab-btn:hover  { transform: translateY(-1px); opacity: 0.85; }
  .fab-btn:active { transform: scale(0.94); opacity: 1; }
  .fab-btn--default         { background: rgba(37,99,235,0.85); color: #fff; box-shadow: 0 2px 6px rgba(37,99,235,0.28); }
  .fab-btn--default:hover   { background: rgba(37,99,235,1); opacity: 1; }
  .fab-btn--secondary       { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.72); border: 1px solid rgba(255,255,255,0.09); }
  .fab-btn--secondary:hover { background: rgba(255,255,255,0.14); opacity: 1; }
  .fab-btn--danger          { background: rgba(239,68,68,0.14); color: #f87171; border: 1px solid rgba(239,68,68,0.22); }
  .fab-btn--danger:hover    { background: rgba(239,68,68,0.22); opacity: 1; }

  /* close button */
  .fab-close {
    flex-shrink: 0;
    display: inline-flex; align-items: center; justify-content: center;
    width: 2rem; height: 2rem;
    border-radius: 0.5rem;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    color: rgba(255,255,255,0.35);
    cursor: pointer; padding: 0; font-family: inherit;
    transition: background 0.14s, color 0.14s, border-color 0.14s, transform 0.18s;
  }
  .fab-close:hover  { background: rgba(239,68,68,0.18); color: #f87171; border-color: rgba(239,68,68,0.22); transform: rotate(90deg); }
  .fab-close:active { transform: rotate(90deg) scale(0.9); }

  /* ═══════════════════════════════
     MOBILE SHEET  (< 640 px)
  ═══════════════════════════════ */
  .fab-sheet {
    position: fixed;
    inset: auto 0 0 0;
    z-index: 9999;
    background: #ffffff;
    border-radius: 1.25rem 1.25rem 0 0;
    border-top: 1px solid rgba(0,0,0,0.06);
    box-shadow: 0 -4px 30px rgba(0,0,0,0.1), 0 -1px 0 rgba(0,0,0,0.03);
    padding-bottom: env(safe-area-inset-bottom, 0.75rem);
    animation: fab-slide-up 0.28s cubic-bezier(0.4,0,0.2,1) both;
  }

  /* drag handle */
  .fab-sheet::before {
    content: '';
    display: block;
    width: 2.75rem; height: 4px;
    border-radius: 9999px;
    background: #e2e8f0;
    margin: 0.625rem auto 0;
  }

  /* header row */
  .fab-sheet__hd {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem 0.75rem;
  }
  .fab-sheet__count {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 1.75rem; height: 1.75rem;
    padding: 0 0.4rem;
    border-radius: 0.5rem;
    background: linear-gradient(135deg, #1e40af, #3b82f6);
    color: #fff;
    font-size: 0.875rem; font-weight: 800; letter-spacing: -0.025em;
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(37,99,235,0.32);
  }
  .fab-sheet__title {
    flex: 1;
    font-size: 0.875rem; font-weight: 600; color: #1e293b;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .fab-sheet__title { flex: 1; font-size: 0.875rem; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .fab-sheet__of { color: #94a3b8; font-weight: 400; font-size: 0.78rem; }

  /* select-all icon-only checkbox */
  .fab-sheet__chk {
    display: inline-flex; align-items: center; justify-content: center;
    width: 2rem; height: 2rem; border-radius: 0.5rem;
    background: #f1f5f9; border: 1.5px solid #e2e8f0;
    color: #94a3b8; cursor: pointer; padding: 0; flex-shrink: 0;
    transition: background 0.14s, color 0.14s, border-color 0.14s;
  }
  .fab-sheet__chk:hover   { background: #e2e8f0; color: #475569; border-color: #cbd5e1; }
  .fab-sheet__chk--active { background: #eff6ff; border-color: #93c5fd; color: #2563eb; }

  .fab-sheet__close {
    display: flex; align-items: center; justify-content: center;
    width: 2rem; height: 2rem;
    border-radius: 50%;
    background: #f1f5f9; border: none;
    color: #94a3b8; cursor: pointer; padding: 0;
    flex-shrink: 0;
    transition: background 0.14s, color 0.14s;
  }
  .fab-sheet__close:hover { background: #fee2e2; color: #ef4444; }

  /* thin divider */
  .fab-sheet__div { height: 1px; background: #f1f5f9; margin: 0 1rem; }

  /* action grid */
  .fab-sheet__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr));
    gap: 0.375rem;
    padding: 0.625rem 0.75rem 0.75rem;
  }
  .fab-tile {
    display: flex; flex-direction: column; align-items: center;
    gap: 0.35rem;
    padding: 0.625rem 0.25rem 0.5rem;
    border-radius: 0.875rem; border: none;
    cursor: pointer; font-family: inherit;
    transition: background 0.14s, transform 0.12s;
    user-select: none;
  }
  .fab-tile:active { transform: scale(0.9); }
  .fab-tile__icon {
    display: flex; align-items: center; justify-content: center;
    width: 2.5rem; height: 2.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 2px 6px rgba(0,0,0,0.07);
  }
  .fab-tile__label {
    font-size: 0.65rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.04em;
    line-height: 1.2; text-align: center;
    word-break: break-word;
    hyphens: auto;
  }
  .fab-tile--default              { background: #f0f9ff; }
  .fab-tile--default .fab-tile__icon   { background: linear-gradient(135deg, #2563eb, #3b82f6); color: #fff; }
  .fab-tile--default .fab-tile__label  { color: #1d4ed8; }
  .fab-tile--default:hover             { background: #dbeafe; }
  .fab-tile--secondary              { background: #f8fafc; }
  .fab-tile--secondary .fab-tile__icon { background: #e2e8f0; color: #475569; }
  .fab-tile--secondary .fab-tile__label{ color: #64748b; }
  .fab-tile--secondary:hover           { background: #f1f5f9; }
  .fab-tile--danger              { background: #fff5f5; }
  .fab-tile--danger .fab-tile__icon    { background: linear-gradient(135deg, #ef4444, #f87171); color: #fff; }
  .fab-tile--danger .fab-tile__label   { color: #dc2626; }
  .fab-tile--danger:hover              { background: #fee2e2; }

  /* ─── Breakpoint gating ──────────────────────────────── */
  @media (min-width: 640px) { .fab-sheet { display: none !important; } }
  @media (max-width: 639px) { .fab-wrap, .fab-scrim { display: none !important; } }
` as const;

function pillBtnClass(v?: string) {
  if (v === 'danger') return 'fab-btn fab-btn--danger';
  if (v === 'secondary') return 'fab-btn fab-btn--secondary';
  return 'fab-btn fab-btn--default';
}

function tileClass(v?: string) {
  if (v === 'danger') return 'fab-tile fab-tile--danger';
  if (v === 'secondary') return 'fab-tile fab-tile--secondary';
  return 'fab-tile fab-tile--default';
}

export function FloatingActionBar({
  selectedCount,
  onClearSelection,
  onSelectAll,
  isAllSelected = false,
  totalCount,
  actions,
  itemLabel,
}: FloatingActionBarProps) {
  const { t } = useLanguage();

  if (selectedCount === 0) return null;

  const progressPct =
    totalCount && totalCount > 0
      ? Math.min(100, Math.round((selectedCount / totalCount) * 100))
      : null;

  const visible = actions.filter((a) => !a.hidden);

  return (
    <>
      <style>{FAB_STYLES}</style>

      {/* DESKTOP — glass-morphism floating pill (>= 640px) */}
      <div className="fab-scrim" />
      <div className="fab-wrap">
        <div className="fab-pill">
          {/* Blue progress stripe */}
          <div
            className="fab-pill__progress"
            style={{ width: progressPct !== null ? `${progressPct}%` : '0%' }}
          />

          {/* Count badge */}
          <div className="fab-pill__badge">
            <span className="fab-pill__badge-num">{selectedCount}</span>
            {totalCount != null && (
              <span className="fab-pill__badge-of">/{totalCount}</span>
            )}
            <span className="fab-pill__badge-lbl">
              {itemLabel ?? t('selected')}
            </span>
          </div>

          {/* Select-all icon-only toggle */}
          {onSelectAll && totalCount != null && (
            <button
              type="button"
              className={`fab-pill__chk${isAllSelected ? ' fab-pill__chk--active' : ''}`}
              onClick={onSelectAll}
              title={isAllSelected ? t('deselectAll') : t('selectAll')}
            >
              {isAllSelected ? (
                <CheckSquare style={{ width: '0.9rem', height: '0.9rem' }} />
              ) : (
                <Square style={{ width: '0.9rem', height: '0.9rem' }} />
              )}
            </button>
          )}

          {/* Flex spacer — pushes actions/close to the right */}
          <div className="fab-pill__spacer" />

          {/* Action buttons */}
          <div className="fab-pill__actions">
            {visible.map((action) => (
              <button
                key={action.id}
                type="button"
                className={pillBtnClass(action.variant)}
                onClick={action.onClick}
                title={action.label}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>

          <div className="fab-pill__div" />

          {/* Close */}
          <button
            type="button"
            className="fab-close"
            onClick={onClearSelection}
            title={t('close')}
          >
            <X style={{ width: '0.85rem', height: '0.85rem' }} />
          </button>
        </div>
      </div>

      {/* MOBILE — native-style bottom sheet (< 640px) */}
      <div className="fab-sheet">
        <div className="fab-sheet__hd">
          <span className="fab-sheet__count">{selectedCount}</span>
          <span className="fab-sheet__title">
            {selectedCount} {itemLabel ?? t('selected')}
            {totalCount != null && (
              <span className="fab-sheet__of"> / {totalCount}</span>
            )}
          </span>

          {/* Select-all icon-only toggle */}
          {onSelectAll && totalCount != null && (
            <button
              type="button"
              className={`fab-sheet__chk${isAllSelected ? ' fab-sheet__chk--active' : ''}`}
              onClick={onSelectAll}
              title={isAllSelected ? t('deselectAll') : t('selectAll')}
            >
              {isAllSelected ? (
                <CheckSquare style={{ width: '0.9rem', height: '0.9rem' }} />
              ) : (
                <Square style={{ width: '0.9rem', height: '0.9rem' }} />
              )}
            </button>
          )}

          <button
            type="button"
            className="fab-sheet__close"
            onClick={onClearSelection}
          >
            <X style={{ width: '0.875rem', height: '0.875rem' }} />
          </button>
        </div>

        {/* Action tile grid */}
        {visible.length > 0 && (
          <>
            <div className="fab-sheet__div" />
            <div className="fab-sheet__grid">
              {visible.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className={tileClass(action.variant)}
                  onClick={action.onClick}
                >
                  <span className="fab-tile__icon">{action.icon}</span>
                  <span className="fab-tile__label">{action.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
