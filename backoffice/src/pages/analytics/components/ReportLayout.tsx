import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LucideIcon, ArrowLeft, BarChart2 } from 'lucide-react';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { AdminLayout } from '../../../components/AdminLayout';
import { PageHeader } from '../../../components/PageHeader';

interface ReportLayoutProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  filterBar?: React.ReactNode;
  kpiCards?: React.ReactNode;
  chart?: React.ReactNode;
  table?: React.ReactNode;
  exportButtons?: React.ReactNode;
  isLoading?: boolean;
  error?: string | null;
}

const ReportLayout: React.FC<ReportLayoutProps> = ({
  title,
  subtitle,
  icon: Icon = BarChart2,
  filterBar,
  kpiCards,
  chart,
  table,
  exportButtons,
  isLoading,
  error,
}) => {
  const navigate = useNavigate();

  return (
    <AdminLayout>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        {/* Header — identical to every other backoffice page */}
        <PageHeader
          icon={Icon}
          title={title}
          subtitle={subtitle}
          backButton={
            <Button
              icon={<ArrowLeft style={{ width: '1rem', height: '1rem' }} />}
              onClick={() => navigate('/analytics')}
              style={{
                width: '2.25rem',
                height: '2.25rem',
                flexShrink: 0,
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                color: '#64748b',
                borderRadius: '0.625rem',
                padding: 0,
              }}
            />
          }
          actions={exportButtons ? <div className="flex gap-2">{exportButtons}</div> : undefined}
        />

        {/* Filter bar */}
        {filterBar && <div className="erp-card mb-3">{filterBar}</div>}

        {/* Loading */}
        {isLoading && (
          <div
            className="erp-card flex justify-content-center align-items-center"
            style={{ minHeight: '200px' }}
          >
            <div className="flex flex-column align-items-center gap-3">
              <ProgressSpinner style={{ width: '48px', height: '48px' }} strokeWidth="3" />
              <span className="text-500 text-sm">Chargement du rapport…</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div
            className="erp-card flex align-items-center gap-3 p-4"
            style={{ borderLeft: '4px solid var(--red-500)' }}
          >
            <i className="pi pi-exclamation-triangle text-red-500 text-2xl" />
            <div>
              <p className="font-semibold text-900 m-0">Erreur lors du chargement</p>
              <p className="text-500 text-sm m-0 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Content */}
        {!isLoading && !error && (
          <div className="flex flex-column gap-3">
            {kpiCards && <div>{kpiCards}</div>}

            {chart && (
              <div className="erp-card">
                <div
                  className="flex align-items-center gap-2 mb-3 pb-3"
                  style={{ borderBottom: '1px solid var(--erp-border)' }}
                >
                  <i className="pi pi-chart-line text-primary" />
                  <span className="font-semibold text-800 text-sm">Graphique</span>
                </div>
                {chart}
              </div>
            )}

            {table && (
              <div className="erp-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div
                  className="flex align-items-center justify-content-between px-4 py-3"
                  style={{ borderBottom: '1px solid var(--erp-border)' }}
                >
                  <div className="flex align-items-center gap-2">
                    <i className="pi pi-table text-primary" />
                    <span className="font-semibold text-800 text-sm">Données détaillées</span>
                  </div>
                </div>
                <div className="px-3 pb-3">{table}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ReportLayout;
