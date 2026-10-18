import { ArrowLeft, LucideIcon } from 'lucide-react';
import { Fragment, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import type { ReturnToState } from '../lib/entityRoutes';

interface PageHeaderProps {
  /** Kept for API compatibility; the flat header no longer renders an icon tile. */
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  backButton?: ReactNode;
  /** Intermediate breadcrumb links between Home and the current page. */
  crumbs?: { label: string; to: string }[];
  /** Overrides the last breadcrumb label (defaults to the title). */
  currentCrumb?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  backButton,
  crumbs = [],
  currentCrumb,
}: PageHeaderProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const from = (useLocation().state as ReturnToState | null)?.from;

  return (
    <div className="page-header">
      <div className="page-header__left">
        {backButton}

        <div className="page-header__text">
          {/* Opened from another record (RefLink) — one tap takes the user back there */}
          {from && (
            <button
              type="button"
              className="page-header__return"
              onClick={() =>
                (window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate(from.path)
              }
            >
              <ArrowLeft aria-hidden="true" />
              <span>{t('backTo').replace('{label}', from.label || t('back'))}</span>
            </button>
          )}
          <nav aria-label="Breadcrumb">
            <ol className="page-header__crumbs">
              <li>
                <Link to="/dashboard">{t('home')}</Link>
              </li>
              {crumbs.map((c) => (
                <Fragment key={c.to}>
                  <li className="page-header__crumb-sep" aria-hidden="true">
                    /
                  </li>
                  <li>
                    <Link to={c.to}>{c.label}</Link>
                  </li>
                </Fragment>
              ))}
              <li className="page-header__crumb-sep" aria-hidden="true">
                /
              </li>
              <li className="page-header__crumb-current" aria-current="page">
                {currentCrumb ?? title}
              </li>
            </ol>
          </nav>
          <h1 className="page-header__title">{title}</h1>
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
        </div>
      </div>

      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
}
