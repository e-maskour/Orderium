import { useState, useEffect } from 'react';
import { Edit, Trash2, ChevronDown, ChevronUp, CreditCard, CheckCircle, Eye, FileText, Share2, MessageCircle } from 'lucide-react';
import { Button } from 'primereact/button'; import { DataTable, DataTablePageEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { FloatingActionBar } from '../FloatingActionBar';
import { DocumentType } from '../../modules/documents/types';
import { pdfService } from '../../services/pdf.service';
import { PDFPreviewModal } from '../PDFPreviewModal';
import { useLanguage } from '../../context/LanguageContext';
import { MobileList } from '../MobileList';
import { useIsMobile } from '../../hooks/useIsMobile';
import { formatAmount } from '@orderium/ui';

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
  onShare?: (id: number) => void;
  onWhatsApp?: (id: number) => void;
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
  onPageSizeChange,
  onShare,
  onWhatsApp, }: DocumentTableProps) {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();
  const [selectedRows, setSelectedRows] = useState<Document[]>([]);
  const selectedDocuments = selectedRows.map(r => r.id);
  const visibleColumns = { tax: false, paidAmount: false, remainingAmount: false };
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfTitle, setPdfTitle] = useState('');
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

  // Clear selection when page changes
  useEffect(() => {
    setSelectedRows([]);
  }, [currentPage]);

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'paid': return 'status-badge status-badge--success';
      case 'partial':
      case 'pending': return 'status-badge status-badge--warning';
      case 'overdue': return 'status-badge status-badge--danger';
      case 'unpaid': return 'status-badge status-badge--orange';
      case 'open': return 'status-badge status-badge--primary';
      case 'signed': return 'status-badge status-badge--success';
      case 'closed': return 'status-badge status-badge--danger';
      case 'invoiced': return 'status-badge status-badge--purple';
      case 'validated': return 'status-badge status-badge--sky';
      case 'in_progress': return 'status-badge status-badge--teal';
      case 'delivered': return 'status-badge status-badge--emerald';
      case 'cancelled': return 'status-badge status-badge--rose';
      case 'draft':
      default: return 'status-badge status-badge--neutral';
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
            },
            {
              id: 'share',
              label: t('share'),
              icon: <Share2 style={{ width: '1rem', height: '1rem' }} />,
              onClick: () => {
                if (selectedDocuments.length === 1) {
                  onShare?.(selectedDocuments[0]);
                  clearSelection();
                }
              },
              hidden: !onShare || selectedDocuments.length !== 1 || selectedDocumentsData.every(d => !d?.isValidated)
            },
            {
              id: 'whatsapp',
              label: 'WhatsApp',
              icon: <MessageCircle style={{ width: '1rem', height: '1rem' }} />,
              onClick: () => {
                if (selectedDocuments.length === 1) {
                  onWhatsApp?.(selectedDocuments[0]);
                  clearSelection();
                }
              },
              hidden: !onWhatsApp || selectedDocuments.length !== 1 || selectedDocumentsData.every(d => !d?.isValidated)
            },
          ];
        })()}
      />

      {/* DataTable — desktop only */}
      <div className="responsive-table-desktop" style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
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
          paginatorTemplate="CurrentPageReport PrevPageLink NextPageLink RowsPerPageDropdown"
          currentPageReportTemplate="{first}-{last} of {totalRecords}"
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
                style={{ fontSize: '0.8125rem', fontWeight: 700, padding: '0.25rem 0.625rem', background: 'linear-gradient(135deg, #eff6ff, #eef2ff)', border: '1.5px solid rgba(35,90,228,0.18)', borderRadius: '9999px', color: '#235ae4', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}
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
                {formatAmount(doc.subtotal, 2)} {language === 'ar' ? 'د.م' : 'DH'}
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
                  {formatAmount(doc.tax, 2)} {language === 'ar' ? 'د.م' : 'DH'}
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
                {formatAmount(doc.total, 2)} {language === 'ar' ? 'د.م' : 'DH'}
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
                  {formatAmount(doc.paidAmount, 2)} {language === 'ar' ? 'د.م' : 'DH'}
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
                  {formatAmount(doc.remainingAmount, 2)} {language === 'ar' ? 'د.م' : 'DH'}
                </span>
              )}
            />
          )}
          <Column
            field="status"
            header={t('status')}
            body={(doc: Document) => (
              <span className={getStatusBadgeClass(doc.status)}>
                {getStatusLabel(doc.status)}
              </span>
            )}
          />
        </DataTable>
      </div>

      {/* Mobile card list */}
      <div className="responsive-table-mobile">
        <MobileList
          items={documents}
          keyExtractor={(doc) => doc.id}
          onTap={(doc) => onEdit?.(doc.id)}
          loading={loading}
          totalCount={totalCount}
          countLabel={itemLabel}
          emptyMessage={t('noDocumentFound')}
          config={{
            topLeft: (doc) => (
              <span style={{ display: 'inline-block', padding: '0.1875rem 0.5rem', background: 'linear-gradient(135deg, #eff6ff, #eef2ff)', border: '1.5px solid rgba(35,90,228,0.18)', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, color: '#235ae4', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
                {doc.number}
              </span>
            ),
            topRight: (doc) => (
              <span>
                {formatAmount(doc.total, 2)}{' '}
                {language === 'ar' ? 'د.م' : 'DH'}
              </span>
            ),
            bottomLeft: (doc) =>
              `${doc.partnerName} · ${new Date(doc.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`,
            bottomRight: (doc) => (
              <span className={getStatusBadgeClass(doc.status)}>
                {getStatusLabel(doc.status)}
              </span>
            ),
          }}
          hasMore={currentPage * pageSize < totalCount}
          onLoadMore={() => onPageChange(currentPage + 1)}
        />
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
