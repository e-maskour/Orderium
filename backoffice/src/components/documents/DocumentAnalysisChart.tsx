import { useState, useMemo } from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { DocumentType } from '../../modules/documents/types';
import { DocumentItem } from '../../modules/documents/services/documents.service';
import { useLanguage } from '../../context/LanguageContext';
import { TrendingUp, Calendar, BarChart3, LineChart } from 'lucide-react';

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
    colors: ['#f59e0b'],
    fill: {
      type: chartType === 'line' ? 'gradient' : 'solid',
      ...(chartType === 'line' && {
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.2,
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
      colors: ['#f59e0b'],
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
    <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 border border-slate-200">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800">{chartTitle}</h3>
            <p className="text-xs text-slate-500">
              {(selectedMeasure === 'count' || selectedMeasure === 'status') 
                ? `${yearTotal} ${t('documents') || 'documents'}`
                : `${formatFrenchNumber(yearTotal, 2)} ${language === 'ar' ? 'د.م' : 'DH'}`
              }
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Chart type buttons */}
          <button
            onClick={() => setChartType('bar')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
              chartType === 'bar'
                ? 'bg-amber-100 text-amber-700 border border-amber-300'
                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
            title="Bar Chart"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">Bar</span>
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
              chartType === 'line'
                ? 'bg-amber-100 text-amber-700 border border-amber-300'
                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
            title="Line Chart"
          >
            <LineChart className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">Line</span>
          </button>

          {/* Measure selector */}
          <select
            value={selectedMeasure}
            onChange={(e) => setSelectedMeasure(e.target.value as MeasureType)}
            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
          >
            {measureOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Year selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg bg-white">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="text-xs font-medium text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full">
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
