import { useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { Activity } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface OrdersTimelineChartProps {
  data: {
    dates: string[];
    newOrders: number[];
    delivered: number[];
    cancelled: number[];
  };
}

export const OrdersTimelineChart: React.FC<OrdersTimelineChartProps> = ({ data }) => {
  const { t } = useLanguage();
  const [chartOptions, setChartOptions] = useState<ApexOptions>({});

  useEffect(() => {
    const options: ApexOptions = {
      chart: {
        type: 'line',
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
      colors: ['#3b82f6', '#10b981', '#ef4444'],
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
      yaxis: {
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
        y: {
          formatter: (value) => `${value} ${t('orders').toLowerCase()}`,
        },
      },
    };

    setChartOptions(options);
  }, [data, t]);

  const series = [
    {
      name: t('newOrders'),
      data: data.newOrders,
    },
    {
      name: t('delivered'),
      data: data.delivered,
    },
    {
      name: t('cancelled'),
      data: data.cancelled,
    },
  ];

  return (
    <div className="db-chart-card">
      <div className="db-chart-header">
        <div className="db-chart-header-left">
          <div
            className="db-chart-icon"
            style={{
              background: 'linear-gradient(135deg,#10b981,#059669)',
              boxShadow: '0 4px 10px rgba(16,185,129,0.28)',
            }}
          >
            <Activity
              style={{ width: '1.125rem', height: '1.125rem', color: '#fff' }}
              strokeWidth={2}
            />
          </div>
          <div>
            <h3 className="db-chart-title">{t('ordersTimeline')}</h3>
            <p className="db-chart-subtitle">{t('dailyOrdersFlow')}</p>
          </div>
        </div>
        <span
          className="db-chart-badge"
          style={{
            background: '#ecfdf5',
            color: '#059669',
            border: '1px solid #a7f3d0',
          }}
        >
          {t('newOrders')} · {t('delivered')} · {t('cancelled')}
        </span>
      </div>
      <div className="db-chart-body">
        {Object.keys(chartOptions).length > 0 && (
          <ReactApexChart options={chartOptions} series={series} type="line" height={280} />
        )}
      </div>
    </div>
  );
};
