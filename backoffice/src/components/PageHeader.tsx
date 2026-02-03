import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ icon: Icon, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
      <div className="flex items-start sm:items-center gap-2 sm:gap-4 flex-1">
        <div className="w-8 sm:w-10 md:w-12 h-8 sm:h-10 md:h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
          <Icon className="w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 truncate">{title}</h1>
          {subtitle && <p className="text-xs sm:text-sm text-slate-600 mt-0.5 sm:mt-1 line-clamp-2">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto flex-shrink-0">{actions}</div>}
    </div>
  );
}
