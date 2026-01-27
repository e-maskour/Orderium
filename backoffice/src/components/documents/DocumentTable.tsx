import { useState, useRef, useEffect } from 'react';
import { Search, Edit, Trash2, Download, Filter, ChevronDown, CreditCard, CheckCircle, Eye, Columns } from 'lucide-react';
import { FloatingActionBar } from '../FloatingActionBar';
import { DocumentType } from '../../modules/documents/types';

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
  showValidationColumn = false
}: DocumentTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'number'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    tax: false,
    paidAmount: false,
    remainingAmount: false
  });
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const columnsMenuRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 10;

  // Selection functions
  const handleSelectAll = () => {
    if (selectedDocuments.length === paginatedDocuments.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(paginatedDocuments.map(d => d.id));
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
        return 'Payée';
      case 'partial':
        return 'Partielle';
      case 'pending':
        return 'En attente';
      case 'overdue':
        return 'En retard';
      case 'unpaid':
        return 'Impayée';
      
      // Quote statuses
      case 'open':
        return 'Ouvert';
      case 'signed':
        return 'Signée (à facturer)';
      case 'closed':
        return 'Non signée (fermée)';
      case 'invoiced':
        return 'Facturée';
      
      // Bon de livraison statuses
      case 'validated':
        return 'Validée';
      case 'in_progress':
        return 'En cours';
      case 'delivered':
        return 'Livrée';
      case 'cancelled':
        return 'Annulée';
      
      // Common
      case 'draft':
        return 'Brouillon';
      default:
        return status;
    }
  };

  const filteredDocuments = documents
    .filter(doc => {
      const matchesSearch = 
        doc.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.partnerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'amount':
          aValue = a.total;
          bValue = b.total;
          break;
        case 'number':
          aValue = a.number;
          bValue = b.number;
          break;
        default:
          return 0;
      }
      return sortOrder === 'asc' ? aValue > bValue ? 1 : -1 : aValue < bValue ? 1 : -1;
    });

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, startIndex + itemsPerPage);

  // Calculate column count based on features and visible columns
  const columnCount = 5 + 
    (documentType === 'facture' ? 1 : 0) + 
    (showValidationColumn ? 1 : 0) + 
    (visibleColumns.tax ? 1 : 0) + 
    (showPaymentColumns && visibleColumns.paidAmount ? 1 : 0) + 
    (showPaymentColumns && visibleColumns.remainingAmount ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* Search and Column Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-3">
        <div className="relative" ref={columnsMenuRef}>
          <button
            onClick={() => setShowColumnsMenu(!showColumnsMenu)}
            className="flex items-center justify-center gap-2 px-3 py-2 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium text-slate-700 w-full sm:w-auto"
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Colonnes</span>
            <span className="sm:hidden">Afficher colonnes</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {showColumnsMenu && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-50 py-2">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-700">Afficher/Masquer colonnes</p>
              </div>
              <div className="py-1">
                <label className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns.tax}
                    onChange={(e) => setVisibleColumns(prev => ({ ...prev, tax: e.target.checked }))}
                    className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-500"
                  />
                  <span className="text-xs text-slate-700">Montant TVA</span>
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
                      <span className="text-xs text-slate-700">Déjà réglé</span>
                    </label>
                    <label className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleColumns.remainingAmount}
                        onChange={(e) => setVisibleColumns(prev => ({ ...prev, remainingAmount: e.target.checked }))}
                        className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-500"
                      />
                      <span className="text-xs text-slate-700">Reste à payer</span>
                    </label>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par numéro ou nom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Separator Line */}
      <div className="border-t border-slate-200"></div>

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedCount={selectedDocuments.length}
        onClearSelection={clearSelection}
        onSelectAll={handleSelectAll}
        isAllSelected={selectedDocuments.length === paginatedDocuments.length && paginatedDocuments.length > 0}
        totalCount={paginatedDocuments.length}
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
              label: 'Voir',
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
              label: 'Valider',
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
              label: 'Dévalider', 
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
              label: 'Paiements',
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
              id: 'download',
              label: 'Télécharger',
              icon: <Download className="w-4 h-4" />,
              onClick: () => {
                selectedDocuments.forEach(id => onDownload?.(id));
                clearSelection();
              }
            },
            {
              id: 'delete',
              label: 'Supprimer',
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
                      selectedDocuments.length === paginatedDocuments.length && paginatedDocuments.length > 0
                        ? 'bg-amber-500 border-amber-500 text-white'
                        : 'bg-white border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {selectedDocuments.length === paginatedDocuments.length && paginatedDocuments.length > 0 && (
                      <CheckCircle className="w-3.5 h-3.5" />
                    )}
                  </div>
                </th>
                <th className="text-left py-2 px-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider sticky left-10 z-20 bg-slate-50 shadow-[2px_0_4px_rgba(0,0,0,0.05)] whitespace-nowrap">
                  Numéro
                </th>
                <th className="text-left py-2 px-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  {partnerLabel}
                </th>
                <th className="text-left py-2 px-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Date {documentType === 'facture' ? 'facturation' : documentType === 'devis' ? 'devis' : 'livraison'}
                </th>
                {documentType === 'facture' && (
                  <th className="text-left py-2 px-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    Date échéance
                  </th>
                )}
                {showValidationColumn && (
                  <th className="text-left py-2 px-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    Date validation
                  </th>
                )}
                <th className="text-right py-2 px-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Montant HT
                </th>
                {visibleColumns.tax && (
                  <th className="text-right py-2 px-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    Montant TVA
                  </th>
                )}
                <th className="text-right py-2 px-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Montant TTC
                </th>
                {showPaymentColumns && visibleColumns.paidAmount && (
                  <th className="text-right py-2 px-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    Déjà réglé
                  </th>
                )}
                {showPaymentColumns && visibleColumns.remainingAmount && (
                  <th className="text-right py-2 px-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    Reste à payer
                  </th>
                )}
                <th className="text-center py-2 px-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="">
              {loading ? (
                <tr>
                  <td colSpan={columnCount} className="py-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
                      <p className="text-xs text-slate-500">Chargement...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedDocuments.length > 0 ? (
                paginatedDocuments.map((doc) => (
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
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="text-xs font-medium text-slate-800">{doc.partnerName}</span>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="text-xs text-slate-600">
                          {new Date(doc.date).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </td>
                      {documentType === 'facture' && (
                        <td className="py-2 px-3 whitespace-nowrap">
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
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="text-xs text-slate-600">
                            {doc.validationDate ? new Date(doc.validationDate).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            }) : '-'}
                          </span>
                        </td>
                      )}
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <span className="text-xs font-medium text-slate-700">
                          {doc.subtotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                        </span>
                      </td>
                      {visibleColumns.tax && (
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <span className="text-xs font-medium text-slate-700">
                            {doc.tax.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                          </span>
                        </td>
                      )}
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <span className="text-xs font-bold text-slate-900">
                          {doc.total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                        </span>
                      </td>
                      {showPaymentColumns && visibleColumns.paidAmount && (
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <span className="text-xs font-medium text-green-700">
                            {doc.paidAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                          </span>
                        </td>
                      )}
                      {showPaymentColumns && visibleColumns.remainingAmount && (
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <span className={`text-xs font-medium ${doc.remainingAmount > 0 ? 'text-red-700' : 'text-slate-500'}`}>
                              {doc.remainingAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
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
                      <p className="text-xs text-slate-500">Aucun document trouvé</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
            <div className="text-xs text-slate-600">
              Affichage de {startIndex + 1} à {Math.min(startIndex + itemsPerPage, filteredDocuments.length)} sur {filteredDocuments.length} {itemLabel}s
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
              >
                Précédent
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-2.5 py-1 rounded-lg transition-colors text-xs font-medium ${
                    currentPage === page
                      ? 'bg-amber-500 text-white'
                      : 'border border-slate-200 hover:bg-white'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
