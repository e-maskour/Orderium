import { useState } from 'react';
import { Search, Edit, Trash2, Download, Filter, ChevronDown, CreditCard, CheckCircle, Eye } from 'lucide-react';
import { FloatingActionBar } from './FloatingActionBar';

interface Facture {
  id: number;
  number: string;
  date: string;
  partnerName: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'draft' | 'partial' | 'unpaid';
  isValidated?: boolean;
  dueDate?: string;
  itemsCount?: number;
}

interface FactureTableProps {
  type: 'vente' | 'achat';
  factures: Facture[];
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onDownload?: (id: number) => void;
  onViewPayments?: (id: number) => void;
  onValidate?: (id: number) => void;
  onDevalidate?: (id: number) => void;
  loading?: boolean;
}

export function FactureTable({ type, factures, onEdit, onDelete, onDownload, onViewPayments, onValidate, onDevalidate, loading }: FactureTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'number'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFactures, setSelectedFactures] = useState<number[]>([]);
  const itemsPerPage = 10;

  const partnerLabel = type === 'vente' ? 'Client' : 'Fournisseur';

  // Selection functions
  const handleSelectAll = () => {
    if (selectedFactures.length === paginatedFactures.length) {
      setSelectedFactures([]);
    } else {
      setSelectedFactures(paginatedFactures.map(f => f.id));
    }
  };

  const handleSelectFacture = (id: number) => {
    setSelectedFactures(prev => 
      prev.includes(id) 
        ? prev.filter(fId => fId !== id)
        : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedFactures([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'partial':
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'overdue':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'unpaid':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'draft':
        return 'bg-slate-50 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
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
      case 'draft':
        return 'Brouillon';
      default:
        return status;
    }
  };

  const filteredFactures = factures
    .filter(facture => {
      const matchesSearch = 
        facture.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facture.partnerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || facture.status === statusFilter;
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
          aValue = a.amount;
          bValue = b.amount;
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

  const totalPages = Math.ceil(filteredFactures.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFactures = filteredFactures.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex justify-end mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par numéro ou nom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-96 pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Separator Line */}
      <div className="border-t border-slate-200"></div>

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedCount={selectedFactures.length}
        onClearSelection={clearSelection}
        onSelectAll={handleSelectAll}
        isAllSelected={selectedFactures.length === paginatedFactures.length && paginatedFactures.length > 0}
        totalCount={paginatedFactures.length}
        itemLabel="facture"
        actions={(() => {
          // Check if selected factures have mixed validation states
          const selectedFacturesData = selectedFactures.map(id => factures.find(f => f.id === id)).filter((f): f is Facture => f !== undefined);
          const hasValidated = selectedFacturesData.some(f => f.isValidated);
          const hasUnvalidated = selectedFacturesData.some(f => !f.isValidated);
          const hasMixedValidation = hasValidated && hasUnvalidated;
          
          return [
            {
              id: 'view',
              label: 'Voir',
              icon: <Eye className="w-4 h-4" />,
              onClick: () => {
                if (selectedFactures.length === 1) {
                  onEdit?.(selectedFactures[0]);
                  clearSelection();
                }
              },
              hidden: selectedFactures.length !== 1
            },
            {
              id: 'validate',
              label: 'Valider',
              icon: <CheckCircle className="w-4 h-4" />,
              onClick: () => {
                selectedFactures.forEach(id => {
                  const facture = factures.find(f => f.id === id);
                  if (facture && !facture.isValidated) {
                    onValidate?.(id);
                  }
                });
                clearSelection();
              },
              variant: 'primary' as const,
              hidden: hasMixedValidation || (selectedFactures.length === 1 && hasValidated)
            },
            {
              id: 'devalidate',
              label: 'Dévalider', 
              icon: <Edit className="w-4 h-4" />,
              onClick: () => {
                selectedFactures.forEach(id => {
                  const facture = factures.find(f => f.id === id);
                  if (facture && facture.isValidated) {
                    onDevalidate?.(id);
                  }
                });
                clearSelection();
              },
              hidden: hasMixedValidation || (selectedFactures.length === 1 && hasUnvalidated)
            },
            {
              id: 'payments',
              label: 'Paiements',
              icon: <CreditCard className="w-4 h-4" />,
              onClick: () => {
                if (selectedFactures.length === 1) {
                  onViewPayments?.(selectedFactures[0]);
                  clearSelection();
                }
              },
              hidden: selectedFactures.length !== 1 || selectedFacturesData.every(facture => 
                !facture?.isValidated || facture?.status === 'draft'
              )
            },
            {
              id: 'download',
              label: 'Télécharger',
              icon: <Download className="w-4 h-4" />,
              onClick: () => {
                selectedFactures.forEach(id => onDownload?.(id));
                clearSelection();
              }
            },
            {
              id: 'delete',
              label: 'Supprimer',
              icon: <Trash2 className="w-4 h-4" />,
              onClick: () => {
                selectedFactures.forEach(id => onDelete?.(id));
                clearSelection();
              },
              variant: 'danger' as const
            }
          ];
        })()}
      />

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-4 px-6">
                  <div
                    onClick={handleSelectAll}
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${
                      selectedFactures.length === paginatedFactures.length && paginatedFactures.length > 0
                        ? 'bg-amber-500 border-amber-500 text-white'
                        : 'bg-white border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {selectedFactures.length === paginatedFactures.length && paginatedFactures.length > 0 && (
                      <CheckCircle className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Numéro
                </th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  {partnerLabel}
                </th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Articles
                </th>
                <th className="text-right py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Montant
                </th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                      <p className="text-slate-500">Chargement des factures...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedFactures.length > 0 ? (
                paginatedFactures.map((facture) => (
                  <tr 
                    key={facture.id} 
                    className={`transition-all duration-200 cursor-pointer border-l-4 border-b border-slate-200 ${
                      selectedFactures.includes(facture.id) 
                        ? 'bg-amber-50 border-l-amber-500 shadow-md !bg-amber-50' 
                        : 'hover:bg-slate-50 border-l-transparent'
                    }`}
                    style={selectedFactures.includes(facture.id) ? { backgroundColor: 'rgb(255 251 235)' } : {}}
                    onClick={() => handleSelectFacture(facture.id)}
                  >
                    <td className="py-4 px-6">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectFacture(facture.id);
                        }}
                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${
                          selectedFactures.includes(facture.id)
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : 'bg-white border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        {selectedFactures.includes(facture.id) && (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => onEdit?.(facture.id)}
                        className="font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                      >
                        {facture.number}
                      </button>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-slate-600">
                        {new Date(facture.date).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-medium text-slate-800">{facture.partnerName}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-center">
                        <span className="text-sm text-slate-600">
                          {facture.itemsCount || 0}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-sm font-bold text-slate-900">
                        {facture.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-center">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(facture.status)}`}>
                          {getStatusLabel(facture.status)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Filter className="w-12 h-12 text-slate-300" />
                      <p className="text-slate-500">Aucune facture trouvée</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
            <div className="text-sm text-slate-600">
              Affichage de {startIndex + 1} à {Math.min(startIndex + itemsPerPage, filteredFactures.length)} sur {filteredFactures.length} factures
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Précédent
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
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
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
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
