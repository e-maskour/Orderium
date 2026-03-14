import { X, CheckSquare } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { CSSProperties, ReactNode } from 'react';

export interface FloatingAction {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  hidden?: boolean;
}

interface FloatingActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onSelectAll?: () => void;
  isAllSelected?: boolean;
  totalCount?: number;
  actions: FloatingAction[];
  itemLabel?: string;
  children?: ReactNode;
}

const FAB_STYLES = `
  @keyframes _fab_slide_in {
    0%   { opacity: 0; transform: translateY(110%) scale(0.94); }
    60%  { opacity: 1; transform: translateY(-5px) scale(1.01); }
    100% { opacity: 1; transform: translateY(0)   scale(1);    }
  }
  ._fab_root {
    animation: _fab_slide_in 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    position: relative;
  }
  ._fab_btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border: none;
    cursor: pointer;
    font-family: inherit;
    transition: transform 0.17s ease, box-shadow 0.17s ease, opacity 0.17s ease;
  }
  ._fab_btn:hover  { transform: translateY(-2px); opacity: 0.92; }
  ._fab_btn:active { transform: translateY(0) scale(0.96); }

  ._fab_ghost {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border: none;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.18s ease, transform 0.18s ease;
  }
  ._fab_ghost:hover  { background: rgba(255,255,255,0.12) !important; }
  ._fab_ghost:active { transform: scale(0.95); }

  ._fab_close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    font-family: inherit;
    transition: transform 0.22s ease, background 0.18s ease;
  }
  ._fab_close:hover  { transform: rotate(90deg); background: rgba(239,68,68,0.18) !important; color: #f87171 !important; }
  ._fab_close:active { transform: rotate(90deg) scale(0.9); }

  ._fab_sep { width: 1px; height: 1.4rem; background: rgba(255,255,255,0.12); flex-shrink: 0; }

  @media (max-width: 600px) {
    ._fab_label { display: none; }
    ._fab_actions { flex-wrap: wrap; }
  }
` as const;

function actionStyle(variant?: string): CSSProperties {
  if (variant === 'danger') {
    return {
      padding: '0.45rem 0.9rem',
      borderRadius: '0.7rem',
      fontSize: '0.8125rem',
      fontWeight: 600,
      whiteSpace: 'nowrap',
      background: 'rgba(239,68,68,0.14)',
      color: '#f87171',
      boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.3)',
    };
  }
  if (variant === 'secondary') {
    return {
      padding: '0.45rem 0.9rem',
      borderRadius: '0.7rem',
      fontSize: '0.8125rem',
      fontWeight: 500,
      whiteSpace: 'nowrap',
      background: 'rgba(255,255,255,0.08)',
      color: 'rgba(255,255,255,0.75)',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)',
    };
  }
  return {
    padding: '0.45rem 0.9rem',
    borderRadius: '0.7rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    color: '#fff',
    boxShadow: '0 4px 16px rgba(217,119,6,0.38)',
  };
}

export function FloatingActionBar({
  selectedCount,
  onClearSelection,
  onSelectAll,
  isAllSelected = false,
  totalCount,
  actions,
  children,
}: FloatingActionBarProps) {
  const { t } = useLanguage();

  if (selectedCount === 0) return null;

  const progress = totalCount && totalCount > 0
    ? Math.min(100, Math.round((selectedCount / totalCount) * 100))
    : null;

  const visibleActions = actions.filter(a => !a.hidden);

  return (
    <>
      <style>{FAB_STYLES}</style>

      {/* Backdrop portal */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '7rem',
          zIndex: 9990,
          background: 'linear-gradient(to top, rgba(0,0,0,0.18) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          left: 0,
          right: 0,
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          padding: '0 1rem',
        }}
      >
        <div
          className="_fab_root"
          style={{
            maxWidth: '58rem',
            width: '100%',
            pointerEvents: 'auto',
            borderRadius: '1.125rem',
            background: 'rgba(10, 11, 16, 0.9)',
            border: '1px solid rgba(255,255,255,0.09)',
            backdropFilter: 'blur(28px) saturate(180%)',
            WebkitBackdropFilter: 'blur(28px) saturate(180%)',
            boxShadow:
              '0 40px 90px -12px rgba(0,0,0,0.6), ' +
              '0  8px 24px -4px rgba(0,0,0,0.35), ' +
              'inset 0 1px 0 rgba(255,255,255,0.07)',
            overflow: 'hidden',
          }}
        >
          {/* Top progress accent */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2.5px',
              background: 'rgba(255,255,255,0.05)',
            }}
          >
            <div
              style={{
                height: '100%',
                width: progress !== null ? `${progress}%` : '0%',
                background: 'linear-gradient(90deg, #b45309, #d97706, #f59e0b)',
                boxShadow: '0 0 10px rgba(245,158,11,0.6)',
                transition: 'width 0.45s cubic-bezier(0.4,0,0.2,1)',
                borderRadius: '0 2px 2px 0',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              padding: '0.85rem 1.25rem',
              flexWrap: 'wrap',
            }}
          >
            {/* ── LEFT: count badge + select-all ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              {/* Count badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.4rem 0.875rem',
                  borderRadius: '0.7rem',
                  background: 'linear-gradient(135deg, #92400e 0%, #d97706 60%, #f59e0b 100%)',
                  boxShadow: '0 3px 12px rgba(217,119,6,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                <CheckSquare style={{ width: '0.875rem', height: '0.875rem', color: 'rgba(255,255,255,0.9)', flexShrink: 0 }} />
                <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.925rem', letterSpacing: '-0.02em' }}>
                  {selectedCount}
                </span>
                {totalCount != null && (
                  <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', fontWeight: 400 }}>
                    /{totalCount}
                  </span>
                )}
                <span className="_fab_label" style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.8rem', fontWeight: 500 }}>
                  {t('selected')}
                </span>
              </div>

              {/* Select-all toggle */}
              {onSelectAll && totalCount != null && (
                <button
                  className="_fab_ghost"
                  onClick={onSelectAll}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '0.7rem',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.65)',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
                  }}
                >
                  <span className="_fab_label">
                    {isAllSelected ? t('deselectAll') : t('selectAll')}
                  </span>
                </button>
              )}
            </div>

            {/* ── RIGHT: actions + close ── */}
            <div
              className="_fab_actions"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {children}

              {visibleActions.map((action) => (
                <button
                  key={action.id}
                  className="_fab_btn"
                  onClick={action.onClick}
                  title={action.label}
                  style={actionStyle(action.variant)}
                >
                  {action.icon}
                  <span className="_fab_label">{action.label}</span>
                </button>
              ))}

              {visibleActions.length > 0 && <div className="_fab_sep" />}

              <button
                className="_fab_close"
                onClick={onClearSelection}
                title={t('close')}
                style={{
                  width: '2.1rem',
                  height: '2.1rem',
                  borderRadius: '0.625rem',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.5)',
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
                }}
              >
                <X style={{ width: '0.9rem', height: '0.9rem' }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
