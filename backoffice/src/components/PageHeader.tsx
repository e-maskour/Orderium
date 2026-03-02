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
    <div className="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between mb-3 sm:mb-4 gap-3">
      <div className="flex align-items-start sm:align-items-center gap-2 sm:gap-3 flex-1">
        <div
          className="flex align-items-center justify-content-center border-round-lg flex-shrink-0"
          style={{ width: '2.5rem', height: '2.5rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
        >
          <Icon style={{ width: '1.25rem', height: '1.25rem', color: '#fff' }} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 className="font-bold" style={{ fontSize: '1.5rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h1>
          {subtitle && <p className="line-clamp-2" style={{ fontSize: '0.875rem', color: '#475569', marginTop: '0.125rem' }}>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex align-items-center gap-2 w-full sm:w-auto flex-shrink-0">{actions}</div>}
    </div>
  );
}
