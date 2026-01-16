import { useState } from 'react';
import { Search, Edit, Trash2, Download, Filter, ChevronDown, MoreVertical, CreditCard } from 'lucide-react';

interface Facture {
  id: number;
  number: string;
  date: string;
  partnerName: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
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
}

export function FactureTable({ type, factures, onEdit, onDelete, onDownload, onViewPayments }: FactureTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'number'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const partnerLabel = type === 'vente' ? 'Client' : 'Fournisseur';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'overdue':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Payée';
      case 'pending':
        return 'En attente';
      case 'overdue':
        return 'En retard';
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
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par numéro ou nom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all bg-white"
          >
            <option value="all">Tous les statuts</option>
            <option value="paid">Payées</option>
            <option value="pending">En attente</option>
            <option value="overdue">En retard</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all bg-white"
          >
            <option value="date">Trier par date</option>
            <option value="amount">Trier par montant</option>
            <option value="number">Trier par numéro</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            title={sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
          >
            <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
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
                <th className="text-center py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedFactures.length > 0 ? (
                paginatedFactures.map((facture) => (
                  <tr key={facture.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-semibold text-slate-800">{facture.number}</span>
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
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onViewPayments?.(facture.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Paiements"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEdit?.(facture.id)}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDownload?.(facture.id)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Télécharger"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete?.(facture.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
