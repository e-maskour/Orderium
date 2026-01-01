import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency } from '@/lib/i18n';
import { CartItem } from '@/context/CartContext';
import { productTranslations } from '@/data/mockProducts';

interface ReceiptProps {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  items: CartItem[];
  subtotal: number;
  orderDate: Date;
}

export const Receipt = ({
  orderNumber,
  customerName,
  customerPhone,
  customerAddress,
  items,
  subtotal,
  orderDate,
}: ReceiptProps) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  // Calculate items count
  const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div
      id="receipt-content"
      className="bg-white mx-auto"
      style={{ 
        width: '80mm',
        fontFamily: 'monospace',
        fontSize: '13px',
        padding: '8mm 5mm',
        lineHeight: '1.4',
      }}
    >
      {/* Header - Company Info */}
      <div className="text-center mb-2">
        <h1 className="font-bold mb-1" style={{ fontSize: '20px' }}>Orderium</h1>
        <div style={{ fontSize: '12px' }}>
          <p className="mb-0">Main Street 1</p>
          <p className="mb-0">20000 Casablanca</p>
          <p className="mb-0">Tax No.: 0123456789</p>
          <p className="mb-0">+212 5XX-XXXXXX</p>
          <p className="mb-0">office@orderium.ma</p>
        </div>
      </div>

      {/* Receipt Number */}
      <div className="mt-3 mb-2" style={{ fontSize: '13px' }}>
        <p className="font-bold mb-1">
          {isArabic ? 'رقم الوصل:' : 'Receipt No.:'} {orderNumber}
        </p>
        <p className="mb-0">
          {orderDate.toLocaleString(isArabic ? 'ar-MA' : 'fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </p>
        <p className="mb-0">{isArabic ? 'العميل:' : 'User:'} {customerName}</p>
        <p className="mb-0">{isArabic ? 'الهاتف:' : 'Phone:'} {customerPhone}</p>
      </div>

      {/* Separator */}
      <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }}></div>

      {/* Items */}
      <div className="mb-2">
        {items.map((item, index) => {
          const translation = productTranslations[item.product.Id];
          const displayName =
            language === 'fr' && translation ? translation.name : item.product.Name;
          const itemTotal = item.product.Price * item.quantity;

          return (
            <div key={index} className="mb-2">
              <div className="mb-0">{displayName}</div>
              <div className="flex justify-between">
                <span>
                  {item.quantity}x {formatCurrency(item.product.Price, language)}
                </span>
                <span>{formatCurrency(itemTotal, language)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Separator */}
      <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }}></div>

      {/* Items Count */}
      <div className="mb-2">
        <p className="mb-0">{isArabic ? 'عدد المنتجات:' : 'Items count:'} {itemsCount}</p>
      </div>

      {/* Subtotal */}
      <div className="flex justify-between mb-1">
        <span>{isArabic ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
        <span>{formatCurrency(subtotal, language)}</span>
      </div>

      {/* Total */}
      <div className="flex justify-between mb-2 font-bold" style={{ fontSize: '15px' }}>
        <span>{isArabic ? 'المجموع:' : 'TOTAL:'}</span>
        <span>{formatCurrency(subtotal, language)}</span>
      </div>

      {/* Payment Method */}
      <div className="flex justify-between mb-1">
        <span>{isArabic ? 'نقداً:' : 'Cash:'}</span>
        <span>{formatCurrency(subtotal, language)}</span>
      </div>

      {/* Paid Amount */}
      <div className="flex justify-between mb-1">
        <span>{isArabic ? 'المبلغ المدفوع:' : 'Paid amount:'}</span>
        <span>{formatCurrency(subtotal, language)}</span>
      </div>

      {/* Separator */}
      <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }}></div>

      {/* Change */}
      <div className="flex justify-between mb-3">
        <span>{isArabic ? 'الباقي:' : 'Change:'}</span>
        <span>0,00</span>
      </div>

      {/* Barcode */}
      <div className="text-center mt-4">
        <svg
          viewBox="0 0 200 60"
          style={{ width: '100%', height: '50px' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Simple barcode representation */}
          <rect x="5" y="0" width="2" height="40" fill="black" />
          <rect x="10" y="0" width="1" height="40" fill="black" />
          <rect x="13" y="0" width="3" height="40" fill="black" />
          <rect x="18" y="0" width="1" height="40" fill="black" />
          <rect x="22" y="0" width="2" height="40" fill="black" />
          <rect x="27" y="0" width="3" height="40" fill="black" />
          <rect x="32" y="0" width="1" height="40" fill="black" />
          <rect x="36" y="0" width="2" height="40" fill="black" />
          <rect x="40" y="0" width="1" height="40" fill="black" />
          <rect x="43" y="0" width="3" height="40" fill="black" />
          <rect x="48" y="0" width="2" height="40" fill="black" />
          <rect x="52" y="0" width="1" height="40" fill="black" />
          <rect x="56" y="0" width="3" height="40" fill="black" />
          <rect x="61" y="0" width="1" height="40" fill="black" />
          <rect x="65" y="0" width="2" height="40" fill="black" />
          <rect x="69" y="0" width="3" height="40" fill="black" />
          <rect x="74" y="0" width="1" height="40" fill="black" />
          <rect x="78" y="0" width="2" height="40" fill="black" />
          <rect x="82" y="0" width="1" height="40" fill="black" />
          <rect x="86" y="0" width="3" height="40" fill="black" />
          <rect x="91" y="0" width="2" height="40" fill="black" />
          <rect x="95" y="0" width="1" height="40" fill="black" />
          <rect x="99" y="0" width="3" height="40" fill="black" />
          <rect x="104" y="0" width="1" height="40" fill="black" />
          <rect x="108" y="0" width="2" height="40" fill="black" />
          <rect x="112" y="0" width="3" height="40" fill="black" />
          <rect x="117" y="0" width="1" height="40" fill="black" />
          <rect x="121" y="0" width="2" height="40" fill="black" />
          <rect x="125" y="0" width="1" height="40" fill="black" />
          <rect x="129" y="0" width="3" height="40" fill="black" />
          <rect x="134" y="0" width="2" height="40" fill="black" />
          <rect x="138" y="0" width="1" height="40" fill="black" />
          <rect x="142" y="0" width="3" height="40" fill="black" />
          <rect x="147" y="0" width="1" height="40" fill="black" />
          <rect x="151" y="0" width="2" height="40" fill="black" />
          <rect x="155" y="0" width="3" height="40" fill="black" />
          <rect x="160" y="0" width="1" height="40" fill="black" />
          <rect x="164" y="0" width="2" height="40" fill="black" />
          <rect x="168" y="0" width="1" height="40" fill="black" />
          <rect x="172" y="0" width="3" height="40" fill="black" />
          <rect x="177" y="0" width="2" height="40" fill="black" />
          <rect x="181" y="0" width="1" height="40" fill="black" />
          <rect x="185" y="0" width="3" height="40" fill="black" />
          <rect x="190" y="0" width="1" height="40" fill="black" />
          <rect x="194" y="0" width="2" height="40" fill="black" />
          
          <text x="100" y="55" textAnchor="middle" fontSize="10" fill="black">
            18-200-{orderNumber}
          </text>
        </svg>
      </div>
    </div>
  );
};
