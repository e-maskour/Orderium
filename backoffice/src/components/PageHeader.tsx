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
    <div className="page-header">

      {/* Decorative circles */}
      <div className="page-header__deco page-header__deco--top" />
      <div className="page-header__deco page-header__deco--bottom" />

      {/* Left: icon + text */}
      <div className="page-header__left">
        <div className="page-header__icon-box">
          <Icon className="page-header__icon" strokeWidth={2} />
          <div className="page-header__icon-shine" />
        </div>

        <div className="page-header__text">
          <h1 className="page-header__title">{title}</h1>
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
        </div>
      </div>

      {/* Right: actions */}
      {actions && (
        <div className="page-header__actions">
          {actions}
        </div>
      )}
    </div>
  );
}
