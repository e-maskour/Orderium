import { X, CheckSquare } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Button } from 'primereact/button';
import { ReactNode } from 'react';

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

  const getVariantStyle = (variant?: string): React.CSSProperties => {
    if (variant === 'danger') return { background: '#ef4444', color: '#fff' };
    if (variant === 'secondary') return { background: 'rgba(255,255,255,0.2)', color: '#fff' };
    return { background: '#fff', color: '#d97706' };
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '2rem',
        left: 0,
        right: 0,
        zIndex: 40,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        padding: '0 1rem',
      }}
    >
      <div style={{ maxWidth: '64rem', width: '100%', pointerEvents: 'auto' }}>
        <div
          className="border-round-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(90deg, #d97706, #f59e0b)',
            boxShadow: '0 20px 60px -10px rgba(217,119,6,0.5), 0 10px 30px -5px rgba(0,0,0,0.3)',
            padding: '1rem 1.5rem',
          }}
        >
          <div className="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-3">
            {/* Selection Info */}
            <div className="flex align-items-center gap-2 flex-wrap">
              <div
                className="flex align-items-center gap-2 border-round-xl flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem 1rem' }}
              >
                <CheckSquare style={{ width: '1rem', height: '1rem', color: '#fff' }} />
                <span className="font-bold text-white">{selectedCount}</span>
                <span className="font-medium" style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.875rem' }}>
                  {t('selected')}
                </span>
              </div>

              {onSelectAll && totalCount && (
                <Button
                  label={isAllSelected ? t('deselectAll') : t('selectAll')}
                  text
                  size="small"
                  onClick={onSelectAll}
                  style={{ color: 'rgba(255,255,255,0.9)' }}
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex align-items-center gap-2 flex-wrap w-full sm:w-auto">
              {children}

              {actions
                .filter(action => !action.hidden)
                .map((action) => (
                  <button
                    key={action.id}
                    onClick={action.onClick}
                    className="flex align-items-center gap-2 border-round-xl font-semibold border-none cursor-pointer"
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '0.8125rem',
                      whiteSpace: 'nowrap',
                      ...getVariantStyle(action.variant),
                    }}
                  >
                    {action.icon}
                    <span className="hidden sm:inline">{action.label}</span>
                  </button>
                ))}

              <button
                onClick={onClearSelection}
                className="flex align-items-center justify-content-center border-round-xl border-none cursor-pointer"
                style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.2)', color: '#fff' }}
                title={t('close')}
              >
                <X style={{ width: '1rem', height: '1rem' }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
