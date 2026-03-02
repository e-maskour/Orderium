import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { partnersService } from '../modules/partners';
import { AdminLayout } from '../components/AdminLayout';
import { useLanguage } from '../context/LanguageContext';
import { formatDH, formatFrenchNumber } from '../utils/formatNumber';
import {
  Users,
  ArrowLeft,
  Edit,
  FileText,
  Clock,
  CreditCard,
  BarChart3,
  ChevronDown,
  Receipt,
  TrendingUp
} from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';

interface ChartDataPoint {
  month: string;
  count: number;
  amount: number;
}

export default function FournisseurDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const { data: partner, isLoading: partnerLoading } = useQuery({
    queryKey: ['partner', id],
    queryFn: () => partnersService.getById(Number(id)),
    enabled: !!id,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['supplier-analytics', id, selectedYear],
    queryFn: () => partnersService.getSupplierAnalytics(Number(id), selectedYear),
    enabled: !!id,
  });

  if (partnerLoading || analyticsLoading) {
    return (
      <AdminLayout>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem' }}>
            <div className="animate-spin" style={{ borderRadius: '9999px', width: '2rem', height: '2rem', borderBottom: '2px solid #f59e0b' }}></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!partner || !analytics) {
    return (
      <AdminLayout>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <p style={{ color: '#64748b' }}>Fournisseur non trouvé</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const { kpis, chartData: apiChartData } = analytics;
  const { totalInvoices, totalExpenses, paidAmount, unpaidAmount, averagePerInvoice } = kpis;

  const months = [t('monthJan'), t('monthFeb'), t('monthMar'), t('monthApr'), t('monthMay'), t('monthJun'), t('monthJul'), t('monthAug'), t('monthSep'), t('monthOct'), t('monthNov'), t('monthDec')];
  const chartData: ChartDataPoint[] = apiChartData.map((data: any) => ({
    month: months[data.month - 1],
    count: data.count,
    amount: data.amount
  }));

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const yearOptions = availableYears.map(y => ({ label: String(y), value: y }));

  return (
    <AdminLayout>
      <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button onClick={() => navigate('/fournisseurs')} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}>
                <ArrowLeft style={{ width: '1.25rem', height: '1.25rem', color: '#475569' }} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', backgroundColor: '#fef3c7', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users style={{ width: '1.25rem', height: '1.25rem', color: '#d97706' }} />
                </div>
                <div>
                  <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>{partner.name}</h1>
                  <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{t('supplierDetails')}</p>
                </div>
              </div>
            </div>
            <Button onClick={() => navigate(`/fournisseurs/edit/${id}`)} icon={<Edit style={{ width: '1rem', height: '1rem' }} />} label="Modifier" />
          </div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '3rem', height: '3rem', backgroundColor: '#dbeafe', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText style={{ width: '1.5rem', height: '1.5rem', color: '#2563eb' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#475569' }}>Total Factures</p>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{totalInvoices}</h3>
                  </div>
                </div>
              </div>
              <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '3rem', height: '3rem', backgroundColor: '#d1fae5', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard style={{ width: '1.5rem', height: '1.5rem', color: '#059669' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#475569' }}>Dépenses Totales</p>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{formatDH(totalExpenses, 0)}</h3>
                  </div>
                </div>
              </div>
              <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '3rem', height: '3rem', backgroundColor: '#fef3c7', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock style={{ width: '1.5rem', height: '1.5rem', color: '#d97706' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#475569' }}>Impayé</p>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{formatDH(unpaidAmount, 0)}</h3>
                  </div>
                </div>
              </div>
              <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '3rem', height: '3rem', backgroundColor: '#f3e8ff', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BarChart3 style={{ width: '1.5rem', height: '1.5rem', color: '#9333ea' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#475569' }}>Moyenne/Facture</p>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{formatDH(averagePerInvoice, 0)}</h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart Section */}
            <div style={{ background: 'linear-gradient(to bottom right, white, #f8fafc)', borderRadius: '1rem', padding: '2rem', border: '1px solid rgba(226,232,240,0.6)', boxShadow: '0 10px 15px -3px rgba(226,232,240,0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.625rem', background: 'linear-gradient(to bottom right, #f59e0b, #d97706)', borderRadius: '0.75rem', boxShadow: '0 10px 15px -3px rgba(245,158,11,0.3)' }}>
                      <BarChart3 style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>Évolution mensuelle des dépenses</h3>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>Analyse détaillée des montants facturés</p>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Dropdown value={selectedYear} onChange={(e) => setSelectedYear(Number(e.value))} options={yearOptions} optionLabel="label" optionValue="value" />
                </div>
              </div>

              <div style={{ position: 'relative' }}>
                {chartData.every(d => d.count === 0 && d.amount === 0) ? (
                  <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                    <BarChart3 style={{ width: '4rem', height: '4rem', color: '#cbd5e1', margin: '0 auto 0.75rem' }} />
                    <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Aucune donnée disponible pour {selectedYear}</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ position: 'relative', borderRadius: '1rem', padding: '2rem', border: '1px solid rgba(226,232,240,0.6)', boxShadow: '0 20px 25px -5px rgba(254,243,199,0.5)', overflow: 'visible', zIndex: 10 }}>
                      <div style={{ position: 'relative', zIndex: 20 }}>
                        <Chart
                          options={{
                            chart: {
                              type: 'area', height: 420, fontFamily: 'inherit',
                              toolbar: { show: false }, zoom: { enabled: false },
                              animations: { enabled: true, easing: 'easeinout', speed: 1200, animateGradually: { enabled: true, delay: 150 }, dynamicAnimation: { enabled: true, speed: 600 } }
                            },
                            dataLabels: { enabled: false },
                            stroke: { curve: 'smooth', width: 3, lineCap: 'round' },
                            fill: {
                              type: 'gradient',
                              gradient: { shade: 'light', type: 'vertical', shadeIntensity: 0.5, gradientToColors: ['#FCD34D'], inverseColors: false, opacityFrom: 0.6, opacityTo: 0.05, stops: [0, 90, 100] }
                            },
                            colors: ['#F59E0B'],
                            markers: {
                              size: 5, colors: ['#F59E0B'], strokeColors: '#fff', strokeWidth: 3,
                              hover: { size: 8, sizeOffset: 3 }, shape: 'circle',
                              discrete: chartData.map((data, index) => ({ seriesIndex: 0, dataPointIndex: index, fillColor: data.count > 0 ? '#F59E0B' : '#94A3B8', strokeColor: '#fff', size: data.count > 0 ? 6 : 4 }))
                            },
                            grid: { borderColor: '#E2E8F0', strokeDashArray: 4, padding: { top: 0, right: 10, bottom: 0, left: 0 }, xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
                            xaxis: {
                              categories: chartData.map(d => d.month),
                              labels: { style: { colors: '#64748B', fontSize: '12px', fontWeight: 600 }, offsetY: 5, rotate: -45, rotateAlways: false, hideOverlappingLabels: true, trim: true },
                              axisBorder: { show: false }, axisTicks: { show: false },
                              crosshairs: { show: true, width: 1, stroke: { color: '#F59E0B', width: 2, dashArray: 0 }, dropShadow: { enabled: true, top: 0, left: 0, blur: 4, opacity: 0.4 } }
                            },
                            yaxis: {
                              labels: {
                                style: { colors: '#475569', fontSize: '11px', fontWeight: 700 },
                                formatter: (value) => value >= 1000 ? `${(value / 1000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k` : formatFrenchNumber(value, 0),
                                offsetX: -5
                              },
                              title: { text: 'Montant (DH)', style: { color: '#64748B', fontSize: '11px', fontWeight: 600 }, offsetX: 0 }
                            },
                            tooltip: {
                              enabled: true, shared: false, intersect: true, followCursor: false, theme: 'dark',
                              style: { fontSize: '13px', fontFamily: 'inherit' },
                              x: { show: true, formatter: (value, { dataPointIndex }) => `${chartData[dataPointIndex].month} ${selectedYear}` },
                              y: {
                                formatter: (value, { dataPointIndex }) => {
                                  const data = chartData[dataPointIndex];
                                  return `<div style="display:flex;flex-direction:column;gap:0.5rem;padding:0.25rem 0">
                                    <div style="display:flex;align-items:center;justify-content:space-between;gap:2rem">
                                      <span style="color:#cbd5e1;font-size:0.75rem">Factures:</span>
                                      <span style="font-weight:700;color:white">${data.count}</span>
                                    </div>
                                    <div style="display:flex;align-items:center;justify-content:space-between;gap:2rem">
                                      <span style="color:#cbd5e1;font-size:0.75rem">Montant:</span>
                                      <span style="font-weight:700;color:#34d399">${formatDH(value)}</span>
                                    </div>
                                  </div>`;
                                },
                                title: { formatter: () => '' }
                              },
                              marker: { show: true }, custom: undefined
                            },
                            legend: { show: false },
                            responsive: [
                              { breakpoint: 640, options: { chart: { height: 280 }, stroke: { width: 2 }, markers: { size: 3 }, grid: { padding: { top: 0, right: 5, bottom: 0, left: -5 } }, xaxis: { labels: { style: { fontSize: '10px' }, rotate: -45, rotateAlways: true } }, yaxis: { labels: { style: { fontSize: '9px' }, offsetX: -2 }, title: { text: undefined } }, tooltip: { style: { fontSize: '11px' } } } },
                              { breakpoint: 1024, options: { chart: { height: 350 }, xaxis: { labels: { rotate: 0 } } } }
                            ]
                          } as ApexOptions}
                          series={[{ name: 'Dépenses', data: chartData.map(d => d.amount) }]}
                          type="area"
                          height={typeof window !== 'undefined' && window.innerWidth < 640 ? 280 : window.innerWidth < 1024 ? 350 : 420}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
