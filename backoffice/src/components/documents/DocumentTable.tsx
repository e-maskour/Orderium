import { useState, useRef, useEffect } from 'react';
import { Search, Edit, Trash2, Download, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CreditCard, CheckCircle, Eye, Columns, FileText } from 'lucide-react';
import { FloatingActionBar } from '../FloatingActionBar';
import { DocumentType } from '../../modules/documents/types';
import { pdfService } from '../../services/pdf.service';
import { PDFPreviewModal } from '../PDFPreviewModal';
import { useLanguage } from '../../context/LanguageContext';

interface Document {
  id: number;
  number: string;
  date: string;
  dueDate?: string;
  validationDate?: string | null;
  partnerName: string;
  subtotal: number;
  tax: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'paid' | 'pending' | 'overdue' | 'draft' | 'partial' | 'unpaid' | 'open' | 'signed' | 'closed' | 'invoiced' | 'validated' | 'in_progress' | 'delivered' | 'cancelled';
  isValidated?: boolean;
  itemsCount?: number;
}

interface DocumentTableProps {
  documentType: DocumentType;
  direction: 'vente' | 'achat';
  documents: Document[];
  partnerLabel: string;
  itemLabel: string;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onDownload?: (id: number) => void;
  onViewPayments?: (id: number) => void;
  onValidate?: (id: number) => void;
  onDevalidate?: (id: number) => void;
  loading?: boolean;
  showPaymentColumns?: boolean;
  showValidationColumn?: boolean;
  onFiltersToggle?: () => void;
  filtersExpanded?: boolean;
  currentPage: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function DocumentTable({ 
  documentType,
  direction,
  documents, 
  partnerLabel,
  itemLabel,
  onEdit, 
  onDelete, 
  onDownload, 
  onViewPayments, 
  onValidate, 
  onDevalidate, 
  loading,
  showPaymentColumns = false,
  showValidationColumn = false,
  onFiltersToggle,
  filtersExpanded = false,
  currentPage,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange
}: DocumentTableProps) {
  const { t, language } = useLanguage();
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'number'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    tax: false,
    paidAmount: false,
    remainingAmount: false
  });
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfTitle, setPdfTitle] = useState('');
  const columnsMenuRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  // Selection functions
  const handleSelectAll = () => {
    if (selectedDocuments.length === documents.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(documents.map(d => d.id));
    }
  };

  const handleSelectDocument = (id: number) => {
    setSelectedDocuments(prev => 
      prev.includes(id) 
        ? prev.filter(dId => dId !== id)
        : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedDocuments([]);
  };

  // Map document type to PDF service type
  const getPDFDocumentType = (docType: DocumentType): 'invoice' | 'quote' | 'delivery-note' => {
    switch (docType) {
      case 'facture':
        return 'invoice';
      case 'devis':
        return 'quote';
      case 'bon_livraison':
        return 'delivery-note';
      default:
        return 'invoice';
    }
  };

  // Close columns menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnsMenuRef.current && !columnsMenuRef.current.contains(event.target as Node)) {
        setShowColumnsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Detect scroll for indicator
  useEffect(() => {
    const handleScroll = () => {
      if (tableScrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = tableScrollRef.current;
        setShowScrollIndicator(scrollLeft < scrollWidth - clientWidth - 10);
      }
    };

    const scrollElement = tableScrollRef.current;
    if (scrollElement) {
      handleScroll(); // Initial check
      scrollElement.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleScroll);
      return () => {
        scrollElement.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [documents, visibleColumns]);

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;

  const getStatusColor = (status: string) => {
    switch (status) {
      // Invoice statuses
      case 'paid':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'partial':
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'overdue':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'unpaid':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      
      // Quote statuses
      case 'open':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'signed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'closed':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'invoiced':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      
      // Bon de livraison statuses
      case 'validated':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'in_progress':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'delivered':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      
      // Common
      case 'draft':
        return 'bg-slate-50 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      // Invoice statuses
      case 'paid':
        return t('paid');
      case 'partial':
        return t('partial');
      case 'pending':
        return t('pending');
      case 'overdue':
        return t('overdue');
      case 'unpaid':
        return t('unpaid');
      
      // Quote statuses
      case 'open':
        return t('open');
      case 'signed':
        return t('signed');
      case 'closed':
        return t('closed');
      case 'invoiced':
        return t('invoiced');
      
      // Bon de livraison statuses
      case 'validated':
        return t('validated');
      case 'in_progress':
        return t('inProgress');
      case 'delivered':
        return t('delivered');
      case 'cancelled':
        return t('cancelled');
      
      // Common
      case 'draft':
        return t('draft');
      default:
        return status;
    }
  };

  // Calculate column count based on features and visible columns
  const columnCount = 5 + 
    (documentType === 'facture' ? 1 : 0) + 
    (showValidationColumn ? 1 : 0) + 
    (visibleColumns.tax ? 1 : 0) + 
    (showPaymentColumns && visibleColumns.paidAmount ? 1 : 0) + 
    (showPaymentColumns && visibleColumns.remainingAmount ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* Column Toggle and Filter Button */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-3">
        <div className="relative" ref={columnsMenuRef}>
          <button
            onClick={() => setShowColumnsMenu(!showColumnsMenu)}
            className="flex items-center justify-center gap-2 px-3 py-2 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium text-slate-700 w-full sm:w-auto"
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('columns')}</span>
            <span className="sm:hidden">{t('showColumns')}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {showColumnsMenu && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-50 py-2">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-700">{t('showHideColumns')}</p>
              </div>
              <div className="py-1">
                <label className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns.tax}
                    onChange={(e) => setVisibleColumns(prev => ({ ...prev, tax: e.target.checked }))}
                    className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-500"
                  />
                  <span className="text-xs text-slate-700">{t('taxAmount')}</span>
                </label>
                {showPaymentColumns && (
                  <>
                    <label className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleColumns.paidAmount}
                        onChange={(e) => setVisibleColumns(prev => ({ ...prev, paidAmount: e.target.checked }))}
                        className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-500"
                      />
                      <span className="text-xs text-slate-700">{t('alreadyPaid')}</span>
                    </label>
                    <label className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleColumns.remainingAmount}
                        onChange={(e) => setVisibleColumns(prev => ({ ...prev, remainingAmount: e.target.checked }))}
                        className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-500"
                      />
                      <span className="text-xs text-slate-700">{t('remainingToPay')}</span>
                    </label>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Filter Button */}
        {onFiltersToggle && (
          <button
            onClick={onFiltersToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              filtersExpanded
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>{t('filters')}</span>
            {filtersExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Separator Line */}
      <div className="border-t border-slate-200"></div>

      {/* Pagination Info Bar - Top */}
      {totalCount > 0 && (
        <div className="bg-slate-50 py-2 px-4 rounded-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-slate-600">
              {t('showing')} <span className="font-semibold">{startIndex + 1}</span> {t('to')}{' '}
              <span className="font-semibold">{Math.min(startIndex + pageSize, totalCount)}</span> {t('of')} <span className="font-semibold">{totalCount}</span> {t('results')}
            </div>
            
            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600">{t('perPage')}</label>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center justify-center px-2 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value, 10);
                    if (!isNaN(page) && page >= 1 && page <= totalPages) {
                      onPageChange(page);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  className="w-12 px-2 py-1 text-sm font-medium text-slate-700 text-center border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <span className="text-sm text-slate-500">/</span>
                <span className="text-sm font-medium text-slate-700">{totalPages}</span>
              </div>
              <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center justify-center px-2 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedCount={selectedDocuments.length}
        onClearSelection={clearSelection}
        onSelectAll={handleSelectAll}
        isAllSelected={selectedDocuments.length === documents.length && documents.length > 0}
        totalCount={documents.length}
        itemLabel={itemLabel}
        actions={(() => {
          // Check if selected documents have mixed validation states
          const selectedDocumentsData = selectedDocuments.map(id => documents.find(d => d.id === id)).filter((d): d is Document => d !== undefined);
          const hasValidated = selectedDocumentsData.some(d => d.isValidated);
          const hasUnvalidated = selectedDocumentsData.some(d => !d.isValidated);
          const hasMixedValidation = hasValidated && hasUnvalidated;
          
          return [
            {
              id: 'view',
              label: t('view'),
              icon: <Eye className="w-4 h-4" />,
              onClick: () => {
                if (selectedDocuments.length === 1) {
                  onEdit?.(selectedDocuments[0]);
                  clearSelection();
                }
              },
              hidden: selectedDocuments.length !== 1
            },
            {
              id: 'validate',
              label: t('validate'),
              icon: <CheckCircle className="w-4 h-4" />,
              onClick: () => {
                selectedDocuments.forEach(id => {
                  const doc = documents.find(d => d.id === id);
                  if (doc && !doc.isValidated) {
                    onValidate?.(id);
                  }
                });
                clearSelection();
              },
              variant: 'primary' as const,
              hidden: hasMixedValidation || (selectedDocuments.length === 1 && hasValidated)
            },
            {
              id: 'devalidate',
              label: t('devalidate'), 
              icon: <Edit className="w-4 h-4" />,
              onClick: () => {
                selectedDocuments.forEach(id => {
                  const doc = documents.find(d => d.id === id);
                  if (doc && doc.isValidated) {
                    onDevalidate?.(id);
                  }
                });
                clearSelection();
              },
              hidden: hasMixedValidation || (selectedDocuments.length === 1 && hasUnvalidated)
            },
            {
              id: 'payments',
              label: t('payments'),
              icon: <CreditCard className="w-4 h-4" />,
              onClick: () => {
                if (selectedDocuments.length === 1) {
                  onViewPayments?.(selectedDocuments[0]);
                  clearSelection();
                }
              },
              hidden: !showPaymentColumns || selectedDocuments.length !== 1 || selectedDocumentsData.every(doc => 
                !doc?.isValidated || doc?.status === 'draft'
              )
            },
            {
              id: 'pdf-preview',
              label: 'Aperçu',
              icon: <FileText className="w-4 h-4" />,
              onClick: () => {
                if (selectedDocuments.length === 1) {
                  const doc = selectedDocumentsData[0];
                  if (doc && doc.isValidated && doc.status !== 'draft') {
                    const url = pdfService.getPDFUrl(getPDFDocumentType(documentType), selectedDocuments[0], 'preview');
                    const label = pdfService.getDocumentLabel(getPDFDocumentType(documentType));
                    setPdfUrl(url);
                    setPdfTitle(`${label} ${doc.number}`);
                    setShowPDFPreview(true);
                  }
                  clearSelection();
                }
              },
              hidden: selectedDocuments.length !== 1 || selectedDocumentsData.every(doc => 
                !doc?.isValidated || doc?.status === 'draft'
              )
            },
            {
              id: 'delete',
              label: t('delete'),
              icon: <Trash2 className="w-4 h-4" />,
              onClick: () => {
                selectedDocuments.forEach(id => onDelete?.(id));
                clearSelection();
              },
              variant: 'danger' as const
            }
          ];
        })()}
      />

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden relative">
        <div 
          ref={tableScrollRef}
          className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100"
          style={{ 
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* Scroll indicator shadow */}
          {showScrollIndicator && (
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-200/50 to-transparent pointer-events-none z-10" />
          )}
          <table className="w-full min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-2 pl-3 pr-2 sticky left-0 z-20 bg-slate-50 whitespace-nowrap w-10">
                  <div
                    onClick={handleSelectAll}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${
                      selectedDocuments.length === documents.length && documents.length > 0
                        ? 'bg-amber-500 border-amber-500 text-white'
                        : 'bg-white border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {selectedDocuments.length === documents.length && documents.length > 0 && (
                      <CheckCircle className="w-3.5 h-3.5" />
                    )}
                  </div>
                </th>
                <th className={`${language === 'ar' ? 'text-right' : 'text-left'} py-2 px-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider sticky left-10 z-20 bg-slate-50 shadow-[2px_0_4px_rgba(0,0,0,0.05)] whitespace-nowrap`}>
                  {t('number')}
                </th>
                <th className={`${language === 'ar' ? 'text-right' : 'text-left'} py-2 px-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap`}>
                  {partnerLabel}
                </th>
                <th className={`${language === 'ar' ? 'text-right' : 'text-left'} py-2 px-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap`}>
                  {documentType === 'facture' ? t('invoiceDate') : documentType === 'devis' ? t('quoteDate') : t('deliveryDate')}
                </th>
                {documentType === 'facture' && (
                  <th className={`${language === 'ar' ? 'text-right' : 'text-left'} py-2 px-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap`}>
                    {t('dueDate')}
                  </th>
                )}
                {showValidationColumn && (
                  <th className={`${language === 'ar' ? 'text-right' : 'text-left'} py-2 px-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap`}>
                    {t('validationDate')}
                  </th>
                )}
                <th className={`${language === 'ar' ? 'text-left' : 'text-right'} py-2 px-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap`}>
                  {t('amountHT')}
                </th>
                {visibleColumns.tax && (
                  <th className={`${language === 'ar' ? 'text-left' : 'text-right'} py-2 px-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap`}>
                    {t('taxAmount')}
                  </th>
                )}
                <th className={`${language === 'ar' ? 'text-left' : 'text-right'} py-2 px-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap`}>
                  {t('amountTTC')}
                </th>
                {showPaymentColumns && visibleColumns.paidAmount && (
                  <th className={`${language === 'ar' ? 'text-left' : 'text-right'} py-2 px-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap`}>
                    {t('alreadyPaid')}
                  </th>
                )}
                {showPaymentColumns && visibleColumns.remainingAmount && (
                  <th className={`${language === 'ar' ? 'text-left' : 'text-right'} py-2 px-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap`}>
                    {t('remainingToPay')}
                  </th>
                )}
                <th className="text-center py-2 px-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  {t('status')}
                </th>
              </tr>
            </thead>
            <tbody className="">
              {loading ? (
                <tr>
                  <td colSpan={columnCount} className="py-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
                      <p className="text-xs text-slate-500">{t('loading')}</p>
                    </div>
                  </td>
                </tr>
              ) : documents.length > 0 ? (
                documents.map((doc) => (
                  <tr 
                      key={doc.id} 
                      className={`transition-all duration-200 cursor-pointer border-l-4 border-b border-slate-200 group ${
                        selectedDocuments.includes(doc.id) 
                          ? 'bg-amber-50 border-l-amber-500 shadow-md !bg-amber-50' 
                          : 'hover:bg-slate-50 border-l-transparent'
                      }`}
                      style={selectedDocuments.includes(doc.id) ? { backgroundColor: 'rgb(255 251 235)' } : {}}
                      onClick={() => handleSelectDocument(doc.id)}
                    >
                      <td className={`py-2 pl-3 pr-2 sticky left-0 z-10 whitespace-nowrap w-10 ${
                        selectedDocuments.includes(doc.id) ? 'bg-amber-50' : 'bg-white group-hover:bg-slate-50'
                      }`}>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectDocument(doc.id);
                          }}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${
                            selectedDocuments.includes(doc.id)
                              ? 'bg-amber-500 border-amber-500 text-white'
                              : 'bg-white border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          {selectedDocuments.includes(doc.id) && (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </td>
                      <td className={`py-2 px-3 sticky left-10 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.05)] whitespace-nowrap ${
                        selectedDocuments.includes(doc.id) ? 'bg-amber-50' : 'bg-white group-hover:bg-slate-50'
                      }`}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit?.(doc.id);
                          }}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                        >
                          {doc.number}
                        </button>
                      </td>
                      <td className={`py-2 px-3 whitespace-nowrap ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                        <span className="text-xs font-medium text-slate-800">{doc.partnerName}</span>
                      </td>
                      <td className={`py-2 px-3 whitespace-nowrap ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                        <span className="text-xs text-slate-600">
                          {new Date(doc.date).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </td>
                      {documentType === 'facture' && (
                        <td className={`py-2 px-3 whitespace-nowrap ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                          <span className="text-xs text-slate-600">
                            {doc.dueDate ? new Date(doc.dueDate).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            }) : '-'}
                          </span>
                        </td>
                      )}
                      {showValidationColumn && (
                        <td className={`py-2 px-3 whitespace-nowrap ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                          <span className="text-xs text-slate-600">
                            {doc.validationDate ? new Date(doc.validationDate).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            }) : '-'}
                          </span>
                        </td>
                      )}
                      <td className={`py-2 px-3 ${language === 'ar' ? 'text-left' : 'text-right'} whitespace-nowrap`}>
                        <span className="text-xs font-medium text-slate-700">
                          {doc.subtotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
                        </span>
                      </td>
                      {visibleColumns.tax && (
                        <td className={`py-2 px-3 ${language === 'ar' ? 'text-left' : 'text-right'} whitespace-nowrap`}>
                          <span className="text-xs font-medium text-slate-700">
                            {doc.tax.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
                          </span>
                        </td>
                      )}
                      <td className={`py-2 px-3 ${language === 'ar' ? 'text-left' : 'text-right'} whitespace-nowrap`}>
                        <span className="text-xs font-bold text-slate-900">
                          {doc.total.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
                        </span>
                      </td>
                      {showPaymentColumns && visibleColumns.paidAmount && (
                        <td className={`py-2 px-3 ${language === 'ar' ? 'text-left' : 'text-right'} whitespace-nowrap`}>
                          <span className="text-xs font-medium text-green-700">
                            {doc.paidAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
                          </span>
                        </td>
                      )}
                      {showPaymentColumns && visibleColumns.remainingAmount && (
                        <td className={`py-2 px-3 ${language === 'ar' ? 'text-left' : 'text-right'} whitespace-nowrap`}>
                          <span className={`text-xs font-medium ${doc.remainingAmount > 0 ? 'text-red-700' : 'text-slate-500'}`}>
                              {doc.remainingAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
                          </span>
                        </td>
                      )}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="flex justify-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusColor(doc.status)}`}>
                            {getStatusLabel(doc.status)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                <tr>
                  <td colSpan={columnCount} className="py-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Filter className="w-10 h-10 text-slate-300" />
                      <p className="text-xs text-slate-500">{t('noDocumentFound')}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={showPDFPreview}
        onClose={() => setShowPDFPreview(false)}
        pdfUrl={pdfUrl}
        title={pdfTitle}
      />
    </div>
  );
}
