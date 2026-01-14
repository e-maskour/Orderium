import { X, Package, Phone, MapPin, Calendar } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface OrderDetailsModalProps {
  order: any;
  onClose: () => void;
}

export function OrderDetailsModal({ order, onClose }: OrderDetailsModalProps) {
  const { t } = useLanguage();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'to_delivery': return 'bg-amber-50 text-amber-700 border border-amber-200/50';
      case 'in_delivery': return 'bg-blue-50 text-blue-700 border border-blue-200/50';
      case 'delivered': return 'bg-emerald-50 text-emerald-700 border border-emerald-200/50';
      case 'canceled': return 'bg-red-50 text-red-700 border border-red-200/50';
      default: return 'bg-slate-50 text-slate-600 border border-slate-200/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'to_delivery': return '📋';
      case 'in_delivery': return '🚚';
      case 'delivered': return '✅';
      case 'canceled': return '❌';
      default: return '⏳';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'to_delivery': return t('toDelivery');
      case 'in_delivery': return t('inDelivery');
      case 'delivered': return t('delivered');
      case 'canceled': return t('canceled');
      default: return status || t('unassigned');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Fixed Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200 bg-gradient-to-br from-amber-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{t('orderDetails')}</h2>
              <p className="text-sm text-slate-500 mt-1">#{order.Document.Number}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-xl"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Order and Customer Information - Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Order Information - Left */}
            <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-600" />
                {t('orderInformation')}
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{t('orderNumber')}</p>
                  <p className="text-base font-bold text-slate-800">#{order.Document.Number}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{t('status')}</p>
                  <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-semibold items-center gap-1.5 ${getStatusColor(order.Document.ServiceType === 2 ? 'to_delivery' : order.Status || 'unassigned')}`}>
                    <span className="text-base">{getStatusIcon(order.Document.ServiceType === 2 ? 'to_delivery' : order.Status || 'unassigned')}</span>
                    <span>{getStatusLabel(order.Document.ServiceType === 2 ? 'to_delivery' : order.Status || 'unassigned')}</span>
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{t('date')}</p>
                  <p className="text-sm text-slate-700">
                    {new Date(order.Document.Date).toLocaleDateString('en-US', { 
                      year: 'numeric',
                      month: 'long', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
                {order.Document.Note && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{t('note')}</p>
                    <p className="text-sm text-slate-700 bg-amber-50 border border-amber-200 rounded-lg p-3">{order.Document.Note}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Information - Right */}
            <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-600" />
                {t('customerInformation')}
              </h3>
              <div className="space-y-3">
                {order.CustomerName && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/30">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('customer')}</p>
                      <p className="text-base font-bold text-slate-800">{order.CustomerName}</p>
                    </div>
                  </div>
                )}
                {order.CustomerPhone && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('phone')}</p>
                      <a href={`tel:${order.CustomerPhone}`} className="text-base font-bold text-emerald-600 hover:text-emerald-700">
                        {order.CustomerPhone}
                      </a>
                    </div>
                  </div>
                )}
                {order.CustomerAddress && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('address')}</p>
                      <p className="text-sm text-slate-700">{order.CustomerAddress}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Items Table */}
          <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-5 pb-0">
              <h3 className="text-lg font-bold text-slate-800 mb-4">{t('orderItems')}</h3>
            </div>
            
            {/* Scrollable Items Table */}
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-slate-100 z-10">
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider">{t('product')}</th>
                    <th className="text-center py-3 px-2 text-xs font-bold text-slate-600 uppercase tracking-wider">{t('quantity')}</th>
                    <th className="text-right py-3 px-2 text-xs font-bold text-slate-600 uppercase tracking-wider">{t('unitPrice')}</th>
                    <th className="text-right py-3 px-2 text-xs font-bold text-slate-600 uppercase tracking-wider">{t('discount')}</th>
                    <th className="text-right py-3 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider">{t('total')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {order.Items.map((item: any, index: number) => (
                    <tr key={item.Id} className={index !== order.Items.length - 1 ? 'border-b border-slate-100' : ''}>
                      <td className="py-3 px-5">
                        <p className="font-semibold text-slate-800">{item.ProductName || `Product #${item.ProductId}`}</p>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="inline-flex items-center justify-center bg-amber-100 text-amber-700 font-bold px-3 py-1 rounded-lg text-sm">
                          {item.Quantity}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-slate-700">
                        {item.Price.toFixed(2)} {t('currency')}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {item.Discount > 0 ? (
                          <span className="text-red-600 font-semibold">
                            -{item.Discount.toFixed(2)} {t('currency')}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-right font-bold text-slate-800">
                        {item.Total.toFixed(2)} {t('currency')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Fixed Order Totals */}
            <div className="p-5 pt-4 border-t border-slate-200 bg-white space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-600">{t('subtotal')}</span>
                <span className="text-base font-bold text-slate-800">
                  {order.Items.reduce((sum: number, item: any) => sum + item.Total, 0).toFixed(2)} {t('currency')}
                </span>
              </div>
              {order.Document.Discount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-600">{t('discount')}</span>
                  <span className="text-base font-bold text-red-600">
                    -{order.Document.Discount.toFixed(2)} {t('currency')}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                <span className="text-lg font-bold text-slate-800">{t('grandTotal')}</span>
                <span className="text-2xl font-bold text-amber-600">
                  {order.Document.Total.toFixed(2)} <span className="text-lg">{t('currency')}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors shadow-md"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
