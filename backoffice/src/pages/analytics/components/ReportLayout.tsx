import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, BarChart2, RefreshCw, type LucideIcon } from 'lucide-react';
import { AdminLayout } from '../../../components/AdminLayout';
import { PageHeader } from '../../../components/PageHeader';
import { useLanguage } from '../../../context/LanguageContext';
import AnalyticsNav from './AnalyticsNav';
import {
  ANALYTICS_CATALOG,
  ANALYTICS_ROOT,
  findReport,
  pushRecentReport,
} from '../analytics.registry';
import '../analytics.css';

interface ReportLayoutProps {
  title: string;
  subtitle?: string;
  /** Kept for API compatibility; the report icon now comes from the registry. */
  icon?: LucideIcon;
  filterBar?: React.ReactNode;
  kpiCards?: React.ReactNode;
  chart?: React.ReactNode;
  table?: React.ReactNode;
  exportButtons?: React.ReactNode;
  isLoading?: boolean;
  error?: string | null;
  /** Re-runs the report query. Enables the refresh and retry actions. */
  onRefresh?: () => void;
}

const SkeletonBody: React.FC = () => (
  <div className="ax-stack" aria-hidden="true">
    <div className="ax-kpis">
      {[0, 1, 2].map((i) => (
        <div key={i} className="ax-kpi ax-kpi--skeleton">
          <span className="ax-skel" style={{ width: '45%', height: '0.75rem' }} />
          <span className="ax-skel" style={{ width: '70%', height: '1.75rem' }} />
        </div>
      ))}
    </div>
    <div className="ax-card ax-card--pad">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="ax-skel"
          style={{ width: '100%', height: '1.25rem', marginBottom: '0.75rem' }}
        />
      ))}
    </div>
  </div>
);

const ReportLayout: React.FC<ReportLayoutProps> = ({
  title,
  subtitle,
  icon: FallbackIcon = BarChart2,
  filterBar,
  kpiCards,
  chart,
  table,
  exportButtons,
  isLoading,
  error,
  onRefresh,
}) => {
  const { t, language } = useLanguage();
  const { pathname } = useLocation();
  const match = findReport(pathname);
  const Icon = match?.report.icon ?? FallbackIcon;

  useEffect(() => {
    if (match) pushRecentReport(pathname);
  }, [pathname, match]);

  // Track successful loads: first load shows a skeleton, later loads keep the
  // previous result on screen (dimmed) so the page never collapses.
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const wasLoading = useRef(isLoading);
  useEffect(() => {
    if (wasLoading.current && !isLoading && !error) setLoadedAt(new Date());
    wasLoading.current = isLoading;
  }, [isLoading, error]);

  const firstLoad = isLoading && !loadedAt;
  const refreshing = isLoading && !!loadedAt;

  const timeLabel = loadedAt
    ? loadedAt.toLocaleTimeString(language === 'ar' ? 'ar-MA' : 'fr-MA', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const crumbs = [{ label: t('analyticsPageTitle'), to: ANALYTICS_ROOT }];
  if (match) {
    crumbs.push({
      label: t(match.domain.labelKey),
      to: `${ANALYTICS_CATALOG}?domain=${match.domain.id}`,
    });
  }

  return (
    <AdminLayout>
      <div className={`ax-page${match ? ` ax-accent--${match.domain.accent}` : ''}`}>
        <PageHeader
          icon={Icon}
          title={title}
          subtitle={subtitle}
          crumbs={crumbs}
          actions={
            <div className="ax-header-actions">
              {timeLabel && (
                <span className="ax-updated" aria-live="polite">
                  <span
                    className={`ax-updated__dot${refreshing ? ' ax-updated__dot--busy' : ''}`}
                  />
                  {t('analyticsLastUpdated').replace('{time}', timeLabel)}
                </span>
              )}
              {onRefresh && (
                <button
                  type="button"
                  className="ax-icon-btn"
                  onClick={onRefresh}
                  disabled={isLoading}
                  title={t('analyticsRefresh')}
                  aria-label={t('analyticsRefresh')}
                >
                  <RefreshCw className={isLoading ? 'ax-spin' : undefined} aria-hidden="true" />
                </button>
              )}
              {exportButtons}
            </div>
          }
        />

        <AnalyticsNav />

        {filterBar && <div className="ax-toolbar">{filterBar}</div>}

        {refreshing && (
          <div className="ax-progress" role="progressbar" aria-label={t('analyticsLoading')} />
        )}

        {firstLoad && <SkeletonBody />}

        {error && !isLoading && (
          <div className="ax-card ax-state ax-state--error" role="alert">
            <span className="ax-state__icon">
              <AlertTriangle aria-hidden="true" />
            </span>
            <div className="ax-state__text">
              <p className="ax-state__title">{t('analyticsErrorTitle')}</p>
              <p className="ax-state__body">{error}</p>
            </div>
            {onRefresh && (
              <button type="button" className="ax-btn" onClick={onRefresh}>
                <RefreshCw aria-hidden="true" />
                {t('analyticsRetry')}
              </button>
            )}
          </div>
        )}

        {!firstLoad && !error && (
          <div
            className={`ax-stack${refreshing ? ' ax-stack--refreshing' : ''}`}
            aria-busy={refreshing}
          >
            {kpiCards && <section>{kpiCards}</section>}
            {chart && <section className="ax-card ax-card--pad">{chart}</section>}
            {table && <section className="ax-card">{table}</section>}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ReportLayout;
