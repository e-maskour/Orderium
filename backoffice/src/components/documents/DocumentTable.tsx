import { useState, useRef, useEffect } from 'react';
import { Edit, Trash2, Filter, ChevronDown, ChevronUp, CreditCard, CheckCircle, Eye, Columns, FileText } from 'lucide-react';
import { Checkbox } from 'primereact/checkbox';
import { Button } from 'primereact/button'; import { DataTable, DataTablePageEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
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
  const [selectedRows, setSelectedRows] = useState<Document[]>([]);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);

  const selectedDocuments = selectedRows.map(r => r.id);
  const [visibleColumns, setVisibleColumns] = useState({
    tax: false,
    paidAmount: false,
    remainingAmount: false
  });
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfTitle, setPdfTitle] = useState('');
  const columnsMenuRef = useRef<HTMLDivElement>(null);

  const clearSelection = () => setSelectedRows([]);

  const handleSelectAll = () => {
    if (selectedRows.length === documents.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows([...documents]);
    }
  };

  const getPDFDocumentType = (docType: DocumentType): 'invoice' | 'quote' | 'delivery-note' => {
    switch (docType) {
      case 'facture': return 'invoice';
      case 'devis': return 'quote';
      case 'bon_livraison': return 'delivery-note';
      default: return 'invoice';
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnsMenuRef.current && !columnsMenuRef.current.contains(event.target as Node)) {
        setShowColumnsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear selection when page changes
  useEffect(() => {
    setSelectedRows([]);
  }, [currentPage]);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <style>{`
        .doc-datatable .p-datatable-thead > tr > th { background: #f8fafc; padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
        .doc-datatable .p-datatable-tbody > tr > td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; }
        .doc-datatable .p-datatable-tbody > tr:hover > td { background: #f8fafc !important; }
        .doc-datatable .p-datatable-tbody > tr.p-highlight > td { background: #fffbeb !important; }
        .doc-datatable .p-paginator { border: none; border-bottom: 1px solid #e2e8f0; background: #f8fafc; padding: 0.375rem 0.75rem; border-radius: 0; }
        .doc-datatable .p-paginator .p-paginator-page.p-highlight { background: #f59e0b; color: #fff; border-color: #f59e0b; }
      `}</style>
      {/* Column Toggle and Filter Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }} ref={columnsMenuRef}>
          <Button
            onClick={() => setShowColumnsMenu(!showColumnsMenu)}
            outlined
            size="small"
            icon={<Columns style={{ width: '0.875rem', height: '0.875rem' }} />}
            iconPos="left"
            label={t('columns')}
          />
          {showColumnsMenu && (
            <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: '0.25rem', width: '14rem', backgroundColor: '#ffffff', borderRadius: '0.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0', zIndex: 50, padding: '0.5rem 0' }}>
              <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>{t('showHideColumns')}</p>
              </div>
              <div style={{ padding: '0.25rem 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', cursor: 'pointer' }}>
                  <Checkbox
                    checked={visibleColumns.tax}
                    onChange={(e) => setVisibleColumns(prev => ({ ...prev, tax: e.checked ?? false }))}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#334155' }}>{t('taxAmount')}</span>
                </label>
                {showPaymentColumns && (
                  <>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', cursor: 'pointer' }}>
                      <Checkbox
                        checked={visibleColumns.paidAmount}
                        onChange={(e) => setVisibleColumns(prev => ({ ...prev, paidAmount: e.checked ?? false }))}
                      />
                      <span style={{ fontSize: '0.75rem', color: '#334155' }}>{t('alreadyPaid')}</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', cursor: 'pointer' }}>
                      <Checkbox
                        checked={visibleColumns.remainingAmount}
                        onChange={(e) => setVisibleColumns(prev => ({ ...prev, remainingAmount: e.checked ?? false }))}
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
          <Button
            onClick={onFiltersToggle}
            icon={<Filter style={{ width: '1rem', height: '1rem' }} />}
            iconPos="left"
            label={t('filters')}
            severity={filtersExpanded ? undefined : 'secondary'}
            outlined={!filtersExpanded}
          />
        )}
      </div>

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

      {/* DataTable */}
      <DataTable
        className="doc-datatable"
        value={documents}
        lazy
        totalRecords={totalCount}
        first={(currentPage - 1) * pageSize}
        onPage={(e: DataTablePageEvent) => {
          onPageChange(Math.floor(e.first / e.rows) + 1);
          onPageSizeChange(e.rows);
        }}
        selection={selectedRows}
        onSelectionChange={(e) => setSelectedRows(e.value as Document[])}
        selectionMode="checkbox"
        dataKey="id"
        paginator
        paginatorPosition="top"
        rows={pageSize}
        rowsPerPageOptions={[10, 25, 50, 100]}
        removableSort
        loading={loading}
        emptyMessage={t('noDocumentFound')}
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
        currentPageReportTemplate="{first} - {last} / {totalRecords}"
      >
        <Column selectionMode="multiple" headerStyle={{ width: '2.5rem' }} />
        <Column
          field="number"
          header={t('number')}
          sortable
          body={(doc: Document) => (
            <Button
              label={doc.number}
              link
              onClick={(e) => { e.stopPropagation(); onEdit?.(doc.id); }}
              style={{ fontSize: '0.875rem', fontWeight: 600, padding: 0 }}
            />
          )}
        />
        <Column
          field="partnerName"
          header={partnerLabel}
          sortable
          body={(doc: Document) => (
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{doc.partnerName}</span>
          )}
        />
        <Column
          field="date"
          header={documentType === 'facture' ? t('invoiceDate') : documentType === 'devis' ? t('quoteDate') : t('deliveryDate')}
          sortable
          body={(doc: Document) => (
            <span style={{ fontSize: '0.875rem', color: '#475569' }}>
              {new Date(doc.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          )}
        />
        {documentType === 'facture' && (
          <Column
            field="dueDate"
            header={t('dueDate')}
            sortable
            body={(doc: Document) => (
              <span style={{ fontSize: '0.875rem', color: '#475569' }}>
                {doc.dueDate ? new Date(doc.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
              </span>
            )}
          />
        )}
        {showValidationColumn && (
          <Column
            field="validationDate"
            header={t('validationDate')}
            sortable
            body={(doc: Document) => (
              <span style={{ fontSize: '0.875rem', color: '#475569' }}>
                {doc.validationDate ? new Date(doc.validationDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
              </span>
            )}
          />
        )}
        <Column
          field="subtotal"
          header={t('amountHT')}
          sortable
          body={(doc: Document) => (
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>
              {doc.subtotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
            </span>
          )}
        />
        {visibleColumns.tax && (
          <Column
            field="tax"
            header={t('taxAmount')}
            sortable
            body={(doc: Document) => (
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>
                {doc.tax.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
              </span>
            )}
          />
        )}
        <Column
          field="total"
          header={t('amountTTC')}
          sortable
          body={(doc: Document) => (
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
              {doc.total.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
            </span>
          )}
        />
        {showPaymentColumns && visibleColumns.paidAmount && (
          <Column
            field="paidAmount"
            header={t('alreadyPaid')}
            sortable
            body={(doc: Document) => (
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#15803d' }}>
                {doc.paidAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
              </span>
            )}
          />
        )}
        {showPaymentColumns && visibleColumns.remainingAmount && (
          <Column
            field="remainingAmount"
            header={t('remainingToPay')}
            sortable
            body={(doc: Document) => (
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: doc.remainingAmount > 0 ? '#b91c1c' : '#64748b' }}>
                {doc.remainingAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
              </span>
            )}
          />
        )}
        <Column
          field="status"
          header={t('status')}
          body={(doc: Document) => (
            <span style={{ display: 'inline-flex', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '10px', fontWeight: 600, ...getStatusStyle(doc.status) }}>
              {getStatusLabel(doc.status)}
            </span>
          )}
        />
      </DataTable>

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
