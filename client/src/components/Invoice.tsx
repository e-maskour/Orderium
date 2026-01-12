import { formatCurrency } from '@/lib/i18n';
import { useLanguage } from '@/context/LanguageContext';
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
  const { language, t, dir } = useLanguage();
  const isArabic = language === 'ar';

  return (
    <div
      id="invoice-content"
      dir={dir}
      style={{ 
        fontFamily: isArabic ? 'Arial, "Helvetica Neue", sans-serif' : 'Arial, sans-serif',
        backgroundColor: 'white',
        padding: '30px 16px',
        maxWidth: '148mm',
        minHeight: '210mm',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        {/* Title */}
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 'bold', 
          marginBottom: '24px',
          textAlign: 'center',
          color: '#1f2937',
          letterSpacing: '0.5px'
        }}>
          BON DE LIVRAISON
        </h1>

        {/* Info Section */}
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderTop: '3px solid #000000',
          borderBottom: '1px solid #000000',
          paddingTop: '20px',
          paddingBottom: '20px',
          marginBottom: '8px'
        }}>
          {/* Bill To Section - Left */}
          <div style={{ textAlign: 'left' }}>
            <p style={{ 
              fontSize: '11px', 
              fontWeight: 'bold', 
              marginBottom: '8px',
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {t('billTo')}
            </p>
            <p style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '4px', color: '#1f2937' }}>
              {customerName}
            </p>
            {customerPhone && (
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '0' }}>{customerPhone}</p>
            )}
          </div>

          {/* Invoice Details - Right */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ marginBottom: '10px' }}>
              <p style={{ 
                fontSize: '11px', 
                fontWeight: 'bold', 
                marginBottom: '4px',
                color: '#6b7280',
                textTransform: 'uppercase'
              }}>
                {t('invoiceNo')}
              </p>
              <p style={{ fontSize: '15px', fontWeight: 'bold', color: '#000000', marginBottom: '0' }}>
                {orderNumber}
              </p>
            </div>
            <div>
              <p style={{ 
                fontSize: '11px', 
                fontWeight: 'bold', 
                marginBottom: '4px',
                color: '#6b7280',
                textTransform: 'uppercase'
              }}>
                {t('date')}
              </p>
              <p style={{ fontSize: '13px', color: '#1f2937', marginBottom: '0' }}>
                {orderDate.toLocaleDateString(isArabic ? 'ar-MA' : 'fr-FR', {
                  day: 'numeric',
                  month: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div style={{ marginBottom: '40px' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          border: '2px solid #000000'
        }}>
          <thead>
            <tr style={{ 
              backgroundColor: '#ffffff',
              borderBottom: '2px solid #000000'
            }}>
              <th style={{ 
                padding: '4px',
                fontSize: '12px', 
                fontWeight: 'bold', 
                width: '5%',
                textAlign: 'center',
                verticalAlign: 'middle',
                borderRight: '1px solid #d1d5db',
                color: '#000000',
                lineHeight: '1'
              }}>
                {t('no')}
              </th>
              <th style={{ 
                padding: '4px 8px',
                fontSize: '12px', 
                fontWeight: 'bold', 
                width: '40%',
                textAlign: 'center',
                verticalAlign: 'middle',
                borderRight: '1px solid #d1d5db',
                color: '#000000',
                lineHeight: '1'
              }}>
                {t('item')}
              </th>
              <th style={{ 
                padding: '4px',
                fontSize: '12px', 
                fontWeight: 'bold', 
                width: '10%',
                textAlign: 'center',
                verticalAlign: 'middle',
                borderRight: '1px solid #d1d5db',
                color: '#000000',
                lineHeight: '1'
              }}>
                {t('quantity')}
              </th>
              <th style={{ 
                padding: '4px',
                fontSize: '12px', 
                fontWeight: 'bold', 
                width: '15%',
                textAlign: 'center',
                verticalAlign: 'middle',
                borderRight: '1px solid #d1d5db',
                color: '#000000',
                lineHeight: '1'
              }}>
                {t('unitPrice')}
              </th>
              <th style={{ 
                padding: '4px',
                fontSize: '12px', 
                fontWeight: 'bold', 
                width: '12%',
                textAlign: 'center',
                verticalAlign: 'middle',
                borderRight: '1px solid #d1d5db',
                color: '#000000',
                lineHeight: '1'
              }}>
                {t('discount')}
              </th>
              <th style={{ 
                padding: '4px',
                fontSize: '12px', 
                fontWeight: 'bold', 
                width: '18%',
                textAlign: 'center',
                verticalAlign: 'middle',
                color: '#000000',
                lineHeight: '1'
              }}>
                {t('total')}
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
                  <td style={{ 
                    padding: '4px', 
                    fontSize: '12px', 
                    border: '1px solid #d1d5db',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    color: '#000000',
                    lineHeight: '1'
                  }}>
                    {index + 1}
                  </td>
                  <td style={{ 
                    padding: '4px 8px', 
                    fontSize: '13px', 
                    border: '1px solid #d1d5db',
                    textAlign: 'left',
                    verticalAlign: 'middle',
                    color: '#000000',
                    lineHeight: '1'
                  }}>
                    {displayName}
                  </td>
                  <td style={{ 
                    padding: '4px', 
                    fontSize: '12px', 
                    border: '1px solid #d1d5db',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    color: '#000000',
                    lineHeight: '1'
                  }}>
                    {item.quantity}
                  </td>
                  <td style={{ 
                    padding: '4px', 
                    fontSize: '12px', 
                    border: '1px solid #d1d5db',
                    textAlign: 'right',
                    verticalAlign: 'middle',
                    color: '#000000',
                    lineHeight: '1'
                  }}>
                    {formatCurrency(item.product.Price, language)}
                  </td>
                  <td style={{ 
                    padding: '4px', 
                    fontSize: '11px', 
                    border: '1px solid #d1d5db',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    color: '#6b7280',
                    lineHeight: '1'
                  }}>
                    0.00%
                  </td>
                  <td style={{ 
                    padding: '4px', 
                    fontSize: '13px', 
                    border: '1px solid #d1d5db',
                    textAlign: 'right',
                    verticalAlign: 'middle',
                    color: '#000000',
                    backgroundColor: '#f9fafb',
                    lineHeight: '1'
                  }}>
                    {formatCurrency(itemTotal, language)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end',
        marginTop: '30px'
      }}>
        <div style={{ minWidth: '280px' }}>
          {/* Total */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 'bold',
            backgroundColor: '#f3f4f6',
            color: '#000000',
            border: '2px solid #000000',
            borderRadius: '4px'
          }}>
            <span style={{ letterSpacing: '0.5px' }}>{t('total')}</span>
            <span style={{ fontSize: '14px' }}>{formatCurrency(subtotal, language)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};