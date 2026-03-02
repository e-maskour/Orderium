import { useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { useLanguage } from '../../context/LanguageContext';

interface OrdersDistributionChartProps {
  data: {
    pending: number;
    inDelivery: number;
    delivered: number;
    cancelled: number;
  };
}

export const OrdersDistributionChart: React.FC<OrdersDistributionChartProps> = ({ data }) => {
  const { t } = useLanguage();
  const [chartOptions, setChartOptions] = useState<ApexOptions>({});

  useEffect(() => {
    const options: ApexOptions = {
      chart: {
        type: 'donut',
        height: 280,
        fontFamily: 'Inter, system-ui, sans-serif',
        toolbar: {
          show: false,
        },
      },
      labels: [t('pending'), t('inDelivery'), t('delivered'), t('cancelled')],
      colors: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444'],
      legend: {
        position: 'bottom',
        fontSize: '14px',
        fontWeight: 600,
        labels: {
          colors: '#64748b',
        },
        markers: {
          size: 6,
        },
      },
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '14px',
                fontWeight: 600,
                color: '#64748b',
              },
              value: {
                show: true,
                fontSize: '24px',
                fontWeight: 700,
                color: '#1e293b',
                formatter: (val) => val.toString(),
              },
              total: {
                show: true,
                label: t('totalOrders'),
                fontSize: '14px',
                fontWeight: 600,
                color: '#64748b',
                formatter: (w) => {
                  const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                  return total.toString();
                },
              },
            },
          },
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        width: 2,
        colors: ['#fff'],
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

  const series = [data.pending, data.inDelivery, data.delivered, data.cancelled];

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', border: '1px solid rgba(226,232,240,0.6)', padding: '1.25rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{t('ordersDistribution')}</h3>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>{t('byStatus')}</p>
      </div>
      <ReactApexChart options={chartOptions} series={series} type="donut" height={280} />
    </div>
  );
};
