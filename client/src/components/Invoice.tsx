import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency } from '@/lib/i18n';
import { CartItem } from '@/context/CartContext';
import { productTranslations } from '@/data/mockProducts';

interface InvoiceProps {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  items: CartItem[];
  subtotal: number;
  orderDate: Date;
}

export const Invoice = ({
  orderNumber,
  customerName,
  customerPhone,
  customerAddress,
  items,
  subtotal,
  orderDate,
}: InvoiceProps) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  const discount = 0;
  const subtotalAfterDiscount = subtotal - discount;

  return (
    <div
      id="invoice-content"
      className="bg-white p-12 max-w-4xl mx-auto"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-2xl font-bold mb-8">
          {isArabic ? 'وصل التسليم' : 'BON DE LIVRAISON'}
        </h1>

        {/* Bill To and Invoice Details */}
        <div className="flex justify-between items-start pt-8" style={{ borderTop: '1px solid #e5e7eb' }}>
          <div>
            <p className="text-sm font-bold mb-2">
              {isArabic ? 'الفاتورة إلى:' : 'Bill To:'}
            </p>
            <p className="text-sm" style={{ color: '#3b82f6' }}>{customerName}</p>
            {customerPhone && (
              <p className="text-xs text-gray-600">{customerPhone}</p>
            )}
            {customerAddress && (
              <p className="text-xs text-gray-600">{customerAddress}</p>
            )}
          </div>

          <div className="text-right">
            <div className="mb-2">
              <p className="text-sm font-bold inline-block" style={{ width: '120px', textAlign: 'left' }}>
                {isArabic ? 'رقم الفاتورة:' : 'Invoice No.:'}
              </p>
              <span className="text-sm">20-200-{orderNumber}</span>
            </div>
            <div className="mb-2">
              <p className="text-sm font-bold inline-block" style={{ width: '120px', textAlign: 'left' }}>
                {isArabic ? 'التاريخ:' : 'Date:'}
              </p>
              <span className="text-sm">
                {orderDate.toLocaleDateString(isArabic ? 'ar-MA' : 'en-US', {
                  month: 'numeric',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="mb-2">
              <p className="text-sm font-bold inline-block" style={{ width: '120px', textAlign: 'left' }}>
                {isArabic ? 'تاريخ الاستحقاق:' : 'Due date:'}
              </p>
              <span className="text-sm">
                {orderDate.toLocaleDateString(isArabic ? 'ar-MA' : 'en-US', {
                  month: 'numeric',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div>
              <p className="text-sm font-bold inline-block" style={{ width: '120px', textAlign: 'left' }}>
                {isArabic ? 'حالة الدفع:' : 'Payment status:'}
              </p>
              <span className="text-sm font-bold">{isArabic ? 'مدفوعة' : 'Paid'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th className="text-left p-3 text-sm font-bold border-b border-gray-300" style={{ width: '50px' }}>
                {isArabic ? 'رقم' : 'No.'}
              </th>
              <th className="text-left p-3 text-sm font-bold border-b border-gray-300">
                {isArabic ? 'المنتج' : 'Item'}
              </th>
              <th className="text-center p-3 text-sm font-bold border-b border-gray-300" style={{ width: '100px' }}>
                {isArabic ? 'الكمية' : 'Quantity'}
              </th>
              <th className="text-right p-3 text-sm font-bold border-b border-gray-300" style={{ width: '120px' }}>
                {isArabic ? 'سعر الوحدة' : 'Unit price'}
              </th>
              <th className="text-right p-3 text-sm font-bold border-b border-gray-300" style={{ width: '120px' }}>
                {isArabic ? 'المجموع' : 'Total'}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const translation = productTranslations[item.product.Id];
              const displayName =
                language === 'fr' && translation ? translation.name : item.product.Name;
              const itemTotal = item.product.Price * item.quantity;

              return (
                <tr key={index}>
                  <td className="p-3 text-sm border-b border-gray-200">{index + 1}</td>
                  <td className="p-3 text-sm border-b border-gray-200">{displayName}</td>
                  <td className="p-3 text-sm text-center border-b border-gray-200">{item.quantity}</td>
                  <td className="p-3 text-sm text-right border-b border-gray-200">
                    {formatCurrency(item.product.Price, language)}
                  </td>
                  <td className="p-3 text-sm text-right font-semibold border-b border-gray-200">
                    {formatCurrency(itemTotal, language)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="flex justify-end">
        <div style={{ width: '400px' }}>
          {/* Subtotal */}
          <div className="flex justify-between items-center py-2 text-sm border-b border-gray-200">
            <span className="font-bold">{isArabic ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
            <span className="font-bold">{formatCurrency(subtotal, language)}</span>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center py-2 text-sm border-b border-gray-200" style={{ backgroundColor: '#f3f4f6' }}>
            <span className="font-bold">{isArabic ? 'المجموع:' : 'Total:'}</span>
            <span className="font-bold">{formatCurrency(subtotal, language)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};