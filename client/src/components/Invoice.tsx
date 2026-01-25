import { formatCurrency } from '@/lib/i18n';
import { useLanguage } from '@/context/LanguageContext';
import { CartItem } from '@/context/CartContext';

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
  const totalTVA = subtotal * 0.2;
  const totalTTC = subtotal * 1.2;

  // Pagination settings
  const itemsPerPage = 12; // Reduced to account for headers/footers
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));

  // Split items into pages
  const pages = [];
  for (let i = 0; i < totalPages; i++) {
    const startIndex = i * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, items.length);
    pages.push({
      pageNumber: i + 1,
      items: items.slice(startIndex, endIndex),
      isLast: i === totalPages - 1
    });
  }

  const renderInvoiceHeader = (pageNum: number) => (
    <div style={{ 
      padding: '5mm 6mm 3mm 6mm',
      backgroundColor: '#ffffff',
      borderBottom: pageNum > 1 ? '0.5pt solid #DDDDDD' : 'none'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        paddingBottom: pageNum === 1 ? '1mm' : '2mm',
        borderBottom: pageNum === 1 ? '1.5pt solid #000000' : 'none'
      }}>
        {/* Company Info - Left */}
        <div style={{ width: '70mm' }}>
          <div style={{ 
            fontSize: '14pt', 
            fontWeight: 'bold',
            marginBottom: '1mm',
            color: '#000000',
            letterSpacing: '0.3pt'
          }}>
            ORDERIUM
          </div>
          {pageNum === 1 && (
            <div style={{ fontSize: '8pt', lineHeight: '1.4', color: '#222222' }}>
              <div>123 Avenue Mohammed V</div>
              <div>Casablanca 20000, Maroc</div>
              <div style={{ marginTop: '1.5mm' }}>Tél: +212 5XX-XXXXXX</div>
              <div>Email: contact@orderium.ma</div>
            </div>
          )}
        </div>

        {/* Document Title - Right */}
        <div style={{ textAlign: 'right', paddingTop: '1mm' }}>
          <div style={{ 
            fontSize: '15pt', 
            fontWeight: 'bold',
            color: '#000000',
            marginBottom: '2mm'
          }}>
            FACTURE
          </div>
          <div style={{ fontSize: '8pt', color: '#666666' }}>
            <div style={{ marginBottom: '1mm' }}>N° {orderNumber}</div>
            <div>Date: {orderDate.toLocaleDateString('fr-FR')}</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInvoiceFooter = (pageNum: number) => (
    <div style={{ 
      borderTop: '0.5pt solid #DDDDDD',
      padding: '2.5mm 8mm 5mm 8mm',
      fontSize: '6.5pt',
      color: '#777777',
      lineHeight: '1.3',
      backgroundColor: '#ffffff',
      marginTop: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ maxWidth: '100mm' }}>
          <div style={{ fontWeight: '600', color: '#555555' }}>
            ORDERIUM - Système de gestion des commandes
          </div>
          <div style={{ marginTop: '0.5mm' }}>
            RC: XXXXXXX | IF: XXXXXXXX | ICE: XXXXXXXXXXXXXXX
          </div>
        </div>
        <div style={{ 
          textAlign: 'right',
          fontSize: '6pt',
          color: '#999999'
        }}>
          Page {pageNum}/{totalPages}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>
        {`
          @media print {
            .page-break {
              page-break-before: always;
            }
            .no-break {
              page-break-inside: avoid;
            }
          }
        `}
      </style>
      
      <div
        id="invoice-content"
        style={{ 
          fontFamily: '"DejaVu Sans", "Helvetica", "Arial", sans-serif',
          backgroundColor: '#ffffff',
          width: '148mm',
          margin: '0',
          padding: '0',
          fontSize: '9pt',
          color: '#000000',
          lineHeight: '1.3',
          boxSizing: 'border-box',
        }}
      >
        {pages.map((page, pageIndex) => (
          <div 
            key={pageIndex}
            className={pageIndex > 0 ? 'page-break' : ''}
            style={{ 
              minHeight: '210mm',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff'
            }}
          >
            {/* Header */}
            {renderInvoiceHeader(page.pageNumber)}

            {/* Customer Info - Only on first page */}
            {page.pageNumber === 1 && (
              <div style={{ padding: '4mm 6mm' }}>
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '4mm'
                }}>
                  {/* Bill To */}
                  <div style={{ width: '45%' }}>
                    <div style={{ 
                      fontSize: '8pt', 
                      fontWeight: 'bold', 
                      textTransform: 'uppercase',
                      marginBottom: '2mm',
                      color: '#666666'
                    }}>
                      Facturé à
                    </div>
                    <div style={{ 
                      fontSize: '10pt',
                      lineHeight: '1.4',
                      border: '1px solid #DDDDDD',
                      padding: '3mm',
                      backgroundColor: '#FAFAFA'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '1mm' }}>
                        {customerName}
                      </div>
                      <div style={{ fontSize: '8pt', color: '#666666' }}>
                        Tél: {customerPhone}
                      </div>
                      {customerAddress && (
                        <div style={{ fontSize: '8pt', color: '#666666', marginTop: '1mm' }}>
                          {customerAddress}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Invoice Details */}
                  <div style={{ width: '45%' }}>
                    <div style={{ 
                      fontSize: '8pt', 
                      fontWeight: 'bold', 
                      textTransform: 'uppercase',
                      marginBottom: '2mm',
                      color: '#666666'
                    }}>
                      Détails de la facture
                    </div>
                    <div style={{ 
                      fontSize: '9pt',
                      lineHeight: '1.6',
                      border: '1px solid #DDDDDD',
                      padding: '3mm',
                      backgroundColor: '#FAFAFA'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#666666' }}>Date:</span>
                        <span style={{ fontWeight: '600' }}>{orderDate.toLocaleDateString('fr-FR')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#666666' }}>Commande N°:</span>
                        <span style={{ fontWeight: '600' }}>{orderNumber}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#666666' }}>Statut:</span>
                        <span style={{ fontWeight: '600', color: '#10B981' }}>Confirmée</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Table Header - Repeat on each page */}
            <div style={{ padding: '0 6mm', flex: '1' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                marginBottom: '3mm'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8F9FA' }}>
                    <th style={{ 
                      border: '0.75pt solid #CCCCCC',
                      padding: '2mm 1.5mm',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      width: '8%',
                      color: '#000000'
                    }}>
                      Code
                    </th>
                    <th style={{ 
                      border: '0.75pt solid #CCCCCC',
                      padding: '2mm 2mm',
                      textAlign: 'left',
                      fontWeight: 'bold',
                      width: '40%',
                      color: '#000000'
                    }}>
                      Description
                    </th>
                    <th style={{ 
                      border: '0.75pt solid #CCCCCC',
                      padding: '2mm 1.5mm',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      width: '9%',
                      color: '#000000'
                    }}>
                      TVA
                    </th>
                    <th style={{ 
                      border: '0.75pt solid #CCCCCC',
                      padding: '2mm 2mm',
                      textAlign: 'right',
                      fontWeight: 'bold',
                      width: '15%',
                      color: '#000000'
                    }}>
                      P.U. HT
                    </th>
                    <th style={{ 
                      border: '0.75pt solid #CCCCCC',
                      padding: '2mm 1.5mm',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      width: '10%',
                      color: '#000000'
                    }}>
                      Qté
                    </th>
                    <th style={{ 
                      border: '0.75pt solid #CCCCCC',
                      padding: '2mm 2mm',
                      textAlign: 'right',
                      fontWeight: 'bold',
                      width: '18%',
                      color: '#000000'
                    }}>
                      Total HT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {page.items.map((item, index) => {
                    const itemTotal = item.product.price * item.quantity;
                    return (
                      <tr key={index} className="no-break" style={{ backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                        <td style={{ 
                          border: '1px solid #DDDDDD',
                          padding: '2mm 1.5mm',
                          textAlign: 'center',
                          color: '#777777',
                          fontSize: '7pt',
                          verticalAlign: 'top'
                        }}>
                          {String(item.product.id).padStart(4, '0')}
                        </td>
                        <td style={{ 
                          border: '1px solid #DDDDDD',
                          padding: '2mm 2mm',
                          textAlign: 'left',
                          lineHeight: '1.3',
                          verticalAlign: 'top',
                          color: '#000000'
                        }}>
                          <div style={{ fontWeight: '600', marginBottom: '0.5mm' }}>
                            {item.product.name}
                          </div>
                          {item.product.description && (
                            <div style={{ fontSize: '7pt', color: '#666666', lineHeight: '1.2' }}>
                              {item.product.description}
                            </div>
                          )}
                        </td>
                        <td style={{ 
                          border: '1px solid #DDDDDD',
                          padding: '2mm 1.5mm',
                          textAlign: 'center',
                          color: '#000000',
                          verticalAlign: 'top'
                        }}>
                          20%
                        </td>
                        <td style={{ 
                          border: '1px solid #DDDDDD',
                          padding: '2mm 2mm',
                          textAlign: 'right',
                          color: '#000000',
                          fontFamily: 'monospace',
                          verticalAlign: 'top'
                        }}>
                          {item.product.price.toFixed(2)}
                        </td>
                        <td style={{ 
                          border: '1px solid #DDDDDD',
                          padding: '2mm 1.5mm',
                          textAlign: 'center',
                          fontWeight: 'bold',
                          color: '#000000',
                          verticalAlign: 'top'
                        }}>
                          {item.quantity}
                        </td>
                        <td style={{ 
                          border: '1px solid #DDDDDD',
                          padding: '2mm 2mm',
                          textAlign: 'right',
                          fontWeight: 'bold',
                          color: '#000000',
                          fontFamily: 'monospace',
                          verticalAlign: 'top'
                        }}>
                          {itemTotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totals - Only on last page */}
              {page.isLast && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'flex-end',
                  marginTop: '4mm',
                  marginBottom: '4mm'
                }}>
                  <div style={{ width: '50%' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ 
                            padding: '1.5mm 3mm',
                            textAlign: 'right',
                            fontWeight: 'bold',
                            backgroundColor: '#F8F9FA',
                            border: '1px solid #DDDDDD'
                          }}>
                            Sous-total HT:
                          </td>
                          <td style={{ 
                            padding: '1.5mm 3mm',
                            textAlign: 'right',
                            fontFamily: 'monospace',
                            fontWeight: 'bold',
                            backgroundColor: '#F8F9FA',
                            border: '1px solid #DDDDDD'
                          }}>
                            {subtotal.toFixed(2)} MAD
                          </td>
                        </tr>
                        <tr>
                          <td style={{ 
                            padding: '1.5mm 3mm',
                            textAlign: 'right',
                            fontWeight: 'bold',
                            backgroundColor: '#F8F9FA',
                            border: '1px solid #DDDDDD'
                          }}>
                            TVA (20%):
                          </td>
                          <td style={{ 
                            padding: '1.5mm 3mm',
                            textAlign: 'right',
                            fontFamily: 'monospace',
                            fontWeight: 'bold',
                            backgroundColor: '#F8F9FA',
                            border: '1px solid #DDDDDD'
                          }}>
                            {totalTVA.toFixed(2)} MAD
                          </td>
                        </tr>
                        <tr>
                          <td style={{ 
                            padding: '2mm 3mm',
                            textAlign: 'right',
                            fontWeight: 'bold',
                            fontSize: '10pt',
                            backgroundColor: '#E5E7EB',
                            border: '1.5pt solid #9CA3AF',
                            color: '#000000'
                          }}>
                            Total TTC:
                          </td>
                          <td style={{ 
                            padding: '2mm 3mm',
                            textAlign: 'right',
                            fontFamily: 'monospace',
                            fontWeight: 'bold',
                            fontSize: '10pt',
                            backgroundColor: '#E5E7EB',
                            border: '1.5pt solid #9CA3AF',
                            color: '#000000'
                          }}>
                            {totalTTC.toFixed(2)} MAD
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Terms and Conditions */}
                    <div style={{ 
                      marginTop: '4mm',
                      fontSize: '7pt',
                      color: '#666666',
                      lineHeight: '1.4',
                      border: '1px solid #E5E7EB',
                      padding: '2mm',
                      backgroundColor: '#FAFAFA'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '1mm' }}>
                        Conditions de paiement:
                      </div>
                      <div>
                        • Paiement à la livraison<br />
                        • Cette facture est générée automatiquement<br />
                        • Pour toute réclamation, contactez-nous sous 48h
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {renderInvoiceFooter(page.pageNumber)}
          </div>
        ))}
      </div>
    </>
  );
};
