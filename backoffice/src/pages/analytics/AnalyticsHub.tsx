import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart2 } from 'lucide-react';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../lib/i18n';

interface ReportCard {
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  path: string;
}

interface DomainSection {
  domainKey: TranslationKey;
  icon: string;
  color: string;
  reports: ReportCard[];
}

const DOMAINS: DomainSection[] = [
  {
    domainKey: 'analyticsDomainSales',
    icon: 'pi pi-chart-line',
    color: 'blue',
    reports: [
      {
        titleKey: 'analyticsSalesRevenueTitle',
        descriptionKey: 'analyticsSalesRevenueDescription',
        path: '/analytics/sales/revenue',
      },
      {
        titleKey: 'analyticsTopProductsTitle',
        descriptionKey: 'analyticsTopProductsDescription',
        path: '/analytics/sales/top-products',
      },
      {
        titleKey: 'analyticsSalesByCustomerTitle',
        descriptionKey: 'analyticsSalesByCustomerDescription',
        path: '/analytics/sales/by-customer',
      },
      {
        titleKey: 'analyticsSalesByCategoryTitle',
        descriptionKey: 'analyticsSalesByCategoryDescription',
        path: '/analytics/sales/by-category',
      },
      {
        titleKey: 'analyticsSalesByPosTitle',
        descriptionKey: 'analyticsSalesByPosDescription',
        path: '/analytics/sales/by-pos',
      },
    ],
  },
  {
    domainKey: 'analyticsDomainPurchases',
    icon: 'pi pi-shopping-bag',
    color: 'orange',
    reports: [
      {
        titleKey: 'analyticsPurchasesByPeriodTitle',
        descriptionKey: 'analyticsPurchasesByPeriodDescription',
        path: '/analytics/purchases/by-period',
      },
      {
        titleKey: 'analyticsTopSuppliersTitle',
        descriptionKey: 'analyticsTopSuppliersDescription',
        path: '/analytics/purchases/top-suppliers',
      },
      {
        titleKey: 'analyticsPurchasesByProductTitle',
        descriptionKey: 'analyticsPurchasesByProductDescription',
        path: '/analytics/purchases/by-product',
      },
    ],
  },
  {
    domainKey: 'analyticsDomainInvoices',
    icon: 'pi pi-file',
    color: 'purple',
    reports: [
      {
        titleKey: 'analyticsInvoicesJournalVenteTitle',
        descriptionKey: 'analyticsInvoicesJournalVenteDescription',
        path: '/analytics/invoices/journal-vente',
      },
      {
        titleKey: 'analyticsInvoicesJournalAchatTitle',
        descriptionKey: 'analyticsInvoicesJournalAchatDescription',
        path: '/analytics/invoices/journal-achat',
      },
      {
        titleKey: 'analyticsTvaSummaryTitle',
        descriptionKey: 'analyticsTvaSummaryDescription',
        path: '/analytics/invoices/tva',
      },
      {
        titleKey: 'analyticsOutstandingInvoicesTitle',
        descriptionKey: 'analyticsOutstandingInvoicesDescription',
        path: '/analytics/invoices/outstanding',
      },
      {
        titleKey: 'analyticsInvoiceAgingTitle',
        descriptionKey: 'analyticsInvoiceAgingDescription',
        path: '/analytics/invoices/aging',
      },
    ],
  },
  {
    domainKey: 'analyticsDomainPayments',
    icon: 'pi pi-credit-card',
    color: 'green',
    reports: [
      {
        titleKey: 'analyticsCashflowTitle',
        descriptionKey: 'analyticsCashflowDescription',
        path: '/analytics/payments/cashflow',
      },
      {
        titleKey: 'analyticsPaymentsByMethodTitle',
        descriptionKey: 'analyticsPaymentsByMethodDescription',
        path: '/analytics/payments/by-method',
      },
      {
        titleKey: 'analyticsInOutFlowTitle',
        descriptionKey: 'analyticsInOutFlowDescription',
        path: '/analytics/payments/in-out',
      },
    ],
  },
  {
    domainKey: 'analyticsDomainClients',
    icon: 'pi pi-users',
    color: 'teal',
    reports: [
      {
        titleKey: 'analyticsTopClientsTitle',
        descriptionKey: 'analyticsTopClientsDescription',
        path: '/analytics/clients/top',
      },
      {
        titleKey: 'analyticsClientAgingTitle',
        descriptionKey: 'analyticsClientAgingDescription',
        path: '/analytics/clients/aging',
      },
      {
        titleKey: 'analyticsInactiveClientsTitle',
        descriptionKey: 'analyticsInactiveClientsDescription',
        path: '/analytics/clients/inactive',
      },
      {
        titleKey: 'analyticsClientStatementTitle',
        descriptionKey: 'analyticsClientStatementDescription',
        path: '/analytics/clients/statement',
      },
    ],
  },
  {
    domainKey: 'analyticsDomainSuppliers',
    icon: 'pi pi-truck',
    color: 'yellow',
    reports: [
      {
        titleKey: 'analyticsTopSuppliersTitle',
        descriptionKey: 'analyticsTopSuppliersDescription',
        path: '/analytics/suppliers/top',
      },
      {
        titleKey: 'analyticsSupplierAgingTitle',
        descriptionKey: 'analyticsSupplierAgingDescription',
        path: '/analytics/suppliers/aging',
      },
      {
        titleKey: 'analyticsSupplierStatementTitle',
        descriptionKey: 'analyticsSupplierStatementDescription',
        path: '/analytics/suppliers/statement',
      },
    ],
  },
  {
    domainKey: 'analyticsDomainStock',
    icon: 'pi pi-box',
    color: 'cyan',
    reports: [
      {
        titleKey: 'analyticsStockValuationTitle',
        descriptionKey: 'analyticsStockValuationDescription',
        path: '/analytics/stock/valuation',
      },
      {
        titleKey: 'analyticsLowStockTitle',
        descriptionKey: 'analyticsLowStockDescription',
        path: '/analytics/stock/low-stock',
      },
      {
        titleKey: 'analyticsStockMovementsTitle',
        descriptionKey: 'analyticsStockMovementsDescription',
        path: '/analytics/stock/movements',
      },
      {
        titleKey: 'analyticsSlowDeadStockTitle',
        descriptionKey: 'analyticsSlowDeadStockDescription',
        path: '/analytics/stock/slow-dead',
      },
      {
        titleKey: 'analyticsStockByWarehouseTitle',
        descriptionKey: 'analyticsStockByWarehouseDescription',
        path: '/analytics/stock/by-warehouse',
      },
    ],
  },
  {
    domainKey: 'analyticsDomainProducts',
    icon: 'pi pi-tag',
    color: 'pink',
    reports: [
      {
        titleKey: 'analyticsProductPerformanceTitle',
        descriptionKey: 'analyticsProductPerformanceDescription',
        path: '/analytics/products/performance',
      },
      {
        titleKey: 'analyticsMarginAnalysisTitle',
        descriptionKey: 'analyticsMarginAnalysisDescription',
        path: '/analytics/products/margin',
      },
      {
        titleKey: 'analyticsNeverSoldProductsTitle',
        descriptionKey: 'analyticsNeverSoldProductsDescription',
        path: '/analytics/products/never-sold',
      },
    ],
  },
];

// Accent color per domain — matches brand palette
const DOMAIN_COLORS: Record<string, { icon: string; bg: string; border: string; badge: string }> = {
  blue: { icon: '#235ae4', bg: 'var(--blue-50)', border: 'var(--blue-100)', badge: '#235ae4' },
  orange: {
    icon: '#ea580c',
    bg: 'var(--orange-50)',
    border: 'var(--orange-100)',
    badge: '#ea580c',
  },
  purple: {
    icon: '#7c3aed',
    bg: 'var(--purple-50)',
    border: 'var(--purple-100)',
    badge: '#7c3aed',
  },
  green: { icon: '#16a34a', bg: 'var(--green-50)', border: 'var(--green-100)', badge: '#16a34a' },
  teal: { icon: '#0d9488', bg: '#f0fdfa', border: '#ccfbf1', badge: '#0d9488' },
  yellow: {
    icon: '#d97706',
    bg: 'var(--yellow-50)',
    border: 'var(--yellow-100)',
    badge: '#d97706',
  },
  cyan: { icon: '#0891b2', bg: 'var(--cyan-50)', border: 'var(--cyan-100)', badge: '#0891b2' },
  pink: { icon: '#db2777', bg: 'var(--pink-50)', border: 'var(--pink-100)', badge: '#db2777' },
};

const AnalyticsHub: React.FC = () => {
  const { t } = useLanguage();

  return (
    <AdminLayout>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <PageHeader
          icon={BarChart2}
          title={t('analyticsPageTitle')}
          subtitle={t('analyticsPageSubtitle')}
        />

        <div className="flex flex-column gap-3">
          {DOMAINS.map((domain) => {
            const dc = DOMAIN_COLORS[domain.color] ?? DOMAIN_COLORS.blue;
            return (
              <div
                key={domain.domainKey}
                style={{
                  background: '#ffffff',
                  borderRadius: 'var(--erp-radius-lg)',
                  border: '1px solid var(--erp-border)',
                  boxShadow: 'var(--erp-shadow-sm)',
                  overflow: 'hidden',
                }}
              >
                {/* Domain header */}
                <div
                  className="flex align-items-center gap-3 px-4 py-3"
                  style={{ borderBottom: '1px solid var(--erp-border)', background: dc.bg }}
                >
                  <div
                    style={{
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '0.5rem',
                      background: '#ffffff',
                      border: `1px solid ${dc.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <i className={domain.icon} style={{ fontSize: '0.875rem', color: dc.icon }} />
                  </div>
                  <h3 className="text-base font-bold text-900 m-0">{t(domain.domainKey)}</h3>
                  <span
                    style={{
                      marginInlineStart: 'auto',
                      background: dc.badge,
                      color: '#fff',
                      borderRadius: '9999px',
                      padding: '0.125rem 0.625rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    {domain.reports.length > 1
                      ? t('analyticsReportCountPlural').replace(
                          '{count}',
                          String(domain.reports.length),
                        )
                      : t('analyticsReportCountSingular').replace(
                          '{count}',
                          String(domain.reports.length),
                        )}
                  </span>
                </div>

                {/* Report cards grid */}
                <div
                  className="p-3"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.625rem',
                  }}
                >
                  {domain.reports.map((report) => (
                    <div key={report.path} style={{ minWidth: 0 }}>
                      <Link to={report.path} style={{ textDecoration: 'none' }}>
                        <div
                          style={{
                            background: '#ffffff',
                            borderRadius: 'var(--erp-radius)',
                            border: '1px solid var(--erp-border)',
                            padding: '0.875rem 1rem',
                            cursor: 'pointer',
                            transition:
                              'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem',
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLDivElement).style.borderColor = dc.icon;
                            (e.currentTarget as HTMLDivElement).style.boxShadow =
                              `0 0 0 3px ${dc.bg}`;
                            (e.currentTarget as HTMLDivElement).style.transform =
                              'translateY(-1px)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLDivElement).style.borderColor =
                              'var(--erp-border)';
                            (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                          }}
                        >
                          <div className="flex align-items-center justify-content-between">
                            <p className="font-semibold text-800 m-0 text-sm">
                              {t(report.titleKey)}
                            </p>
                            <i
                              className="pi pi-arrow-right text-400 analytics-report-card__arrow"
                              style={{ fontSize: '0.75rem' }}
                            />
                          </div>
                          <p
                            className="text-500 m-0"
                            style={{ fontSize: '0.75rem', lineHeight: 1.4 }}
                          >
                            {t(report.descriptionKey)}
                          </p>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AnalyticsHub;
