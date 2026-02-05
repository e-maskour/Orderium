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
    <div className="fixed bottom-6 sm:bottom-8 left-0 right-0 z-40 flex justify-center pointer-events-none px-4 sm:px-6 lg:pl-64">
      <div className="max-w-5xl w-full pointer-events-auto">
        {/* Enhanced Card with Better Shadows */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-500 shadow-[0_20px_60px_-10px_rgba(217,119,6,0.5),0_10px_30px_-5px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden">
          <div className="px-4 sm:px-6 py-3.5 sm:py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              {/* Selection Info with Refined Design */}
              <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl flex-shrink-0 shadow-[0_4px_16px_rgba(0,0,0,0.15)]">
                  <CheckSquare className="w-4 sm:w-4.5 h-4 sm:h-4.5 text-white" />
                  <span className="text-white font-bold text-sm sm:text-base">
                    {selectedCount}
                  </span>
                  <span className="text-white/90 font-medium text-xs sm:text-sm">
                    {t('selected')}
                  </span>
                </div>
                
                {onSelectAll && totalCount && (
                  <button
                    onClick={onSelectAll}
                    className="px-3 py-1.5 text-xs sm:text-sm text-white/90 hover:text-white font-medium hover:bg-white/10 rounded-lg transition-all duration-200"
                  >
                    {isAllSelected ? t('deselectAll') : t('selectAll')}
                  </button>
                )}
              </div>

              {/* Actions with Enhanced Styling */}
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap w-full sm:w-auto">
                {children}
                
                {actions
                  .filter(action => !action.hidden)
                  .map((action) => {
                    const baseClasses = "group flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all duration-200 font-semibold text-xs sm:text-sm whitespace-nowrap shadow-[0_2px_8px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] hover:-translate-y-0.5";
                    
                    let variantClasses = "bg-white text-amber-600 hover:bg-amber-50";
                    if (action.variant === 'danger') {
                      variantClasses = "bg-red-500 text-white hover:bg-red-600 hover:shadow-[0_8px_24px_rgba(239,68,68,0.35)]";
                    } else if (action.variant === 'secondary') {
                      variantClasses = "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm";
                    }

                    return (
                      <button
                        key={action.id}
                        onClick={action.onClick}
                        className={`${baseClasses} ${variantClasses} ${action.className || ''}`}
                      >
                        <span className="group-hover:scale-110 transition-transform duration-200">
                          {action.icon}
                        </span>
                        <span className="hidden sm:inline">{action.label}</span>
                      </button>
                    );
                  })}

                {/* Refined Close Button */}
                <button
                  onClick={onClearSelection}
                  className="group flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all duration-200 ml-2 sm:ml-0 shadow-[0_2px_8px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] hover:-translate-y-0.5"
                  title={t('close')}
                >
                  <X className="w-4 sm:w-4.5 h-4 sm:h-4.5 group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
