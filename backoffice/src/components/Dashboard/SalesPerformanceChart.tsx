import { useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency, formatNumber } from '../../lib/formatters';

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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-800">{t('salesComparison')}</h3>
        <p className="text-sm text-slate-500 mt-1">{t('currentVsPrevious')}</p>
      </div>
      <ReactApexChart options={chartOptions} series={series} type="bar" height={280} />
    </div>
  );
};
