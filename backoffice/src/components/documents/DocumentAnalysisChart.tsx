import { useState, useMemo } from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { DocumentType } from '../../modules/documents/types';
import { DocumentItem } from '../../modules/documents/services/documents.service';
import { useLanguage } from '../../context/LanguageContext';
import { TrendingUp, Calendar, BarChart3, LineChart } from 'lucide-react';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';

interface DocumentAnalysisChartProps {
  documents: DocumentItem[];
  documentType: DocumentType;
  analytics?: any; // Analytics data from API
  onYearChange?: (year: number) => void; // Callback when year changes
}

type MeasureType = 'subtotal' | 'total' | 'margin' | 'count' | 'status';
type ChartType = 'bar' | 'line';

export function DocumentAnalysisChart({ documents, documentType, analytics, onYearChange }: DocumentAnalysisChartProps) {
  const { t, language } = useLanguage();
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMeasure, setSelectedMeasure] = useState<MeasureType>('total');
  const [chartType, setChartType] = useState<ChartType>('line');

  // Notify parent when year changes
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    if (onYearChange) {
      onYearChange(year);
    }
  };

  // French number formatter (12.392,34 format)
  const formatFrenchNumber = (value: number, decimals: number = 2): string => {
    const fixed = value.toFixed(decimals);
    const [integer, decimal] = fixed.split('.');
    const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return decimal ? `${formattedInteger},${decimal}` : formattedInteger;
  };

  // Get available years from documents or a default range
  const availableYears = useMemo(() => {
    // If using analytics, show last 5 years from current year
    if (analytics) {
      const currentYear = new Date().getFullYear();
      return Array.from({ length: 5 }, (_, i) => currentYear - i);
    }

    // Otherwise, get years from documents
    const years = new Set<number>();
    documents.forEach(doc => {
      const year = new Date(doc.date).getFullYear();
      if (!isNaN(year)) {
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [documents, analytics]);

  // Calculate status data (for status measure)
  const statusData = useMemo(() => {
    const statusCounts: Record<string, number> = {};

    documents.forEach(doc => {
      const docDate = new Date(doc.date);
      const year = docDate.getFullYear();

      if (year === selectedYear) {
        const status = doc.status || 'draft';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      }
    });

    return statusCounts;
  }, [documents, selectedYear]);

  // Calculate monthly data
  const monthlyData = useMemo(() => {
    // If analytics data is available and showing total/count, use it
    if (analytics && analytics.chartData && (selectedMeasure === 'total' || selectedMeasure === 'count')) {
      return analytics.chartData.map((data: any) => ({
        month: data.month - 1, // Convert from 1-based to 0-based
        value: selectedMeasure === 'count' ? data.count : data.amount,
        count: data.count
      }));
    }

    // Otherwise, calculate from documents (fallback)
    const monthsData = Array(12).fill(0).map((_, index) => ({
      month: index,
      value: 0,
      count: 0
    }));

    documents.forEach(doc => {
      const docDate = new Date(doc.date);
      const year = docDate.getFullYear();
      const month = docDate.getMonth();

      if (year === selectedYear) {
        const monthData = monthsData[month];
        monthData.count++;

        switch (selectedMeasure) {
          case 'subtotal':
            monthData.value += doc.subtotal || 0;
            break;
          case 'total':
            monthData.value += doc.total || 0;
            break;
          case 'margin':
            // Margin = Total - (paid amount for invoices) or Total - Subtotal (tax)
            if (documentType === 'facture') {
              monthData.value += (doc.total - (doc.paidAmount || 0));
            } else {
              monthData.value += doc.tax || 0;
            }
            break;
          case 'count':
            monthData.value = monthData.count;
            break;
        }
      }
    });

    return monthsData;
  }, [documents, selectedYear, selectedMeasure, documentType, analytics]);

  // Chart title based on document type
  const chartTitle = useMemo(() => {
    switch (documentType) {
      case 'facture':
        return t('invoiceAnalysis') || 'Analyse des factures';
      case 'devis':
        return t('quoteAnalysis') || 'Analyse des devis';
      case 'bon_livraison':
        return t('deliveryAnalysis') || 'Analyse des bons de livraison';
      default:
        return 'Analyse';
    }
  }, [documentType, t]);

  // Measure options based on document type
  const measureOptions = useMemo(() => {
    const options: { value: MeasureType; label: string }[] = [
      { value: 'count', label: t('count') || 'Nombre' },
      { value: 'status', label: t('status') || 'Statut' }
    ];

    if (documentType === 'facture') {
      options.push(
        { value: 'subtotal', label: t('amountHT') || 'Total HT' },
        { value: 'total', label: t('amountTTC') || 'Total TTC' },
        { value: 'margin', label: t('remaining') || 'Reste à payer' }
      );
    } else if (documentType === 'devis') {
      options.push(
        { value: 'subtotal', label: t('amountHT') || 'Total HT' },
        { value: 'total', label: t('amountTTC') || 'Total TTC' },
        { value: 'margin', label: t('taxAmount') || 'Montant TVA' }
      );
    } else if (documentType === 'bon_livraison') {
      options.push(
        { value: 'total', label: t('totalValue') || 'Valeur totale' }
      );
    }

    return options;
  }, [documentType, t]);

  const monthNames = [
    t('january') || 'Jan',
    t('february') || 'Fév',
    t('march') || 'Mar',
    t('april') || 'Avr',
    t('may') || 'Mai',
    t('june') || 'Juin',
    t('july') || 'Juil',
    t('august') || 'Août',
    t('september') || 'Sep',
    t('october') || 'Oct',
    t('november') || 'Nov',
    t('december') || 'Déc'
  ];

  // Prepare series and labels based on measure
  const { series, labels } = useMemo(() => {
    if (selectedMeasure === 'status') {
      // For status measure, show status breakdown
      const statuses = Object.keys(statusData);
      const values = Object.values(statusData);
      const statusLabels = statuses.map(s => {
        // Translate status labels
        const statusTranslations: Record<string, string> = {
          draft: t('draft') || 'Brouillon',
          unpaid: t('unpaid') || 'Impayé',
          partial: t('partial') || 'Partiel',
          paid: t('paid') || 'Payé',
          open: t('open') || 'Ouvert',
          signed: t('signed') || 'Signé',
          closed: t('closed') || 'Fermé',
          delivered: t('delivered') || 'Livré',
          invoiced: t('invoiced') || 'Facturé',
          validated: t('validated') || 'Validé',
          in_progress: t('inProgress') || 'En cours',
          cancelled: t('cancelled') || 'Annulé'
        };
        return statusTranslations[s] || s;
      });

      return {
        series: [{
          name: t('status') || 'Statut',
          data: values
        }],
        labels: statusLabels
      };
    } else {
      // For other measures, show monthly data
      return {
        series: [{
          name: measureOptions.find(m => m.value === selectedMeasure)?.label || '',
          data: monthlyData.map((m: any) => m.value)
        }],
        labels: monthNames
      };
    }
  }, [selectedMeasure, monthlyData, statusData, monthNames, measureOptions, t]);

  const chartOptions: ApexOptions = {
    chart: {
      type: chartType,
      height: 350,
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false
        }
      },
      fontFamily: 'inherit',
      animations: {
        enabled: true,
        speed: 800
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: chartType === 'line' || chartType === 'bar' ? 'smooth' : 'straight',
      width: chartType === 'line' ? 3 : chartType === 'bar' ? 0 : 1
    },
    colors: ['#235ae4'],
    fill: {
      type: chartType === 'line' ? 'gradient' : 'solid',
      ...(chartType === 'line' && {
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0.05,
          stops: [0, 90, 100]
        }
      })
    },
    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: '60%'
      }
    },
    legend: {
      show: false
    },
    xaxis: {
      categories: labels,
      labels: {
        style: {
          colors: '#64748b',
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#64748b',
          fontSize: '12px'
        },
        formatter: (value) => {
          if (selectedMeasure === 'count' || selectedMeasure === 'status') {
            return value.toFixed(0);
          }
          return formatFrenchNumber(value, 0);
        }
      },
      title: {
        text: (selectedMeasure === 'count' || selectedMeasure === 'status') ? t('count') || 'Nombre' : language === 'ar' ? 'د.م' : 'DH',
        style: {
          color: '#64748b',
          fontSize: '12px',
          fontWeight: 600
        }
      }
    },
    tooltip: {
      theme: 'light',
      y: {
        formatter: (value) => {
          if (selectedMeasure === 'count' || selectedMeasure === 'status') {
            return `${value} ${documentType === 'facture' ? t('invoices') || 'factures' : documentType === 'devis' ? t('quotes') || 'devis' : t('deliveries') || 'bons'}`;
          }
          return `${formatFrenchNumber(value, 2)} ${language === 'ar' ? 'د.م' : 'DH'}`;
        }
      },
      x: {
        show: true
      }
    },
    grid: {
      borderColor: '#e2e8f0',
      strokeDashArray: 4,
      xaxis: {
        lines: {
          show: false
        }
      }
    },
    markers: {
      size: 4,
      colors: ['#235ae4'],
      strokeColors: '#fff',
      strokeWidth: 2,
      hover: {
        size: 6
      }
    }
  };

  // Calculate total for selected year
  const yearTotal = useMemo(() => {
    if (selectedMeasure === 'status') {
      return Object.values(statusData).reduce((sum: any, count: any) => sum + count, 0);
    }
    return monthlyData.reduce((sum: any, m: any) => sum + m.value, 0);
  }, [selectedMeasure, statusData, monthlyData]);

  if (availableYears.length === 0) {
    return null;
  }

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
      {/* Header with controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', backgroundColor: '#eff3ff', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TrendingUp style={{ width: '1.25rem', height: '1.25rem', color: '#235ae4' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{chartTitle}</h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                {(selectedMeasure === 'count' || selectedMeasure === 'status')
                  ? `${yearTotal} ${t('documents') || 'documents'}`
                  : `${formatFrenchNumber(yearTotal, 2)} ${language === 'ar' ? 'د.م' : 'DH'}`
                }
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
            {/* Chart type buttons */}
            <Button
              onClick={() => setChartType('bar')}
              icon={<BarChart3 style={{ width: '1rem', height: '1rem' }} />}
              title="Bar Chart"
              text={chartType !== 'bar'}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                border: chartType === 'bar' ? '1px solid #93b4f7' : '1px solid #e2e8f0',
                backgroundColor: chartType === 'bar' ? '#eff3ff' : '#f8fafc',
                color: chartType === 'bar' ? '#1a47b8' : '#475569',
                fontSize: '0.75rem',
                fontWeight: 500,
              }}
            />
            <Button
              onClick={() => setChartType('line')}
              icon={<LineChart style={{ width: '1rem', height: '1rem' }} />}
              title="Line Chart"
              text={chartType !== 'line'}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                border: chartType === 'line' ? '1px solid #93b4f7' : '1px solid #e2e8f0',
                backgroundColor: chartType === 'line' ? '#eff3ff' : '#f8fafc',
                color: chartType === 'line' ? '#1a47b8' : '#475569',
                fontSize: '0.75rem',
                fontWeight: 500,
              }}
            />

            {/* Measure selector */}
            <Dropdown
              value={selectedMeasure}
              options={measureOptions}
              onChange={(e) => setSelectedMeasure(e.value as MeasureType)}
              optionLabel="label"
              optionValue="value"
              style={{ fontSize: '0.875rem' }}
            />

            {/* Year selector */}
            <Dropdown
              value={selectedYear}
              options={availableYears.map(y => ({ label: String(y), value: y }))}
              onChange={(e) => handleYearChange(e.value)}
              optionLabel="label"
              optionValue="value"
              style={{ fontSize: '0.875rem' }}
            />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ width: '100%' }}>
        <Chart
          options={chartOptions}
          series={series}
          type={chartType === 'line' ? 'area' : chartType}
          height={350}
        />
      </div>
    </div>
  );
}
