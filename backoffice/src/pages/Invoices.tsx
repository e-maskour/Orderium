import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceService, customerService } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  DollarSign,
  Grid3x3, 
  List,
  Filter,
  X,
  Calendar,
  Send,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '../components/AdminLayout';
import { DateRangePicker } from '../components/ui/date-range-picker';
import { FloatingActionBar, FloatingAction } from '../components/FloatingActionBar';
import { InvoiceCard } from '../components/InvoiceCard';
import { InvoiceTable } from '../components/InvoiceTable';
import { InvoiceViewModal } from '../components/InvoiceViewModal';
import { PaymentModal } from '../components/PaymentModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { InvoiceWithDetails, InvoiceFilters } from '../types';

export default function Invoices() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  
  const navigate = useNavigate();
  // State management
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<{
    status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
    paymentStatus?: 'unpaid' | 'partial' | 'paid';
    customerId?: number;
    dateRange?: 'today' | 'yesterday' | 'week' | 'month' | 'year';
  }>({});
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  
  // Modal states
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<number | null>(null);
  
  // Date filter states
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start: startOfMonth, end: endOfMonth };
  });

  // Get date range based on active filter
  const getDateRange = useMemo(() => {
    if (!activeFilters.dateRange) return { start: undefined, end: undefined };
    
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (activeFilters.dateRange) {
      case 'today':
        return { start: startOfDay, end: endOfDay };
      
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const startYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
        const endYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
        return { start: startYesterday, end: endYesterday };
      
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return { start: startOfWeek, end: endOfWeek };
      
      case 'month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start: startOfMonth, end: endOfMonth };
      
      case 'year':
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        return { start: startOfYear, end: endOfYear };
      
      default:
        return { start: undefined, end: undefined };
    }
  }, [activeFilters.dateRange]);

  // Build filters object
  const filters: InvoiceFilters = useMemo(() => {
    const result: InvoiceFilters = {};
    
    if (searchQuery) result.search = searchQuery;
    if (activeFilters.status) result.status = activeFilters.status;
    if (activeFilters.paymentStatus) result.paymentStatus = activeFilters.paymentStatus;
    if (activeFilters.customerId) result.customerId = activeFilters.customerId;
    if (getDateRange.start) result.dateFrom = getDateRange.start.toISOString();
    if (getDateRange.end) result.dateTo = getDateRange.end.toISOString();
    
    return result;
  }, [searchQuery, activeFilters, getDateRange]);

  // Queries
  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => invoiceService.getAll(filters),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: stats } = useQuery({
    queryKey: ['invoice-stats', filters],
    queryFn: () => invoiceService.getStatistics(filters),
    refetchInterval: 30000,
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      try {
        const result = await customerService.getAll();
        return result.customers || [];
      } catch (error) {
        console.error('Failed to fetch customers:', error);
        return [];
      }
    },
  });

  const customers = Array.isArray(customersData) ? customersData : [];

  // Get selected invoice details
  const selectedInvoice = useMemo(() => {
    if (!selectedInvoiceId) return null;
    return invoices.find(inv => inv.invoice.id === selectedInvoiceId) || null;
  }, [selectedInvoiceId, invoices]);

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: number) => invoiceService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-stats'] });
      toast.success(t('invoice.deleteSuccess'));
      setSelectedInvoices([]);
      setDeleteInvoiceId(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('invoice.deleteError'));
      setDeleteInvoiceId(null);
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: ({ id, amount }: { id: number; amount: number }) =>
      invoiceService.recordPayment(id, { Amount: amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-stats'] });
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setSelectedInvoiceId(null);
      toast.success(t('invoice.paymentRecorded'));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('invoice.paymentError'));
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      invoiceService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-stats'] });
      toast.success(t('invoice.statusUpdated'));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('invoice.statusError'));
    },
  });

  // Event handlers
  const handleSearch = () => {
    setSearchQuery(searchInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleViewInvoice = (invoice: InvoiceWithDetails) => {
    setSelectedInvoiceId(invoice.invoice.id);
    setIsViewModalOpen(true);
  };

  const handleRecordPayment = (invoice: InvoiceWithDetails) => {
    setSelectedInvoiceId(invoice.invoice.id);
    setPaymentAmount('');
    setIsPaymentModalOpen(true);
  };

  const handleSubmitPayment = () => {
    if (!selectedInvoice || !paymentAmount) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t('invoice.invalidAmount'));
      return;
    }
    
    const remainingAmount = selectedInvoice.invoice.Total - selectedInvoice.invoice.PaidAmount;
    if (amount > remainingAmount) {
      toast.error(t('invoice.paymentExceedsRemaining'));
      return;
    }
    
    recordPaymentMutation.mutate({ id: selectedInvoice.invoice.id, amount });
  };

  const handleStatusChange = (invoiceId: number, status: string) => {
    updateStatusMutation.mutate({ id: invoiceId, status });
  };

  const handleBulkDelete = () => {
    if (selectedInvoices.length === 0) return;
    
    selectedInvoices.forEach(id => deleteMutation.mutate(id));
  };

  const toggleSelectInvoice = (invoiceId: number) => {
    setSelectedInvoices(prev => 
      prev.includes(invoiceId) 
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const toggleSelectAll = () => {
    setSelectedInvoices(prev => 
      prev.length === invoices.length ? [] : invoices.map(inv => inv.invoice.id)
    );
  };

  const clearSelection = () => {
    setSelectedInvoices([]);
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setActiveFilters({});
  };

  const removeFilter = (filterKey: keyof typeof activeFilters) => {
    setActiveFilters(prev => {
      const updated = { ...prev };
      delete updated[filterKey];
      return updated;
    });
  };

  const addFilter = (filterKey: keyof typeof activeFilters, value: any) => {
    setActiveFilters(prev => ({ ...prev, [filterKey]: value }));
    setShowFilterDropdown(false);
  };

  const getFilterLabel = (key: keyof typeof activeFilters, value: any): string => {
    switch (key) {
      case 'status':
        return `${t('invoice.status')}: ${t(`invoice.status.${value}`)}`;
      case 'paymentStatus':
        return `${t('invoice.payment')}: ${t(`invoice.paymentStatus.${value}`)}`;
      case 'customerId':
        const customer = customers.find(c => c.id === value);
        return `${t('customer')}: ${customer?.name || value}`;
      case 'dateRange':
        const labels: Record<string, string> = {
          today: t('today'),
          yesterday: t('yesterday'),
          week: t('thisWeek'),
          month: t('thisMonth'),
          year: t('thisYear')
        };
        return `${t('date')}: ${labels[value] || value}`;
      default:
        return '';
    }
  };

  // Helper functions
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { bg: 'bg-slate-100', text: 'text-slate-700', icon: Edit },
      sent: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Send },
      paid: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
      overdue: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
      cancelled: { bg: 'bg-slate-200', text: 'text-slate-600', icon: XCircle },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {t(`invoice.status.${status}` as any)}
      </span>
    );
  };

  const getPaymentBadge = (paymentStatus: string) => {
    const paymentConfig = {
      unpaid: { bg: 'bg-red-100', text: 'text-red-700' },
      partial: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      paid: { bg: 'bg-green-100', text: 'text-green-700' },
    };
    
    const config = paymentConfig[paymentStatus as keyof typeof paymentConfig] || paymentConfig.unpaid;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {t(`invoice.paymentStatus.${paymentStatus}` as any)}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isOverdue = (invoice: InvoiceWithDetails) => {
    if (invoice.invoice.paymentStatus === 'paid') return false;
    return new Date(invoice.invoice.DueDate) < new Date();
  };

  // Floating actions
  const floatingActions: FloatingAction[] = [
    {
      id: 'view',
      label: t('invoice.viewSelected'),
      icon: <Eye className="w-4 h-4" />,
      onClick: () => {
        if (selectedInvoices.length === 1) {
          const invoice = invoices.find(inv => inv.invoice.id === selectedInvoices[0]);
          if (invoice) handleViewInvoice(invoice);
        }
      },
      variant: 'primary',
      disabled: selectedInvoices.length !== 1,
    },
    {
      id: 'record-payment',
      label: t('invoice.recordPayment'),
      icon: <DollarSign className="w-4 h-4" />,
      onClick: () => {
        if (selectedInvoices.length === 1) {
          const invoice = invoices.find(inv => inv.invoice.id === selectedInvoices[0]);
          if (invoice) handleRecordPayment(invoice);
        }
      },
      variant: 'success',
      disabled: selectedInvoices.length !== 1 || (selectedInvoices.length === 1 && invoices.find(inv => inv.invoice.id === selectedInvoices[0])?.invoice.paymentStatus === 'paid'),
    },
    {
      id: 'mark-sent',
      label: t('invoice.markAsSent'),
      icon: <Send className="w-4 h-4" />,
      onClick: () => {
        selectedInvoices.forEach(id => {
          const invoice = invoices.find(inv => inv.invoice.id === id);
          if (invoice?.invoice.status === 'draft') {
            handleStatusChange(id, 'sent');
          }
        });
      },
      variant: 'secondary',
      disabled: selectedInvoices.length === 0 || selectedInvoices.every(id => {
        const invoice = invoices.find(inv => inv.invoice.id === id);
        return invoice?.invoice.status !== 'draft';
      }),
    },
    {
      id: 'mark-paid',
      label: t('invoice.markAsPaid'),
      icon: <CheckCircle2 className="w-4 h-4" />,
      onClick: () => {
        selectedInvoices.forEach(id => {
          const invoice = invoices.find(inv => inv.invoice.id === id);
          if (invoice?.invoice.paymentStatus === 'paid' && invoice?.invoice.status !== 'paid') {
            handleStatusChange(id, 'paid');
          }
        });
      },
      variant: 'success',
      disabled: selectedInvoices.length === 0 || selectedInvoices.every(id => {
        const invoice = invoices.find(inv => inv.invoice.id === id);
        return invoice?.invoice.status === 'paid' || invoice?.invoice.paymentStatus !== 'paid';
      }),
    },
    {
      id: 'delete',
      label: t('invoice.deleteSelected'),
      icon: <Trash2 className="w-4 h-4" />,
      onClick: handleBulkDelete,
      variant: 'danger',
    },
    {
      id: 'clear-selection',
      label: t('invoice.clearSelection'),
      icon: <X className="w-4 h-4" />,
      onClick: clearSelection,
      variant: 'secondary',
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              {t('invoice.title')}
            </h1>
            <p className="text-sm text-slate-500 mt-1">{t('invoice.subtitle')}</p>
          </div>
          <button
            onClick={() => navigate('/invoices/create')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('invoice.create')}
          </button>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('invoice.stats.total')}</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalInvoices}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('invoice.stats.totalAmount')}</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalAmount)}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('invoice.stats.paid')}</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.paidAmount)}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('invoice.stats.unpaid')}</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats.unpaidAmount)}</p>
                </div>
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('invoice.stats.overdue')}</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.overdueAmount)}</p>
                </div>
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters Bar - Odoo Style */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder={t('invoice.searchPlaceholder')}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>
              
              {/* Filter Dropdown Button */}
              <div className="relative">
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-medium text-slate-700"
                >
                  <Filter className="w-4 h-4" />
                  {t('invoice.filters')}
                  {Object.keys(activeFilters).length > 0 && (
                    <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full min-w-[20px] text-center">
                      {Object.keys(activeFilters).length}
                    </span>
                  )}
                </button>

                {/* Filter Dropdown */}
                {showFilterDropdown && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
                    <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                      {/* Status Filter */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-2">
                          {t('invoice.status')}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {(['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const).map((status) => (
                            <button
                              key={status}
                              onClick={() => addFilter('status', status)}
                              className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                                activeFilters.status === status
                                  ? 'bg-blue-50 border-blue-600 text-blue-700'
                                  : 'border-slate-300 hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              {t(`invoice.status.${status}`)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Payment Status Filter */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-2">
                          {t('invoice.payment')}
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['unpaid', 'partial', 'paid'] as const).map((payment) => (
                            <button
                              key={payment}
                              onClick={() => addFilter('paymentStatus', payment)}
                              className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                                activeFilters.paymentStatus === payment
                                  ? 'bg-blue-50 border-blue-600 text-blue-700'
                                  : 'border-slate-300 hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              {t(`invoice.paymentStatus.${payment}`)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Date Range Filter */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-2">
                          {t('date')}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {(['today', 'yesterday', 'week', 'month', 'year'] as const).map((range) => (
                            <button
                              key={range}
                              onClick={() => addFilter('dateRange', range)}
                              className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                                activeFilters.dateRange === range
                                  ? 'bg-blue-50 border-blue-600 text-blue-700'
                                  : 'border-slate-300 hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              {t(range)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Customer Filter */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-2">
                          {t('customer')}
                        </label>
                        <select
                          value={activeFilters.customerId || ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              addFilter('customerId', parseInt(e.target.value));
                            } else {
                              removeFilter('customerId');
                            }
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="">{t('all')}</option>
                          {customers.map((customer) => (
                            <option key={customer.id} value={customer.id}>
                              {customer.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 border border-slate-300 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'card'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Active Filters Chips */}
          {Object.keys(activeFilters).length > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-xs font-medium text-slate-600">{t('activeFilters')}:</span>
              {Object.entries(activeFilters).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-cente2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4lue-700 rounded-full text-xs font-medium border border-blue-200"
                >
                  <span>{getFilterLabel(key as keyof typeof activeFilters, value)}</span>
                  <button
                    onClick={() => removeFilter(key as keyof typeof activeFilters)}
                    className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={clearFilters}
                className="text-xs text-slate-600 hover:text-slate-900 underline"
              >
                {t('clearAll')}
              </button>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : t('error')}
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && invoices.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">{t('invoice.noInvoices')}</h3>
            <p className="text-slate-500 mb-6">
              {searchQuery || Object.keys(activeFilters).length > 0
                ? t('invoice.noMatchingInvoices')
                : t('invoice.getStarted')
              }
            </p>
            <button
              onClick={() => navigate('/invoices/create')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              {t('invoice.create')}
            </button>
          </div>
        )}

        {/* Invoice Grid/List */}
        {!isLoading && !error && invoices.length > 0 && (
          <>
            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {invoices.map((invoice) => (
                  <InvoiceCard
                    key={invoice.invoice.id}
                    invoice={invoice}
                    isSelected={selectedInvoices.includes(invoice.invoice.id)}
                    onToggleSelect={() => toggleSelectInvoice(invoice.invoice.id)}
                    onView={() => handleViewInvoice(invoice)}
                    onRecordPayment={() => handleRecordPayment(invoice)}
                    onDelete={() => setDeleteInvoiceId(invoice.invoice.id)}
                    onStatusChange={(status) => handleStatusChange(invoice.invoice.id, status)}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                    getStatusBadge={getStatusBadge}
                    getPaymentBadge={getPaymentBadge}
                    isOverdue={isOverdue(invoice)}
                    t={t as (key: string) => string}
                  />
                ))}
              </div>
            ) : (
              <InvoiceTable
                invoices={invoices}
                selectedInvoices={selectedInvoices}
                onToggleSelect={toggleSelectInvoice}
                onToggleSelectAll={toggleSelectAll}
                onView={handleViewInvoice}
                onRecordPayment={handleRecordPayment}
                onDelete={setDeleteInvoiceId}
                onStatusChange={handleStatusChange}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                getStatusBadge={getStatusBadge}
                getPaymentBadge={getPaymentBadge}
                isOverdue={isOverdue}
                t={t as (key: string) => string}
              />
            )}
          </>
        )}

        {/* Floating Action Bar */}
        {selectedInvoices.length > 0 && (
          <FloatingActionBar
            selectedCount={selectedInvoices.length}
            actions={floatingActions}
            onClearSelection={clearSelection}
            isAllSelected={selectedInvoices.length === invoices.length}
            onSelectAll={toggleSelectAll}
            totalCount={invoices.length}
          />
        )}

        {/* View Invoice Modal */}
        {isViewModalOpen && selectedInvoice && (
          <InvoiceViewModal
            invoice={selectedInvoice}
            onClose={() => {
              setIsViewModalOpen(false);
              setSelectedInvoiceId(null);
            }}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getStatusBadge={getStatusBadge}
            getPaymentBadge={getPaymentBadge}
            t={t as (key: string) => string}
          />
        )}

        {/* Record Payment Modal */}
        {isPaymentModalOpen && selectedInvoice && (
          <PaymentModal
            invoice={selectedInvoice}
            amount={paymentAmount}
            onAmountChange={setPaymentAmount}
            onSubmit={handleSubmitPayment}
            onClose={() => {
              setIsPaymentModalOpen(false);
              setSelectedInvoiceId(null);
              setPaymentAmount('');
            }}
            isSubmitting={recordPaymentMutation.isPending}
            formatCurrency={formatCurrency}
            t={t as (key: string) => string}
          />
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={deleteInvoiceId !== null} onOpenChange={() => setDeleteInvoiceId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('invoice.deleteConfirm')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('invoice.deleteConfirmMessage')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteInvoiceId(null)}>
                {t('cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteInvoiceId && deleteMutation.mutate(deleteInvoiceId)}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? t('deleting') : t('delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
