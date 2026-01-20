import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productsService } from '../modules/products';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { Package, Save, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    price: '',
    cost: '',
    minPrice: '',
    saleTax: '20',
    purchaseTax: '20',
    warehouseId: '',
    isService: false,
    isEnabled: true,
    isPriceChangeAllowed: true,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => productsService.createProduct(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
      // The result is { product: Product }
      navigate(`/products/${result.product.id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create product');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    if (!formData.price || parseFloat(formData.price) < 0) {
      toast.error('Valid sale price is required');
      return;
    }

    if (!formData.cost || parseFloat(formData.cost) < 0) {
      toast.error('Valid cost price is required');
      return;
    }

    createMutation.mutate({
      name: formData.name,
      code: formData.code || null,
      description: formData.description || null,
      price: parseFloat(formData.price),
      cost: parseFloat(formData.cost),
      minPrice: parseFloat(formData.minPrice || '0'),
      saleTax: parseFloat(formData.saleTax || '0'),
      purchaseTax: parseFloat(formData.purchaseTax || '0'),
      warehouseId: formData.warehouseId ? parseInt(formData.warehouseId) : null,
      isService: formData.isService,
      isEnabled: formData.isEnabled,
      isPriceChangeAllowed: formData.isPriceChangeAllowed,
    });
  };

  return (
    <AdminLayout>
      <PageHeader
        icon={Package}
        title="Create New Product"
        subtitle="Add a new product to your inventory"
        actions={
          <button
            onClick={() => navigate('/products')}
            className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Products
          </button>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
          {/* Basic Info Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Product Code
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  placeholder="Optional product code"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                placeholder="Enter product description"
              />
            </div>
          </div>

          {/* Pricing Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Tarification</h3>
            
            {/* Sale Price Section */}
            <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200">
              <h4 className="font-medium text-slate-900 mb-3">Prix de vente</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Prix de vente <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                      placeholder="0.00"
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-slate-500 text-sm">DH par Unité(s)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Taxes de vente
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.saleTax}
                      onChange={(e) => setFormData({ ...formData, saleTax: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                      placeholder="20"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-500">%</span>
                  </div>
                  {parseFloat(formData.saleTax) > 0 && formData.price && (
                    <p className="mt-1 text-sm text-slate-600">
                      = {(parseFloat(formData.price) * (1 + parseFloat(formData.saleTax) / 100)).toFixed(2)} DH toutes taxes comprises
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Cost Price Section */}
            <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200">
              <h4 className="font-medium text-slate-900 mb-3">Coût</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Coût <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                      placeholder="0.00"
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-slate-500 text-sm">DH par Unité(s)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Taxes d'achat
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.purchaseTax}
                      onChange={(e) => setFormData({ ...formData, purchaseTax: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                      placeholder="20"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-500">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Pricing Fields */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Prix minimum
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.minPrice}
                    onChange={(e) => setFormData({ ...formData, minPrice: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-500">DH</span>
                </div>
              </div>
            </div>

            {/* Margin Preview */}
            {formData.price && formData.cost && (
              <div className="mt-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 mb-3">Analyse de marge</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">Montant de la marge</p>
                    <p className="text-lg font-bold text-slate-900">
                      {(parseFloat(formData.price) - parseFloat(formData.cost)).toFixed(2)} DH
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Marge %</p>
                    <p className="text-lg font-bold text-green-600">
                      {parseFloat(formData.cost) > 0
                        ? (((parseFloat(formData.price) - parseFloat(formData.cost)) /
                            parseFloat(formData.cost)) *
                            100
                          ).toFixed(2)
                        : '0.00'}
                      %
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Markup %</p>
                    <p className="text-lg font-bold text-blue-600">
                      {parseFloat(formData.price) > 0
                        ? (((parseFloat(formData.price) - parseFloat(formData.cost)) /
                            parseFloat(formData.price)) *
                            100
                          ).toFixed(2)
                        : '0.00'}
                      %
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Product Options Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Options</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.isService}
                  onChange={(e) => setFormData({ ...formData, isService: e.target.checked })}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-700">Is Service</span>
                  <p className="text-xs text-slate-500">
                    Check if this is a service (no physical inventory)
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.isEnabled}
                  onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-700">Enabled</span>
                  <p className="text-xs text-slate-500">
                    Product is active and available for sale
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.isPriceChangeAllowed}
                  onChange={(e) =>
                    setFormData({ ...formData, isPriceChangeAllowed: e.target.checked })
                  }
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-700">Allow Price Change</span>
                  <p className="text-xs text-slate-500">
                    Users can modify price during order creation
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="px-6 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {createMutation.isPending ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </form>
    </AdminLayout>
  );
}
