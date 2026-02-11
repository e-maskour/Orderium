import { useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency, formatNumber } from '../../lib/formatters';

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
      colors: ['#10b981', '#3b82f6'],
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{t('revenueTrend')}</h3>
          <p className="text-sm text-slate-500 mt-1">{t('last7Days')}</p>
        </div>
      </div>
      <ReactApexChart options={chartOptions} series={series} type="area" height={280} />
    </div>
  );
};
