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

  // Fetch analytics from API
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['supplier-analytics', id, selectedYear],
    queryFn: () => partnersService.getSupplierAnalytics(Number(id), selectedYear),
    enabled: !!id,
  });

  if (partnerLoading || analyticsLoading) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!partner || !analytics) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">
            <p className="text-slate-500">Fournisseur non trouvé</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Extract data from analytics
  const { kpis, chartData: apiChartData } = analytics;
  const { totalInvoices, totalExpenses, paidAmount, unpaidAmount, averagePerInvoice } = kpis;

  // Map chart data to include month names
  const months = [t('monthJan'), t('monthFeb'), t('monthMar'), t('monthApr'), t('monthMay'), t('monthJun'), t('monthJul'), t('monthAug'), t('monthSep'), t('monthOct'), t('monthNov'), t('monthDec')];
  const chartData: ChartDataPoint[] = apiChartData.map((data: any) => ({
    month: months[data.month - 1],
    count: data.count,
    amount: data.amount
  }));
  
  // Get available years (show last 5 years from current year)
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Compact Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/fournisseurs')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-slate-900">{partner.name}</h1>
                  <p className="text-sm text-slate-500">{t('supplierDetails')}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate(`/fournisseurs/edit/${id}`)}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Modifier
            </button>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Invoices KPI */}
              <div className="bg-white rounded-lg p-4 border border-slate-200 hover:border-blue-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Total Factures</p>
                    <h3 className="text-2xl font-bold text-slate-900">{totalInvoices}</h3>
                  </div>
                </div>
              </div>

              {/* Total Expenses KPI */}
              <div className="bg-white rounded-lg p-4 border border-slate-200 hover:border-emerald-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Dépenses Totales</p>
                    <h3 className="text-xl font-bold text-slate-900">{formatDH(totalExpenses, 0)}</h3>
                  </div>
                </div>
              </div>

              {/* Unpaid Amount KPI */}
              <div className="bg-white rounded-lg p-4 border border-slate-200 hover:border-amber-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Impayé</p>
                    <h3 className="text-xl font-bold text-slate-900">{formatDH(unpaidAmount, 0)}</h3>
                  </div>
                </div>
              </div>

              {/* Average Per Invoice KPI */}
              <div className="bg-white rounded-lg p-4 border border-slate-200 hover:border-purple-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Moyenne/Facture</p>
                    <h3 className="text-xl font-bold text-slate-900">{formatDH(averagePerInvoice, 0)}</h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart Section */}
            <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl p-8 border border-slate-200/60 shadow-lg shadow-slate-200/40">
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg shadow-amber-500/30">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Évolution mensuelle des dépenses
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Analyse détaillée des montants facturés</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {/* Year Filter */}
                  <div className="relative">
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="px-4 py-2.5 text-sm font-semibold border-2 border-slate-200 rounded-xl bg-white hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none transition-all shadow-sm cursor-pointer appearance-none pr-10"
                    >
                      {availableYears.length > 0 ? (
                        availableYears.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))
                      ) : (
                        <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                      )}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="relative">
                {chartData.every(d => d.count === 0 && d.amount === 0) ? (
                  <div className="text-center py-16">
                    <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Aucune donnée disponible pour {selectedYear}</p>
                  </div>
                ) : (
                  <div className="space-y-6 md:space-y-8">
                    {/* Line Chart */}
                    <div className="relative bg-gradient-to-br from-white via-amber-50/30 to-white rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 border border-slate-200/60 shadow-xl shadow-amber-100/50 overflow-visible z-10">
                      {/* Background decoration */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(251,146,60,0.08),transparent_50%)] rounded-2xl md:rounded-3xl overflow-hidden -z-10" />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(253,186,116,0.1),transparent_50%)] rounded-2xl md:rounded-3xl overflow-hidden -z-10" />
                      <div className="relative z-20">
                        <Chart
                          options={{
                            chart: {
                              type: 'area',
                              height: 420,
                              fontFamily: 'inherit',
                              toolbar: { show: false },
                              zoom: { enabled: false },
                              animations: {
                                enabled: true,
                                easing: 'easeinout',
                                speed: 1200,
                                animateGradually: {
                                  enabled: true,
                                  delay: 150
                                },
                                dynamicAnimation: {
                                  enabled: true,
                                  speed: 600
                                }
                              }
                            },
                            dataLabels: { enabled: false },
                            stroke: {
                              curve: 'smooth',
                              width: 3,
                              lineCap: 'round'
                            },
                            fill: {
                              type: 'gradient',
                              gradient: {
                                shade: 'light',
                                type: 'vertical',
                                shadeIntensity: 0.5,
                                gradientToColors: ['#FCD34D'],
                                inverseColors: false,
                                opacityFrom: 0.6,
                                opacityTo: 0.05,
                                stops: [0, 90, 100]
                              }
                            },
                            colors: ['#F59E0B'],
                            markers: {
                              size: 5,
                              colors: ['#F59E0B'],
                              strokeColors: '#fff',
                              strokeWidth: 3,
                              hover: {
                                size: 8,
                                sizeOffset: 3
                              },
                              shape: 'circle',
                              discrete: chartData.map((data, index) => ({
                                seriesIndex: 0,
                                dataPointIndex: index,
                                fillColor: data.count > 0 ? '#F59E0B' : '#94A3B8',
                                strokeColor: '#fff',
                                size: data.count > 0 ? 6 : 4,
                              }))
                            },
                            grid: {
                              borderColor: '#E2E8F0',
                              strokeDashArray: 4,
                              padding: {
                                top: 0,
                                right: 10,
                                bottom: 0,
                                left: 0
                              },
                              xaxis: { lines: { show: false } },
                              yaxis: { lines: { show: true } }
                            },
                            xaxis: {
                              categories: chartData.map(d => d.month),
                              labels: {
                                style: {
                                  colors: '#64748B',
                                  fontSize: '12px',
                                  fontWeight: 600
                                },
                                offsetY: 5,
                                rotate: -45,
                                rotateAlways: false,
                                hideOverlappingLabels: true,
                                trim: true
                              },
                              axisBorder: { show: false },
                              axisTicks: { show: false },
                              crosshairs: {
                                show: true,
                                width: 1,
                                stroke: {
                                  color: '#F59E0B',
                                  width: 2,
                                  dashArray: 0
                                },
                                dropShadow: {
                                  enabled: true,
                                  top: 0,
                                  left: 0,
                                  blur: 4,
                                  opacity: 0.4
                                }
                              }
                            },
                            yaxis: {
                              labels: {
                                style: {
                                  colors: '#475569',
                                  fontSize: '11px',
                                  fontWeight: 700
                                },
                                formatter: (value) => {
                                  if (value >= 1000) {
                                    return `${(value / 1000).toFixed(1).replace('.', ',')}k`;
                                  }
                                  return formatFrenchNumber(value, 0);
                                },
                                offsetX: -5
                              },
                              title: {
                                text: 'Montant (DH)',
                                style: {
                                  color: '#64748B',
                                  fontSize: '11px',
                                  fontWeight: 600
                                },
                                offsetX: 0
                              }
                            },
                            tooltip: {
                              enabled: true,
                              shared: false,
                              intersect: true,
                              followCursor: false,
                              theme: 'dark',
                              style: {
                                fontSize: '13px',
                                fontFamily: 'inherit'
                              },
                              x: {
                                show: true,
                                formatter: (value, { dataPointIndex }) => {
                                  return `${chartData[dataPointIndex].month} ${selectedYear}`;
                                }
                              },
                              y: {
                                formatter: (value, { dataPointIndex }) => {
                                  const data = chartData[dataPointIndex];
                                  return `<div class="space-y-2 py-1">
                                    <div class="flex items-center justify-between gap-8">
                                      <span class="text-slate-300 text-xs">Factures:</span>
                                      <span class="font-bold text-white">${data.count}</span>
                                    </div>
                                    <div class="flex items-center justify-between gap-8">
                                      <span class="text-slate-300 text-xs">Montant:</span>
                                      <span class="font-bold text-emerald-400">${formatDH(value)}</span>
                                    </div>
                                  </div>`;
                                },
                                title: { formatter: () => '' }
                              },
                              marker: { show: true },
                              custom: undefined
                            },
                            legend: { show: false },
                            responsive: [
                              {
                                breakpoint: 640,
                                options: {
                                  chart: { height: 280 },
                                  stroke: { width: 2 },
                                  markers: { size: 3 },
                                  grid: {
                                    padding: {
                                      top: 0,
                                      right: 5,
                                      bottom: 0,
                                      left: -5
                                    }
                                  },
                                  xaxis: {
                                    labels: {
                                      style: { fontSize: '10px' },
                                      rotate: -45,
                                      rotateAlways: true
                                    }
                                  },
                                  yaxis: {
                                    labels: {
                                      style: { fontSize: '9px' },
                                      offsetX: -2
                                    },
                                    title: {
                                      text: undefined
                                    }
                                  },
                                  tooltip: {
                                    style: { fontSize: '11px' }
                                  }
                                }
                              },
                              {
                                breakpoint: 1024,
                                options: {
                                  chart: { height: 350 },
                                  xaxis: {
                                    labels: {
                                      rotate: 0
                                    }
                                  }
                                }
                              }
                            ]
                          } as ApexOptions}
                          series={[{
                            name: 'Dépenses',
                            data: chartData.map(d => d.amount)
                          }]}
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
