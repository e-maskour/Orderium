import { useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { TrendingUp } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency } from '../../lib/formatters';

interface RevenueChartProps {
  data: {
    dates: string[];
    revenue: number[];
    orders: number[];
  };
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  const { t, language } = useLanguage();
  const [chartOptions, setChartOptions] = useState<ApexOptions>({});

  useEffect(() => {
    const options: ApexOptions = {
      chart: {
        type: 'area',
        height: 280,
        toolbar: {
          show: false,
        },
        zoom: {
          enabled: false,
        },
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: 'smooth',
        width: 3,
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0.1,
          stops: [0, 90, 100],
        },
      },
      colors: ['#235ae4', '#a855f7'],
      xaxis: {
        categories: data.dates,
        labels: {
          style: {
            colors: '#64748b',
            fontSize: '12px',
            fontWeight: 500,
          },
        },
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
      yaxis: [
        {
          title: {
            text: t('revenue'),
            style: {
              color: '#64748b',
              fontSize: '12px',
              fontWeight: 600,
            },
          },
          labels: {
            style: {
              colors: '#64748b',
              fontSize: '12px',
            },
            formatter: (value) => {
              if (value === undefined || value === null) return '0';
              return Math.round(value).toLocaleString('en-US');
            },
          },
        },
        {
          opposite: true,
          title: {
            text: t('orders'),
            style: {
              color: '#64748b',
              fontSize: '12px',
              fontWeight: 600,
            },
          },
          labels: {
            style: {
              colors: '#64748b',
              fontSize: '12px',
            },
            formatter: (value) => value.toFixed(0),
          },
        },
      ],
      grid: {
        borderColor: '#f1f5f9',
        strokeDashArray: 3,
        xaxis: {
          lines: {
            show: false,
          },
        },
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '14px',
        fontWeight: 600,
        labels: {
          colors: '#64748b',
        },
        markers: {
          size: 6,
        },
      },
      tooltip: {
        theme: 'light',
        x: {
          show: true,
        },
        y: {
          formatter: (value, { seriesIndex }) => {
            if (seriesIndex === 0) {
              // Revenue
              return formatCurrency(value, language);
            }
            // Orders
            return value.toString();
          },
        },
      },
    };

    setChartOptions(options);
  }, [data, t, language]);

  const series = [
    {
      name: t('revenue'),
      data: data.revenue,
    },
    {
      name: t('orders'),
      data: data.orders,
    },
  ];

  return (
    <div className="db-chart-card">
      <div className="db-chart-header">
        <div className="db-chart-header-left">
          <div
            className="db-chart-icon"
            style={{
              background: 'linear-gradient(135deg,#235ae4,#1a47b8)',
              boxShadow: '0 4px 10px rgba(35,90,228,0.28)',
            }}
          >
            <TrendingUp
              style={{ width: '1.125rem', height: '1.125rem', color: '#fff' }}
              strokeWidth={2}
            />
          </div>
          <div>
            <h3 className="db-chart-title">
              {t('revenue')} & {t('orders')}
            </h3>
            <p className="db-chart-subtitle">{t('last7Days')}</p>
          </div>
        </div>
        <span
          className="db-chart-badge"
          style={{
            background: '#f0fdf4',
            color: '#16a34a',
            border: '1px solid #bbf7d0',
          }}
        >
          <span className="db-live-dot" />
          {t('last7Days')}
        </span>
      </div>
      <div className="db-chart-body">
        {Object.keys(chartOptions).length > 0 && (
          <ReactApexChart options={chartOptions} series={series} type="area" height={280} />
        )}
      </div>
    </div>
  );
};
