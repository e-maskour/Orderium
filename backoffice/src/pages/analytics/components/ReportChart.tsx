import React, { useMemo, useState } from 'react';
import { formatAmount, formatDate } from '@orderium/ui';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { AreaChart, BarChart3, LineChart, PieChart } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import type { ReportChart as ReportChartData } from '../../../modules/analytics/analytics.interface';

interface ReportChartProps {
  chart: ReportChartData;
  height?: number;
  /** Card title. Defaults to the generic "Chart" label. */
  title?: string;
  /** Unit shown in tooltips and the donut total. @default 'MAD' */
  unit?: string;
  /** Hide the built-in title / type switcher (when embedded in a panel). */
  bare?: boolean;
}

type CartesianType = 'bar' | 'line' | 'area';

/** Validated categorical order — brand blue first, then hue-distinct partners. */
const PALETTE = ['#235ae4', '#0d9488', '#d97706', '#db2777', '#7c3aed', '#0891b2', '#64748b'];
const AXIS = '#64748b';
const GRID = '#eef2f6';

const ReportChart: React.FC<ReportChartProps> = ({
  chart,
  height = 320,
  title,
  unit = 'MAD',
  bare = false,
}) => {
  const { t, language } = useLanguage();
  const { series } = chart;
  // Period labels arrive as ISO timestamps ("2026-08-08T00:00:00.000Z") — show dd/MM/yyyy.
  const labels = useMemo(
    () =>
      chart.labels.map((l) =>
        typeof l === 'string' && /^\d{4}-\d{2}-\d{2}(T|$)/.test(l) ? formatDate(l) : l,
      ),
    [chart.labels],
  );
  const isPie = chart.type === 'pie';
  const [view, setView] = useState<CartesianType>(isPie ? 'bar' : (chart.type as CartesianType));

  const compact = useMemo(
    () =>
      new Intl.NumberFormat(language === 'ar' ? 'ar-MA' : 'fr-MA', {
        notation: 'compact',
        maximumFractionDigits: 1,
      }),
    [language],
  );

  const withUnit = (v: number, u = unit) => (u ? `${formatAmount(v)} ${u}` : formatAmount(v));

  // Mixed-unit charts (e.g. "CA (MAD)" + "Commandes"): money series stay on the
  // left axis with the report unit, counts move to a right axis without one,
  // so a count is never flattened against revenue nor labelled "MAD".
  const cartesian = isPie ? [] : (series as { name: string; data: number[] }[]);
  const hasMoneySeries = cartesian.some((s) => /\bMAD\b/.test(s.name));
  const isMoney = (name: string) => !hasMoneySeries || /\bMAD\b/.test(name);
  const mixed = hasMoneySeries && cartesian.some((s) => !isMoney(s.name));
  const firstMoney = cartesian.find((s) => isMoney(s.name))?.name;
  const firstCount = cartesian.find((s) => !isMoney(s.name))?.name;
  const unitAt = (seriesIndex: number) =>
    isPie || isMoney(cartesian[seriesIndex]?.name ?? '') ? unit : '';

  const pieTotal = isPie ? (series as number[]).reduce((s, v) => s + Number(v || 0), 0) : 0;

  const options: ApexOptions = {
    chart: {
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: 'inherit',
      foreColor: AXIS,
      animations: { enabled: true, speed: 350 },
    },
    colors: PALETTE,
    grid: {
      borderColor: GRID,
      strokeDashArray: 4,
      padding: { left: 8, right: 8 },
      xaxis: { lines: { show: false } },
    },
    legend: {
      position: 'bottom',
      horizontalAlign: 'center',
      fontSize: '12px',
      markers: { size: 5, shape: 'circle' },
      itemMargin: { horizontal: 10, vertical: 4 },
    },
    tooltip: {
      theme: 'light',
      shared: !isPie,
      intersect: false,
      y: {
        formatter: (v: number, opts?: { seriesIndex?: number }) =>
          withUnit(v, unitAt(opts?.seriesIndex ?? 0)),
      },
    },
    dataLabels: { enabled: false },
  };

  if (isPie) {
    Object.assign(options, {
      labels,
      stroke: { width: 2, colors: ['#ffffff'] },
      plotOptions: {
        pie: {
          donut: {
            size: '68%',
            labels: {
              show: true,
              name: { fontSize: '12px', color: AXIS, offsetY: 18 },
              value: {
                fontSize: '20px',
                fontWeight: 700,
                color: '#0f172a',
                offsetY: -12,
                formatter: (v: string) => compact.format(Number(v)),
              },
              total: {
                show: true,
                label: t('total'),
                color: AXIS,
                fontSize: '12px',
                formatter: () => compact.format(pieTotal),
              },
            },
          },
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => (val >= 4 ? `${formatAmount(val, 1)} %` : ''),
        dropShadow: { enabled: false },
        style: { fontSize: '11px', fontWeight: 600 },
      },
    } satisfies ApexOptions);
  } else {
    Object.assign(options, {
      xaxis: {
        categories: labels,
        axisBorder: { color: GRID },
        axisTicks: { show: false },
        labels: { rotate: -35, hideOverlappingLabels: true, trim: true, maxHeight: 80 },
        tooltip: { enabled: false },
      },
      yaxis: mixed
        ? cartesian.map((s) => {
            const money = isMoney(s.name);
            const group = money ? firstMoney : firstCount;
            return {
              seriesName: group,
              opposite: !money,
              show: s.name === group,
              labels: { formatter: (v: number) => compact.format(v) },
            };
          })
        : { labels: { formatter: (v: number) => compact.format(v) } },
      stroke: view === 'bar' ? { width: 0 } : { width: 2.5, curve: 'smooth', lineCap: 'round' },
      markers: { size: 0, hover: { size: 5 } },
      fill:
        view === 'area'
          ? { type: 'gradient', gradient: { opacityFrom: 0.28, opacityTo: 0.02, stops: [0, 95] } }
          : { opacity: 1 },
      plotOptions: {
        bar: {
          borderRadius: 4,
          borderRadiusApplication: 'end',
          columnWidth: labels.length > 20 ? '75%' : '52%',
        },
      },
    } satisfies ApexOptions);
  }

  const VIEWS: { key: CartesianType; icon: React.ElementType; label: string }[] = [
    { key: 'bar', icon: BarChart3, label: t('analyticsChartBar') },
    { key: 'line', icon: LineChart, label: t('analyticsChartLine') },
    { key: 'area', icon: AreaChart, label: t('analyticsChartArea') },
  ];

  const empty =
    labels.length === 0 ||
    (isPie
      ? pieTotal === 0
      : (series as { data: number[] }[]).every((s) => s.data.every((v) => !v)));

  return (
    <div className="ax-chart">
      {!bare && (
        <div className="ax-section-head">
          <span className="ax-section-head__title">
            {isPie ? <PieChart aria-hidden="true" /> : <BarChart3 aria-hidden="true" />}
            {title ?? t('analyticsSectionChart')}
          </span>
          {!isPie && !empty && (
            <div className="ax-seg ax-seg--icons" role="group" aria-label={t('analyticsChartType')}>
              {VIEWS.map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  type="button"
                  className={`ax-seg__btn${view === key ? ' ax-seg__btn--active' : ''}`}
                  aria-pressed={view === key}
                  title={label}
                  aria-label={label}
                  onClick={() => setView(key)}
                >
                  <Icon aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {empty ? (
        <div className="ax-empty ax-empty--chart">
          <BarChart3 aria-hidden="true" />
          <p>{t('reportNoDataAvailable')}</p>
        </div>
      ) : (
        <div dir="ltr">
          <ReactApexChart
            key={isPie ? 'donut' : view}
            type={isPie ? 'donut' : view}
            series={isPie ? (series as number[]) : (series as { name: string; data: number[] }[])}
            options={options}
            height={height}
          />
        </div>
      )}
    </div>
  );
};

export default ReportChart;
