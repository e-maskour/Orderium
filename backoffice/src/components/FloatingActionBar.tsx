import { X, CheckSquare } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
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
  itemLabel?: string; // e.g., "order", "product"
  children?: ReactNode;
}

export function FloatingActionBar({
  selectedCount,
  onClearSelection,
  onSelectAll,
  isAllSelected = false,
  totalCount,
  actions,
  itemLabel,
  children,
}: FloatingActionBarProps) {
  const { t } = useLanguage();

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-64 right-0 z-40 flex justify-center pointer-events-none">
      <div className="max-w-4xl w-full px-4 pointer-events-auto">
        <div className="bg-gradient-to-r from-amber-600 to-amber-500 shadow-2xl rounded-2xl">
          <div className="px-6 py-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {/* Selection Info */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                  <CheckSquare className="w-4 h-4 text-white" />
                  <span className="text-white font-semibold text-sm">
                    {selectedCount} {t('selected')}
                  </span>
                </div>
                
                {onSelectAll && totalCount && (
                  <button
                    onClick={onSelectAll}
                    className="text-xs text-white/90 hover:text-white underline transition-colors"
                  >
                    {isAllSelected ? t('deselectAll') : t('selectAll')}
                  </button>
                )}
                
                <button
                  onClick={onClearSelection}
                  className="text-xs text-white/90 hover:text-white underline transition-colors"
                >
                  {t('clear')}
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {children}
                
                {actions
                  .filter(action => !action.hidden)
                  .map((action) => {
                    const baseClasses = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shadow-md font-semibold text-sm";
                    
                    let variantClasses = "bg-white text-amber-600 hover:bg-amber-50";
                    if (action.variant === 'danger') {
                      variantClasses = "bg-red-500 text-white hover:bg-red-600";
                    } else if (action.variant === 'secondary') {
                      variantClasses = "bg-white/20 text-white hover:bg-white/30";
                    }

                    return (
                      <button
                        key={action.id}
                        onClick={action.onClick}
                        className={`${baseClasses} ${variantClasses} ${action.className || ''}`}
                      >
                        {action.icon}
                        {action.label}
                      </button>
                    );
                  })}

                {/* Close Button */}
                <button
                  onClick={onClearSelection}
                  className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
