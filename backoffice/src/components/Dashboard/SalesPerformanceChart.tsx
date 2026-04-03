import { useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { BarChart2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency } from '../../lib/formatters';

interface SalesPerformanceChartProps {
  data: {
    categories: string[];
    currentPeriod: number[];
    previousPeriod: number[];
  };
}

export const SalesPerformanceChart: React.FC<SalesPerformanceChartProps> = ({ data }) => {
  const { t, language } = useLanguage();
  const [chartOptions, setChartOptions] = useState<ApexOptions>({});

  useEffect(() => {
    const options: ApexOptions = {
      chart: {
        type: 'bar',
        height: 280,
        toolbar: {
          show: false,
        },
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '60%',
          borderRadius: 8,
          borderRadiusApplication: 'end',
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent'],
      },
      colors: ['#3b82f6', '#e2e8f0'],
      xaxis: {
        categories: data.categories,
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
      yaxis: {
        title: {
          text: t('sales'),
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
      grid: {
        borderColor: '#f1f5f9',
        strokeDashArray: 3,
        xaxis: {
          lines: {
            show: false,
          },
        },
      },
      fill: {
        opacity: 1,
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
        y: {
          formatter: (value) => formatCurrency(value, language),
        },
      },
    };

    setChartOptions(options);
  }, [data, t, language]);

  const series = [
    {
      name: t('currentPeriod'),
      data: data.currentPeriod,
    },
    {
      name: t('previousPeriod'),
      data: data.previousPeriod,
    },
  ];

  return (
    <div className="db-chart-card">
      <div className="db-chart-header">
        <div className="db-chart-header-left">
          <div
            className="db-chart-icon"
            style={{
              background: 'linear-gradient(135deg,#3b82f6,#2563eb)',
              boxShadow: '0 4px 10px rgba(59,130,246,0.28)',
            }}
          >
            <BarChart2
              style={{ width: '1.125rem', height: '1.125rem', color: '#fff' }}
              strokeWidth={2}
            />
          </div>
          <div>
            <h3 className="db-chart-title">{t('salesComparison')}</h3>
            <p className="db-chart-subtitle">{t('currentVsPrevious')}</p>
          </div>
        </div>
        <span
          className="db-chart-badge"
          style={{
            background: '#eff6ff',
            color: '#2563eb',
            border: '1px solid #bfdbfe',
          }}
        >
          {t('currentPeriod')} vs {t('previousPeriod')}
        </span>
      </div>
      <div className="db-chart-body">
        {Object.keys(chartOptions).length > 0 && (
          <ReactApexChart options={chartOptions} series={series} type="bar" height={280} />
        )}
      </div>
    </div>
  );
};
