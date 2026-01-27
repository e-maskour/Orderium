import { X, Package, Phone, MapPin, Calendar } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// Keyframe animations for modal entrance
const backdropAnimation = `
  @keyframes backdropFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const modalAnimation = `
  @keyframes modalSlideUp {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
`;

const contentAnimation = `
  @keyframes contentFadeIn {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

// Inject keyframes
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = backdropAnimation + modalAnimation + contentAnimation;
  if (!document.head.querySelector('[data-order-modal-animations]')) {
    styleSheet.setAttribute('data-order-modal-animations', 'true');
    document.head.appendChild(styleSheet);
  }
}

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
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        style={{
          animation: 'backdropFadeIn 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards'
        }}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        style={{
          animation: 'modalSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
        }}
      >
        {/* Fixed Header */}
        <div className="flex-shrink-0 px-6 py-3 border-b border-slate-200 bg-gradient-to-br from-amber-50 to-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">{t('orderDetails')}</h2>
              <p className="text-xs text-slate-500 mt-0.5">#{order.orderNumber}</p>
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
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{
            animation: 'contentFadeIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.15s backwards'
          }}
        >
          {/* Order and Customer Information - Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Order Information - Left */}
            <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-3">
              <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-600" />
                {t('orderInformation')}
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">{t('orderNumber')}</p>
                  <p className="text-sm font-bold text-slate-800">#{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">{t('status')}</p>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold items-center gap-1 ${getStatusColor(order.serviceType === 2 ? 'to_delivery' : order.status || 'unassigned')}`}>
                    <span className="text-sm">{getStatusIcon(order.serviceType === 2 ? 'to_delivery' : order.status || 'unassigned')}</span>
                    <span>{getStatusLabel(order.serviceType === 2 ? 'to_delivery' : order.status || 'unassigned')}</span>
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">{t('date')}</p>
                  <p className="text-xs text-slate-700">
                    {new Date(order.date || order.dateCreated).toLocaleDateString('fr-FR', { 
                      year: 'numeric',
                      month: 'long', 
                      day: 'numeric'
                    })}
                  </p>
                </div>
                {order.note && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">{t('note')}</p>
                    <p className="text-xs text-slate-700 bg-amber-50 border border-amber-200 rounded-lg p-2">{order.note}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Information - Right */}
            <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-3">
              <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-amber-600" />
                {t('customerInformation')}
              </h3>
              <div className="space-y-2">
                {order.customerName && (
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm shadow-amber-500/20">
                      <Package className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('customer')}</p>
                      <p className="text-sm font-bold text-slate-800">{order.customerName}</p>
                    </div>
                  </div>
                )}
                {order.customerPhone && (
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('phone')}</p>
                      <a href={`tel:${order.customerPhone}`} className="text-sm font-bold text-emerald-600 hover:text-emerald-700">
                        {order.customerPhone}
                      </a>
                    </div>
                  </div>
                )}
                {order.customerAddress && (
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('address')}</p>
                      <p className="text-xs text-slate-700">{order.customerAddress}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Items Table */}
          <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-3 pb-0">
              <h3 className="text-sm font-bold text-slate-800 mb-2">{t('orderItems')}</h3>
            </div>
            
            {/* Scrollable Items Table */}
            <div className="max-h-64 overflow-y-auto">
              {(!order.items || order.items.length === 0) ? (
                <div className="text-center py-8 text-slate-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>{t('noItems') || 'No items found'}</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-100 z-10">
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-3 text-xs font-bold text-slate-600 uppercase tracking-wider">{t('product')}</th>
                      <th className="text-center py-2 px-2 text-xs font-bold text-slate-600 uppercase tracking-wider">{t('quantity')}</th>
                      <th className="text-right py-2 px-2 text-xs font-bold text-slate-600 uppercase tracking-wider">{t('unitPrice')}</th>
                      <th className="text-right py-2 px-2 text-xs font-bold text-slate-600 uppercase tracking-wider">{t('discount')}</th>
                      <th className="text-right py-2 px-3 text-xs font-bold text-slate-600 uppercase tracking-wider">{t('total')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {(order.items || []).map((item: any, index: number) => (
                      <tr key={item.id || index} className={index !== (order.items || []).length - 1 ? 'border-b border-slate-100' : ''}>
                        <td className="py-2 px-3">
                          <p className="font-semibold text-xs text-slate-800">{item.description || item.product?.name || `Product #${item.productId}`}</p>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className="inline-flex items-center justify-center bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded text-xs">
                            {parseFloat(item.quantity || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right font-semibold text-xs text-slate-700">
                          {parseFloat(item.unitPrice || 0).toFixed(2)} {t('currency')}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {parseFloat(item.discount || 0) > 0 ? (
                            <span className="text-red-600 font-semibold text-xs">
                              -{parseFloat(item.discount || 0).toFixed(2)} {t('currency')}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-xs text-slate-800">
                          {parseFloat(item.total || 0).toFixed(2)} {t('currency')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Fixed Order Totals */}
            <div className="p-3 pt-2 border-t border-slate-200 bg-white space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-600">{t('subtotal')}</span>
                <span className="text-sm font-bold text-slate-800">
                  {(order.items || []).reduce((sum: number, item: any) => sum + parseFloat(item.total || 0), 0).toFixed(2)} {t('currency')}
                </span>
              </div>
              {parseFloat(order.discount || 0) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-600">{t('discount')}</span>
                  <span className="text-sm font-bold text-red-600">
                    -{parseFloat(order.discount || 0).toFixed(2)} {t('currency')}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-sm font-bold text-slate-800">{t('grandTotal')}</span>
                <span className="text-lg font-bold text-amber-600">
                  {parseFloat(order.total || 0).toFixed(2)} <span className="text-sm">{t('currency')}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-md"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
