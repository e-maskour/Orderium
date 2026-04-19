import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart2 } from 'lucide-react';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';

interface ReportCard {
  title: string;
  description: string;
  path: string;
}

interface DomainSection {
  domain: string;
  icon: string;
  color: string;
  reports: ReportCard[];
}

const DOMAINS: DomainSection[] = [
  {
    domain: 'Ventes',
    icon: 'pi pi-chart-line',
    color: 'blue',
    reports: [
      {
        title: "Chiffre d'affaires",
        description: 'Revenu par période avec évolution',
        path: '/analytics/sales/revenue',
      },
      {
        title: 'Top produits vendus',
        description: 'Classement des produits les plus performants',
        path: '/analytics/sales/top-products',
      },
      {
        title: 'Ventes par client',
        description: 'Montant total commandé par client',
        path: '/analytics/sales/by-customer',
      },
      {
        title: 'Ventes par catégorie',
        description: "Répartition du chiffre d'affaires par catégorie",
        path: '/analytics/sales/by-category',
      },
      {
        title: 'Ventes par caisse',
        description: 'Performance par point de vente',
        path: '/analytics/sales/by-pos',
      },
    ],
  },
  {
    domain: 'Achats',
    icon: 'pi pi-shopping-bag',
    color: 'orange',
    reports: [
      {
        title: 'Achats par période',
        description: 'Évolution des dépenses fournisseurs',
        path: '/analytics/purchases/by-period',
      },
      {
        title: 'Top fournisseurs',
        description: 'Fournisseurs avec le plus de commandes',
        path: '/analytics/purchases/top-suppliers',
      },
      {
        title: 'Achats par produit',
        description: 'Produits les plus achetés',
        path: '/analytics/purchases/by-product',
      },
    ],
  },
  {
    domain: 'Factures',
    icon: 'pi pi-file',
    color: 'purple',
    reports: [
      {
        title: 'Journal de vente',
        description: 'Toutes les factures clients',
        path: '/analytics/invoices/journal-vente',
      },
      {
        title: "Journal d'achat",
        description: 'Toutes les factures fournisseurs',
        path: '/analytics/invoices/journal-achat',
      },
      {
        title: 'Bilan TVA',
        description: 'Déclaration TVA par taux',
        path: '/analytics/invoices/tva',
      },
      {
        title: 'Factures impayées',
        description: 'Factures en attente de règlement',
        path: '/analytics/invoices/outstanding',
      },
      {
        title: 'Balance âgée',
        description: 'Retards de paiement par tranche',
        path: '/analytics/invoices/aging',
      },
    ],
  },
  {
    domain: 'Paiements',
    icon: 'pi pi-credit-card',
    color: 'green',
    reports: [
      {
        title: 'Flux de trésorerie',
        description: 'Entrées et sorties cumulées',
        path: '/analytics/payments/cashflow',
      },
      {
        title: 'Paiements par mode',
        description: 'Répartition espèces / virement / chèque',
        path: '/analytics/payments/by-method',
      },
      {
        title: 'Entrées vs Sorties',
        description: 'Comparaison encaissements et décaissements',
        path: '/analytics/payments/in-out',
      },
    ],
  },
  {
    domain: 'Clients',
    icon: 'pi pi-users',
    color: 'teal',
    reports: [
      {
        title: 'Top clients',
        description: "Meilleurs clients par chiffre d'affaires",
        path: '/analytics/clients/top',
      },
      {
        title: 'Balance âgée clients',
        description: 'Créances clients par ancienneté',
        path: '/analytics/clients/aging',
      },
      {
        title: 'Clients inactifs',
        description: 'Clients sans commande récente',
        path: '/analytics/clients/inactive',
      },
      {
        title: 'Relevé de compte',
        description: "Historique complet d'un client",
        path: '/analytics/clients/statement',
      },
    ],
  },
  {
    domain: 'Fournisseurs',
    icon: 'pi pi-truck',
    color: 'yellow',
    reports: [
      {
        title: 'Top fournisseurs',
        description: "Fournisseurs par volume d'achats",
        path: '/analytics/suppliers/top',
      },
      {
        title: 'Balance âgée fournisseurs',
        description: 'Dettes fournisseurs par ancienneté',
        path: '/analytics/suppliers/aging',
      },
      {
        title: 'Relevé de compte',
        description: "Historique complet d'un fournisseur",
        path: '/analytics/suppliers/statement',
      },
    ],
  },
  {
    domain: 'Stock',
    icon: 'pi pi-box',
    color: 'cyan',
    reports: [
      {
        title: 'Valorisation du stock',
        description: 'Valeur totale du stock par produit',
        path: '/analytics/stock/valuation',
      },
      {
        title: 'Stock faible',
        description: "Produits sous le seuil d'alerte",
        path: '/analytics/stock/low-stock',
      },
      {
        title: 'Journal des mouvements',
        description: 'Historique entrées / sorties / transferts',
        path: '/analytics/stock/movements',
      },
      {
        title: 'Stock dormant',
        description: 'Produits sans mouvement récent',
        path: '/analytics/stock/slow-dead',
      },
      {
        title: 'Stock par entrepôt',
        description: 'Répartition du stock par dépôt',
        path: '/analytics/stock/by-warehouse',
      },
    ],
  },
  {
    domain: 'Produits',
    icon: 'pi pi-tag',
    color: 'pink',
    reports: [
      {
        title: 'Performance produits',
        description: 'Quantités vendues et CA par produit',
        path: '/analytics/products/performance',
      },
      {
        title: 'Analyse des marges',
        description: 'Marge brute par produit',
        path: '/analytics/products/margin',
      },
      {
        title: 'Produits jamais vendus',
        description: 'Articles sans aucune vente',
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
  return (
    <AdminLayout>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <PageHeader
          icon={BarChart2}
          title="Analytiques & Rapports"
          subtitle="Vue d'ensemble de tous les rapports disponibles"
        />

        <div className="flex flex-column gap-3">
          {DOMAINS.map((domain) => {
            const dc = DOMAIN_COLORS[domain.color] ?? DOMAIN_COLORS.blue;
            return (
              <div
                key={domain.domain}
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
                  <h3 className="text-base font-bold text-900 m-0">{domain.domain}</h3>
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: dc.badge,
                      color: '#fff',
                      borderRadius: '9999px',
                      padding: '0.125rem 0.625rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    {domain.reports.length} rapport{domain.reports.length > 1 ? 's' : ''}
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
                            <p className="font-semibold text-800 m-0 text-sm">{report.title}</p>
                            <i
                              className="pi pi-arrow-right text-400"
                              style={{ fontSize: '0.75rem' }}
                            />
                          </div>
                          <p
                            className="text-500 m-0"
                            style={{ fontSize: '0.75rem', lineHeight: 1.4 }}
                          >
                            {report.description}
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
