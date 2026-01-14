import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { invoiceService } from '../services/api';
import { Customer, CreateInvoiceDTO } from '../types';
import { X, Plus, Trash2, User, Calendar, DollarSign, Percent, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface CreateInvoiceModalProps {
  customers: Customer[];
  onClose: () => void;
  onSuccess: () => void;
  t: (key: string) => string;
}

interface InvoiceItem {
  productId?: number;
  productName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  customers,
  onClose,
  onSuccess,
  t
}) => {
  // Form state
  const [customerId, setCustomerId] = useState<number | undefined>();
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30); // Default 30 days
    return date.toISOString().split('T')[0];
  });
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { productName: '', quantity: 1, unitPrice: 0 }
  ]);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount - discount;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateInvoiceDTO) => invoiceService.create(data),
    onSuccess: () => {
      toast.success(t('invoice.createSuccess'));
      onSuccess();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('invoice.createError'));
    },
  });

  // Handlers
  const handleAddItem = () => {
    setItems([...items, { productName: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleUpdateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setItems(items.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerId) {
      toast.error(t('invoice.customerRequired'));
      return;
    }

    if (items.length === 0 || items.some(item => !item.productName || item.quantity <= 0 || item.unitPrice < 0)) {
      toast.error(t('invoice.validItemsRequired'));
      return;
    }

    const invoiceData: CreateInvoiceDTO = {
      CustomerId: customerId,
      Date: new Date(issueDate),
      DueDate: new Date(dueDate),
      Note: notes || undefined,
      Items: items.filter(item => item.productName && item.quantity > 0).map(item => ({
        ProductId: item.productId || 0, // Default to 0 if no productId
        Description: item.description,
        Quantity: item.quantity,
        UnitPrice: item.unitPrice,
        Discount: discount > 0 ? (discount / items.length) : 0, // Distribute discount evenly
        TaxRate: taxRate,
      }))
    };

    createMutation.mutate(invoiceData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{t('invoice.create')}</h2>
              <p className="text-sm text-slate-500">{t('invoice.createSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col h-[calc(90vh-80px)]">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('customer')} *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={customerId || ''}
                    onChange={(e) => setCustomerId(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">{t('invoice.selectCustomer')}</option>
                    {customers.map((customer) => (
                      <option key={customer.Id} value={customer.Id}>
                        {customer.Name} {customer.Email && `(${customer.Email})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Issue Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('invoice.issueDate')} *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('invoice.dueDate')} *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={issueDate}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Tax Rate */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('invoice.taxRate')} (%)
                </label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">{t('invoice.items')}</h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  {t('invoice.addItem')}
                </button>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-slate-50 rounded-lg">
                    {/* Product Name */}
                    <div className="md:col-span-4">
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {t('product')} *
                      </label>
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => handleUpdateItem(index, 'productName', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder={t('invoice.productName')}
                        required
                      />
                    </div>

                    {/* Description */}
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {t('description')}
                      </label>
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder={t('invoice.itemDescription')}
                      />
                    </div>

                    {/* Quantity */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {t('quantity')} *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {t('price')} *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                      />
                    </div>

                    {/* Remove Button */}
                    <div className="md:col-span-1 flex items-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        disabled={items.length === 1}
                        className="w-full p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Discount */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('invoice.discount')}
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={subtotal}
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Totals Summary */}
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{t('invoice.subtotal')}</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  
                  {taxRate > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{t('invoice.tax')} ({taxRate}%)</span>
                      <span className="font-medium">${taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{t('invoice.discount')}</span>
                      <span className="font-medium">-${discount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <hr className="border-slate-300" />
                  
                  <div className="flex justify-between font-semibold text-lg">
                    <span>{t('invoice.total')}</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('invoice.notes')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('invoice.notesPlaceholder')}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 p-6">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                disabled={createMutation.isPending}
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || total <= 0}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
              >
                {createMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {t('creating')}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    {t('invoice.create')}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};