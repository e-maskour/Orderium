import React from 'react';
import { formatAmount, formatQuantity } from '@orderium/ui';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { ReportChart as ReportChartData } from '../../../modules/analytics/analytics.interface';

interface ReportChartProps {
  chart: ReportChartData;
  height?: number;
}

const ReportChart: React.FC<ReportChartProps> = ({ chart, height = 320 }) => {
  const { type, labels, series } = chart;

  const options: ApexOptions = {
    chart: { toolbar: { show: false }, fontFamily: 'inherit' },
    xaxis: type !== 'pie' ? { categories: labels } : undefined,
    labels: type === 'pie' ? labels : undefined,
    yaxis:
      type !== 'pie'
        ? { labels: { formatter: (val: number) => formatQuantity(val, 2) } }
        : undefined,
    dataLabels: {
      enabled: type === 'pie',
      formatter: (val: number) => `${formatAmount(val, 1)} %`,
    },
    legend: { position: 'bottom' },
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
    tooltip: {
      y: {
        formatter: (val: number) => `${formatAmount(val)} MAD`,
      },
    },
    plotOptions: {
      bar: { borderRadius: 4, columnWidth: '55%' },
    },
  };

  // For pie charts series is number[], for others it's {name, data}[]
  const chartSeries =
    type === 'pie' ? (series as number[]) : (series as { name: string; data: number[] }[]);

  return (
    <ReactApexChart
      type={type === 'area' ? 'area' : type === 'line' ? 'line' : type === 'pie' ? 'pie' : 'bar'}
      series={chartSeries}
      options={options}
      height={height}
    />
  );
};

export default ReportChart;
