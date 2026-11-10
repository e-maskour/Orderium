import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BarChart2, History, Search, SearchX, X } from 'lucide-react';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { useLanguage } from '../../context/LanguageContext';
import AnalyticsNav from './components/AnalyticsNav';
import {
  ANALYTICS_DOMAINS,
  ANALYTICS_REPORT_COUNT,
  ANALYTICS_ROOT,
  findReport,
  readRecentReports,
  type AnalyticsDomain,
  type AnalyticsReport,
} from './analytics.registry';
import type { TranslationKey } from '../../lib/i18n';
import './analytics.css';

interface DomainChip {
  id: string;
  labelKey: TranslationKey;
  count: number;
}

const ALL = 'all';

/** Accent-insensitive, case-insensitive match (é → e, etc.). */
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const ReportCard: React.FC<{ report: AnalyticsReport; domain: AnalyticsDomain }> = ({
  report,
  domain,
}) => {
  const { t } = useLanguage();
  const Icon = report.icon;
  return (
    <Link to={report.path} className={`ax-report-card ax-accent--${domain.accent}`}>
      <span className="ax-icon-tile">
        <Icon aria-hidden="true" />
      </span>
      <span className="ax-report-card__text">
        <span className="ax-report-card__title">{t(report.titleKey)}</span>
        <span className="ax-report-card__desc">{t(report.descriptionKey)}</span>
      </span>
      <ArrowRight className="ax-report-card__arrow" aria-hidden="true" />
    </Link>
  );
};

const AnalyticsCatalog: React.FC = () => {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const recent = useMemo(() => readRecentReports(), []);

  const domainParam = params.get('domain');
  const activeDomain = ANALYTICS_DOMAINS.some((d) => d.id === domainParam)
    ? (domainParam as string)
    : ALL;

  const setDomain = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === ALL) next.delete('domain');
    else next.set('domain', id);
    setParams(next, { replace: true });
  };

  // "/" focuses the report search from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key !== '/' || el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) {
        return;
      }
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const q = normalize(query.trim());
  const sections = ANALYTICS_DOMAINS.filter((d) => activeDomain === ALL || d.id === activeDomain)
    .map((domain) => ({
      domain,
      reports: q
        ? domain.reports.filter((r) =>
            normalize(`${t(r.titleKey)} ${t(r.descriptionKey)} ${t(domain.labelKey)}`).includes(q),
          )
        : domain.reports,
    }))
    .filter((s) => s.reports.length > 0);

  const chips: DomainChip[] = [
    { id: ALL, labelKey: 'analyticsAllDomains', count: ANALYTICS_REPORT_COUNT },
    ...ANALYTICS_DOMAINS.map((d) => ({ id: d.id, labelKey: d.labelKey, count: d.reports.length })),
  ];

  const matchCount = sections.reduce((n, s) => n + s.reports.length, 0);
  const showRecent = recent.length > 0 && !q && activeDomain === ALL;

  const countLabel = (n: number) =>
    t(n > 1 ? 'analyticsReportCountPlural' : 'analyticsReportCountSingular').replace(
      '{count}',
      String(n),
    );

  return (
    <AdminLayout>
      <div className="ax-page">
        <PageHeader
          icon={BarChart2}
          title={t('analyticsAllReports')}
          subtitle={t('analyticsAllReportsSubtitle')}
          crumbs={[{ label: t('analyticsPageTitle'), to: ANALYTICS_ROOT }]}
          actions={
            <span className="ax-count ax-count--lg">{countLabel(ANALYTICS_REPORT_COUNT)}</span>
          }
        />

        <AnalyticsNav showSubTabs={false} />

        <div className="ax-toolbar ax-hub-toolbar">
          <label className="ax-search ax-search--lg">
            <Search aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('analyticsSearchReports')}
              aria-label={t('analyticsSearchReports')}
            />
            {query ? (
              <button
                type="button"
                className="ax-search__clear"
                onClick={() => setQuery('')}
                aria-label={t('analyticsClearSearch')}
              >
                <X aria-hidden="true" />
              </button>
            ) : (
              <kbd className="ax-kbd" aria-hidden="true">
                /
              </kbd>
            )}
          </label>

          <div className="ax-chips" role="tablist" aria-label={t('analyticsPageTitle')}>
            {chips.map((chip) => {
              const active = activeDomain === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`ax-chip${active ? ' ax-chip--active' : ''}`}
                  onClick={() => setDomain(chip.id)}
                >
                  {t(chip.labelKey)}
                  <span className="ax-chip__count">{chip.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {showRecent && (
          <section className="ax-hub-section">
            <h2 className="ax-hub-section__title">
              <History aria-hidden="true" />
              {t('analyticsRecentlyViewed')}
            </h2>
            <div className="ax-recent">
              {recent.map((path) => {
                const hit = findReport(path);
                if (!hit) return null;
                const Icon = hit.report.icon;
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`ax-recent__item ax-accent--${hit.domain.accent}`}
                  >
                    <span className="ax-icon-tile ax-icon-tile--sm">
                      <Icon aria-hidden="true" />
                    </span>
                    <span className="ax-recent__text">
                      <span className="ax-recent__title">{t(hit.report.titleKey)}</span>
                      <span className="ax-recent__domain">{t(hit.domain.labelKey)}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {q && (
          <p className="ax-results-note" aria-live="polite">
            {countLabel(matchCount)}
          </p>
        )}

        {sections.length === 0 ? (
          <div className="ax-card ax-empty ax-empty--lg">
            <SearchX aria-hidden="true" />
            <p className="ax-empty__title">{t('analyticsSearchNoResults')}</p>
            <button type="button" className="ax-btn" onClick={() => setQuery('')}>
              {t('analyticsClearSearch')}
            </button>
          </div>
        ) : (
          sections.map(({ domain, reports }) => {
            const DomainIcon = domain.icon;
            return (
              <section
                key={domain.id}
                className={`ax-card ax-domain ax-accent--${domain.accent}`}
                aria-labelledby={`ax-domain-${domain.id}`}
              >
                <header className="ax-domain__head">
                  <span className="ax-icon-tile">
                    <DomainIcon aria-hidden="true" />
                  </span>
                  <h2 id={`ax-domain-${domain.id}`} className="ax-domain__title">
                    {t(domain.labelKey)}
                  </h2>
                  <span className="ax-count">{countLabel(reports.length)}</span>
                </header>
                <div className="ax-report-grid">
                  {reports.map((report) => (
                    <ReportCard key={report.path} report={report} domain={domain} />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </AdminLayout>
  );
};

export default AnalyticsCatalog;
