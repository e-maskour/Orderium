import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency } from '@/lib/i18n';
import { CartItem } from '@/context/CartContext';

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
  const { language, t, dir } = useLanguage();
  const isArabic = language === 'ar';

  // Calculate items count
  const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div
      id="receipt-content"
      dir={dir}
      style={{ 
        width: '80mm',
        fontFamily: isArabic ? 'Arial, "Helvetica Neue", sans-serif' : 'monospace',
        fontSize: '13px',
        padding: '8mm 5mm',
        lineHeight: '1.4',
        backgroundColor: 'white',
        margin: '0 auto',
        minHeight: 'auto',
        height: 'auto',
        maxHeight: 'none',
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
          {t('receiptNo')} {orderNumber}
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
        <p className="mb-0">{t('user')} {customerName}</p>
        <p className="mb-0">{t('phone')} {customerPhone}</p>
      </div>

      {/* Separator */}
      <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }}></div>

      {/* Items */}
      <div className="mb-2">
        {items.map((item, index) => {
          const displayName = item.product.Name;
          const itemTotal = item.product.Price * item.quantity;

          return (
            <div key={index} className="mb-2">
              <div className="mb-0" style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}>{displayName}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', direction: dir }}>
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
        <p style={{ marginBottom: 0, textAlign: dir === 'rtl' ? 'right' : 'left' }}>{t('itemsCount')} {itemsCount}</p>
      </div>

      {/* Subtotal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', flexDirection: dir === 'rtl' ? 'row-reverse' : 'row' }}>
        <span>{t('subtotal')}</span>
        <span>{formatCurrency(subtotal, language)}</span>
      </div>

      {/* Total */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: 'bold', fontSize: '15px', flexDirection: dir === 'rtl' ? 'row-reverse' : 'row' }}>
        <span>{t('total').toUpperCase()}</span>
        <span>{formatCurrency(subtotal, language)}</span>
      </div>

      {/* Separator */}
      <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }}></div>

      {/* Barcode */}
      <div style={{ textAlign: 'center', marginTop: '16px' }}>
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
            {orderNumber}
          </text>
        </svg>
      </div>
    </div>
  );
};
