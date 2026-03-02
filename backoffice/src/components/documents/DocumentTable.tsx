import { useState, useRef, useEffect } from 'react';
import { Search, Edit, Trash2, Download, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CreditCard, CheckCircle, Eye, Columns, FileText } from 'lucide-react';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
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

  const getStatusStyle = (status: string): React.CSSProperties => {
    switch (status) {
      case 'paid':
        return { backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' };
      case 'partial':
      case 'pending':
        return { backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' };
      case 'overdue':
        return { backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' };
      case 'unpaid':
        return { backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' };
      case 'open':
        return { backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' };
      case 'signed':
        return { backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' };
      case 'closed':
        return { backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' };
      case 'invoiced':
        return { backgroundColor: '#faf5ff', color: '#7e22ce', border: '1px solid #e9d5ff' };
      case 'validated':
        return { backgroundColor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' };
      case 'in_progress':
        return { backgroundColor: '#ecfeff', color: '#0e7490', border: '1px solid #a5f3fc' };
      case 'delivered':
        return { backgroundColor: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4' };
      case 'cancelled':
        return { backgroundColor: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' };
      case 'draft':
      default:
        return { backgroundColor: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0' };
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Column Toggle and Filter Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }} ref={columnsMenuRef}>
          <button
            onClick={() => setShowColumnsMenu(!showColumnsMenu)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: '#ffffff', fontWeight: 500, color: '#334155', cursor: 'pointer' }}
          >
            <Columns style={{ width: '0.875rem', height: '0.875rem' }} />
            {t('columns')}
            <ChevronDown style={{ width: '0.75rem', height: '0.75rem' }} />
          </button>
          {showColumnsMenu && (
            <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: '0.25rem', width: '14rem', backgroundColor: '#ffffff', borderRadius: '0.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0', zIndex: 50, padding: '0.5rem 0' }}>
              <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>{t('showHideColumns')}</p>
              </div>
              <div style={{ padding: '0.25rem 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={visibleColumns.tax}
                    onChange={(e) => setVisibleColumns(prev => ({ ...prev, tax: e.target.checked }))}
                    style={{ width: '1rem', height: '1rem', accentColor: '#f59e0b' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#334155' }}>{t('taxAmount')}</span>
                </label>
                {showPaymentColumns && (
                  <>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={visibleColumns.paidAmount}
                        onChange={(e) => setVisibleColumns(prev => ({ ...prev, paidAmount: e.target.checked }))}
                        style={{ width: '1rem', height: '1rem', accentColor: '#f59e0b' }}
                      />
                      <span style={{ fontSize: '0.75rem', color: '#334155' }}>{t('alreadyPaid')}</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={visibleColumns.remainingAmount}
                        onChange={(e) => setVisibleColumns(prev => ({ ...prev, remainingAmount: e.target.checked }))}
                        style={{ width: '1rem', height: '1rem', accentColor: '#f59e0b' }}
                      />
                      <span style={{ fontSize: '0.75rem', color: '#334155' }}>{t('remainingToPay')}</span>
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
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 500, fontSize: '0.875rem', cursor: 'pointer', border: filtersExpanded ? 'none' : '1px solid #cbd5e1',
              backgroundColor: filtersExpanded ? '#f59e0b' : '#ffffff',
              color: filtersExpanded ? '#ffffff' : '#334155',
              boxShadow: filtersExpanded ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <Filter style={{ width: '1rem', height: '1rem' }} />
            <span>{t('filters')}</span>
            {filtersExpanded ? (
              <ChevronUp style={{ width: '1rem', height: '1rem' }} />
            ) : (
              <ChevronDown style={{ width: '1rem', height: '1rem' }} />
            )}
          </button>
        )}
      </div>

      {/* Separator Line */}
      <div style={{ borderTop: '1px solid #e2e8f0' }}></div>

      {/* Pagination Info Bar - Top */}
      {totalCount > 0 && (
        <div style={{ backgroundColor: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#475569' }}>
              {t('showing')} <span style={{ fontWeight: 600 }}>{startIndex + 1}</span> {t('to')}{' '}
              <span style={{ fontWeight: 600 }}>{Math.min(startIndex + pageSize, totalCount)}</span> {t('of')} <span style={{ fontWeight: 600 }}>{totalCount}</span> {t('results')}
            </div>

            {/* Page Size Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569' }}>{t('perPage')}</span>
              <Dropdown
                value={pageSize}
                options={[
                  { label: '10', value: 10 },
                  { label: '25', value: 25 },
                  { label: '50', value: 50 },
                  { label: '100', value: 100 },
                ]}
                onChange={(e) => onPageSizeChange(e.value)}
                optionLabel="label"
                optionValue="value"
                style={{ fontSize: '0.75rem' }}
              />
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.375rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#334155', background: '#ffffff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                <ChevronLeft style={{ width: '1rem', height: '1rem' }} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <InputText
                  type="number"
                  min={1}
                  max={totalPages}
                  value={String(currentPage)}
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
                  style={{ width: '3rem', textAlign: 'center', fontSize: '0.875rem' }}
                  aria-label="Page number"
                />
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>/</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>{totalPages}</span>
              </div>
              <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.375rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#334155', background: '#ffffff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
              >
                <ChevronRight style={{ width: '1rem', height: '1rem' }} />
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
              icon: <Eye style={{ width: '1rem', height: '1rem' }} />,
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
              icon: <CheckCircle style={{ width: '1rem', height: '1rem' }} />,
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
              icon: <Edit style={{ width: '1rem', height: '1rem' }} />,
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
              icon: <CreditCard style={{ width: '1rem', height: '1rem' }} />,
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
              icon: <FileText style={{ width: '1rem', height: '1rem' }} />,
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
              icon: <Trash2 style={{ width: '1rem', height: '1rem' }} />,
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
      <div style={{ backgroundColor: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden', position: 'relative' }}>
        <div
          ref={tableScrollRef}
          style={{
            overflowX: 'auto',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* Scroll indicator shadow */}
          {showScrollIndicator && (
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '2rem', background: 'linear-gradient(to left, rgba(226,232,240,0.5), transparent)', pointerEvents: 'none', zIndex: 10 }} />
          )}
          <table style={{ width: '100%', minWidth: '800px' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '0.5rem 0.5rem 0.5rem 0.75rem', position: 'sticky', left: 0, zIndex: 20, backgroundColor: '#f8fafc', whiteSpace: 'nowrap', width: '2.5rem' }}>
                  <div
                    onClick={handleSelectAll}
                    style={{
                      width: '1.25rem', height: '1.25rem', borderRadius: '0.375rem', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      backgroundColor: selectedDocuments.length === documents.length && documents.length > 0 ? '#f59e0b' : '#ffffff',
                      borderColor: selectedDocuments.length === documents.length && documents.length > 0 ? '#f59e0b' : '#cbd5e1',
                      color: selectedDocuments.length === documents.length && documents.length > 0 ? '#ffffff' : 'transparent'
                    }}
                  >
                    {selectedDocuments.length === documents.length && documents.length > 0 && (
                      <CheckCircle style={{ width: '0.875rem', height: '0.875rem' }} />
                    )}
                  </div>
                </th>
                <th style={{ textAlign: language === 'ar' ? 'right' : 'left', padding: '0.5rem 0.75rem', fontSize: '10px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', position: 'sticky', left: '2.5rem', zIndex: 20, backgroundColor: '#f8fafc', boxShadow: '2px 0 4px rgba(0,0,0,0.05)', whiteSpace: 'nowrap' }}>
                  {t('number')}
                </th>
                <th style={{ textAlign: language === 'ar' ? 'right' : 'left', padding: '0.5rem 0.75rem', fontSize: '10px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                  {partnerLabel}
                </th>
                <th style={{ textAlign: language === 'ar' ? 'right' : 'left', padding: '0.5rem 0.75rem', fontSize: '10px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                  {documentType === 'facture' ? t('invoiceDate') : documentType === 'devis' ? t('quoteDate') : t('deliveryDate')}
                </th>
                {documentType === 'facture' && (
                  <th style={{ textAlign: language === 'ar' ? 'right' : 'left', padding: '0.5rem 0.75rem', fontSize: '10px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    {t('dueDate')}
                  </th>
                )}
                {showValidationColumn && (
                  <th style={{ textAlign: language === 'ar' ? 'right' : 'left', padding: '0.5rem 0.75rem', fontSize: '10px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    {t('validationDate')}
                  </th>
                )}
                <th style={{ textAlign: language === 'ar' ? 'left' : 'right', padding: '0.5rem 0.75rem', fontSize: '10px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                  {t('amountHT')}
                </th>
                {visibleColumns.tax && (
                  <th style={{ textAlign: language === 'ar' ? 'left' : 'right', padding: '0.5rem 0.75rem', fontSize: '10px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    {t('taxAmount')}
                  </th>
                )}
                <th style={{ textAlign: language === 'ar' ? 'left' : 'right', padding: '0.5rem 0.75rem', fontSize: '10px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                  {t('amountTTC')}
                </th>
                {showPaymentColumns && visibleColumns.paidAmount && (
                  <th style={{ textAlign: language === 'ar' ? 'left' : 'right', padding: '0.5rem 0.75rem', fontSize: '10px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    {t('alreadyPaid')}
                  </th>
                )}
                {showPaymentColumns && visibleColumns.remainingAmount && (
                  <th style={{ textAlign: language === 'ar' ? 'left' : 'right', padding: '0.5rem 0.75rem', fontSize: '10px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    {t('remainingToPay')}
                  </th>
                )}
                <th style={{ textAlign: 'center', padding: '0.5rem 0.75rem', fontSize: '10px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                  {t('status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columnCount} style={{ padding: '2rem 0', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="animate-spin" style={{ borderRadius: '50%', width: '1.5rem', height: '1.5rem', borderBottom: '2px solid #f59e0b', borderTop: '2px solid transparent', borderLeft: '2px solid transparent', borderRight: '2px solid transparent' }}></div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{t('loading')}</p>
                    </div>
                  </td>
                </tr>
              ) : documents.length > 0 ? (
                documents.map((doc) => {
                  const isSelected = selectedDocuments.includes(doc.id);
                  return (
                    <tr
                      key={doc.id}
                      style={{
                        cursor: 'pointer',
                        borderLeft: `4px solid ${isSelected ? '#f59e0b' : 'transparent'}`,
                        borderBottom: '1px solid #e2e8f0',
                        backgroundColor: isSelected ? '#fffbeb' : undefined
                      }}
                      onClick={() => handleSelectDocument(doc.id)}
                    >
                      <td style={{ padding: '0.5rem 0.5rem 0.5rem 0.75rem', position: 'sticky', left: 0, zIndex: 10, whiteSpace: 'nowrap', width: '2.5rem', backgroundColor: isSelected ? '#fffbeb' : '#ffffff' }}>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectDocument(doc.id);
                          }}
                          style={{
                            width: '1.25rem', height: '1.25rem', borderRadius: '0.375rem', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            backgroundColor: isSelected ? '#f59e0b' : '#ffffff',
                            borderColor: isSelected ? '#f59e0b' : '#cbd5e1',
                            color: isSelected ? '#ffffff' : 'transparent'
                          }}
                        >
                          {isSelected && (
                            <CheckCircle style={{ width: '0.875rem', height: '0.875rem' }} />
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', position: 'sticky', left: '2.5rem', zIndex: 10, boxShadow: '2px 0 4px rgba(0,0,0,0.05)', whiteSpace: 'nowrap', backgroundColor: isSelected ? '#fffbeb' : '#ffffff' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit?.(doc.id);
                          }}
                          style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'none', padding: 0 }}
                        >
                          {doc.number}
                        </button>
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap', textAlign: language === 'ar' ? 'right' : 'left' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#1e293b' }}>{doc.partnerName}</span>
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap', textAlign: language === 'ar' ? 'right' : 'left' }}>
                        <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                          {new Date(doc.date).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </td>
                      {documentType === 'facture' && (
                        <td style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap', textAlign: language === 'ar' ? 'right' : 'left' }}>
                          <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                            {doc.dueDate ? new Date(doc.dueDate).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            }) : '-'}
                          </span>
                        </td>
                      )}
                      {showValidationColumn && (
                        <td style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap', textAlign: language === 'ar' ? 'right' : 'left' }}>
                          <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                            {doc.validationDate ? new Date(doc.validationDate).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            }) : '-'}
                          </span>
                        </td>
                      )}
                      <td style={{ padding: '0.5rem 0.75rem', textAlign: language === 'ar' ? 'left' : 'right', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155' }}>
                          {doc.subtotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
                        </span>
                      </td>
                      {visibleColumns.tax && (
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: language === 'ar' ? 'left' : 'right', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155' }}>
                            {doc.tax.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
                          </span>
                        </td>
                      )}
                      <td style={{ padding: '0.5rem 0.75rem', textAlign: language === 'ar' ? 'left' : 'right', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>
                          {doc.total.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
                        </span>
                      </td>
                      {showPaymentColumns && visibleColumns.paidAmount && (
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: language === 'ar' ? 'left' : 'right', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#15803d' }}>
                            {doc.paidAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
                          </span>
                        </td>
                      )}
                      {showPaymentColumns && visibleColumns.remainingAmount && (
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: language === 'ar' ? 'left' : 'right', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: doc.remainingAmount > 0 ? '#b91c1c' : '#64748b' }}>
                            {doc.remainingAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
                          </span>
                        </td>
                      )}
                      <td style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <span style={{ display: 'inline-flex', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '10px', fontWeight: 600, ...getStatusStyle(doc.status) }}>
                            {getStatusLabel(doc.status)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={columnCount} style={{ padding: '2rem 0', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <Filter style={{ width: '2.5rem', height: '2.5rem', color: '#cbd5e1' }} />
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{t('noDocumentFound')}</p>
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
