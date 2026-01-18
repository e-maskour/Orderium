import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { partnersService } from '../modules/partners';
import { invoicesService } from '../modules/invoices';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { 
  Users, 
  ArrowLeft,
  Edit,
  FileText,
  Clock,
  CreditCard,
  Truck,
  BarChart3
} from 'lucide-react';

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [chartMode, setChartMode] = useState<'count' | 'amount'>('count');

  const { data: partner, isLoading: partnerLoading } = useQuery({
    queryKey: ['partner', id],
    queryFn: () => partnersService.getById(Number(id)),
    enabled: !!id,
  });

  // Mock data for invoices and orders - replace with actual API calls
  const { data: invoicesData = [] } = useQuery({
    queryKey: ['customer-invoices', id],
    queryFn: async () => {
      // Replace with actual API call to get customer invoices
      const allInvoices = await invoicesService.getAll();
      return allInvoices.filter(inv => inv.invoice.customerId === Number(id));
    },
    enabled: !!id,
  });

  // Mock orders data - replace with actual API
  const ordersData: any[] = [];

  if (partnerLoading) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!partner) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">
            <p className="text-slate-500">Client non trouvé</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Calculate KPIs
  const totalInvoices = invoicesData.length;
  const totalAmountTTC = invoicesData.reduce((sum, inv) => sum + inv.invoice.total, 0);
  const remainingAmount = invoicesData
    .filter(inv => inv.invoice.status === 'unpaid' || inv.invoice.status === 'partial')
    .reduce((sum, inv) => sum + inv.invoice.total, 0);
  const totalOrders = ordersData.length;
  const totalOrdersAmount = ordersData.reduce((sum: number, order: any) => sum + (order.total || 0), 0);

  // Generate chart data by month
  const generateChartData = () => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const currentYear = new Date().getFullYear();
    
    return months.map((month, index) => {
      const monthInvoices = invoicesData.filter(inv => {
        const invoiceDate = new Date(inv.invoice.date);
        return invoiceDate.getMonth() === index && invoiceDate.getFullYear() === currentYear;
      });
      
      return {
        month,
        count: monthInvoices.length,
        amount: monthInvoices.reduce((sum, inv) => sum + (inv.invoice.total * 0.8), 0) // HT approximation
      };
    });
  };

  const chartData = generateChartData();
  const maxValue = Math.max(...chartData.map(d => chartMode === 'count' ? d.count : d.amount));

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          icon={Users}
          title={partner.name}
          subtitle="Détails du client"
          actions={
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/customers/edit/${id}`)}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Modifier
              </button>
              <button
                onClick={() => navigate('/customers')}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour
              </button>
            </div>
          }
        />

        {/* Dashboard Content */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Invoices KPI */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-200 px-2 py-1 rounded-full">Factures</span>
                </div>
                <h3 className="text-2xl font-bold text-blue-900 mb-1">{totalInvoices}</h3>
                <p className="text-sm text-blue-700">Total: {totalAmountTTC.toFixed(2)} DH</p>
              </div>

              {/* Remaining Amount KPI */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-5 border border-amber-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-amber-600 bg-amber-200 px-2 py-1 rounded-full">Impayé</span>
                </div>
                <h3 className="text-2xl font-bold text-amber-900 mb-1">{remainingAmount.toFixed(2)} DH</h3>
                <p className="text-sm text-amber-700">Reste à payer</p>
              </div>

              {/* Orders KPI */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-5 border border-emerald-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-200 px-2 py-1 rounded-full">Livraisons</span>
                </div>
                <h3 className="text-2xl font-bold text-emerald-900 mb-1">{totalOrders}</h3>
                <p className="text-sm text-emerald-700">Total: {totalOrdersAmount.toFixed(2)} DH</p>
              </div>

              {/* Payment Status */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-purple-600 bg-purple-200 px-2 py-1 rounded-full">Status</span>
                </div>
                <h3 className="text-lg font-bold text-purple-900 mb-1">
                  {remainingAmount > 0 ? 'En cours' : 'À jour'}
                </h3>
                <p className="text-sm text-purple-700">
                  {remainingAmount > 0 ? 'Paiements en attente' : 'Tous les paiements à jour'}
                </p>
              </div>
            </div>

            {/* Chart Section */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Évolution mensuelle
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setChartMode('count')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      chartMode === 'count'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Nb de factures par mois
                  </button>
                  <button
                    onClick={() => setChartMode('amount')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      chartMode === 'amount'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Montant de factures par mois (HT)
                  </button>
                </div>
              </div>

              {/* Simple Bar Chart */}
              <div className="flex items-end justify-around h-64 px-4 bg-slate-50 rounded-lg">
                {chartData.map((data, index) => {
                  const value = chartMode === 'count' ? data.count : data.amount;
                  const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex flex-col items-center gap-2">
                      <div
                        className={`w-8 rounded-t-lg transition-all ${
                          chartMode === 'count' 
                            ? 'bg-gradient-to-t from-blue-500 to-blue-400' 
                            : 'bg-gradient-to-t from-emerald-500 to-emerald-400'
                        }`}
                        style={{ height: `${height}%`, minHeight: value > 0 ? '8px' : '0px' }}
                      ></div>
                      <span className="text-xs text-slate-600 font-medium">{data.month}</span>
                      <span className="text-sm font-bold text-slate-700">
                        {chartMode === 'count' ? value : `${value.toFixed(0)}`}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 text-center">
                <span className="text-xs text-slate-500">
                  {chartMode === 'count' 
                    ? 'Nombre de factures émises par mois' 
                    : 'Montant total HT des factures par mois (DH)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
