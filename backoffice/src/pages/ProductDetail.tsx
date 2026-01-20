import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsService } from '../modules/products';
import { warehousesService } from '../modules/warehouses';
import { stockService } from '../modules/stock';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { Package, ArrowLeft, Save, Plus, ArrowRightLeft, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'info' | 'stock' | 'pricing'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [showStockCorrection, setShowStockCorrection] = useState(false);
  const [showStockTransfer, setShowStockTransfer] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    price: '',
    cost: '',
    minPrice: '',
    saleTax: '',
    purchaseTax: '',
    warehouseId: '',
    isService: false,
    isEnabled: true,
    isPriceChangeAllowed: true,
  });

  const [stockCorrectionData, setStockCorrectionData] = useState({
    warehouseId: '',
    quantity: '',
    operation: 'add' as 'add' | 'remove',
    unitPrice: '',
    notes: '',
  });

  const [stockTransferData, setStockTransferData] = useState({
    sourceWarehouseId: '',
    destWarehouseId: '',
    quantity: '',
    notes: '',
  });

  // Fetch product
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsService.getProduct(Number(id)),
    enabled: !!id,
  });

  // Fetch warehouses
  const { data: warehouses = [], isLoading: warehousesLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesService.getAll(),
  });

  // Fetch stock quants for this product
  const { data: stockQuants = [] } = useQuery({
    queryKey: ['stock-quants', id],
    queryFn: () => stockService.getProductStock(Number(id)),
    enabled: !!id,
  });

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => productsService.updateProduct(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsEditing(false);
      toast.success('Product updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update product');
    },
  });

  // Stock correction mutation
  const stockCorrectionMutation = useMutation({
    mutationFn: async (data: any) => {
      const movement = await stockService.createMovement({
        movementType: 'adjustment',
        productId: Number(id),
        destWarehouseId: data.operation === 'add' ? Number(data.warehouseId) : undefined,
        sourceWarehouseId: data.operation === 'remove' ? Number(data.warehouseId) : undefined,
        quantity: Number(data.quantity),
        notes: data.notes || `Stock correction for product ${product?.code || id}`,
      });
      await stockService.validateMovement({ movementId: movement.id });
      return movement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-quants', id] });
      setShowStockCorrection(false);
      setStockCorrectionData({
        warehouseId: '',
        quantity: '',
        operation: 'add',
        unitPrice: '',
        notes: '',
      });
      toast.success('Stock corrected successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to correct stock');
    },
  });

  // Stock transfer mutation
  const stockTransferMutation = useMutation({
    mutationFn: (data: any) => stockService.internalTransfer({
      productId: Number(id),
      sourceWarehouseId: Number(data.sourceWarehouseId),
      destWarehouseId: Number(data.destWarehouseId),
      quantity: Number(data.quantity),
      notes: data.notes || `Stock transfer for product ${product?.code || id}`,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-quants', id] });
      setShowStockTransfer(false);
      setStockTransferData({
        sourceWarehouseId: '',
        destWarehouseId: '',
        quantity: '',
        notes: '',
      });
      toast.success('Stock transferred successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to transfer stock');
    },
  });

  // Initialize form when product loads
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        code: product.code || '',
        description: product.description || '',
        price: product.price.toString(),
        cost: product.cost.toString(),
        minPrice: product.minPrice.toString(),
        saleTax: product.saleTax?.toString() || '0',
        purchaseTax: product.purchaseTax?.toString() || '0',
        warehouseId: product.warehouseId?.toString() || '',
        isService: product.isService,
        isEnabled: product.isEnabled,
        isPriceChangeAllowed: product.isPriceChangeAllowed,
      });
    }
  }, [product]);

  const handleSave = () => {
    updateMutation.mutate({
      name: formData.name,
      code: formData.code || null,
      description: formData.description || null,
      price: parseFloat(formData.price),
      cost: parseFloat(formData.cost),
      minPrice: parseFloat(formData.minPrice),
      saleTax: parseFloat(formData.saleTax),
      purchaseTax: parseFloat(formData.purchaseTax),
      warehouseId: formData.warehouseId ? parseInt(formData.warehouseId) : null,
      isService: formData.isService,
      isEnabled: formData.isEnabled,
      isPriceChangeAllowed: formData.isPriceChangeAllowed,
    });
  };

  const handleStockCorrection = () => {
    stockCorrectionMutation.mutate(stockCorrectionData);
  };

  const handleStockTransfer = () => {
    stockTransferMutation.mutate(stockTransferData);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!product) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-slate-500">Product not found</p>
        </div>
      </AdminLayout>
    );
  }

  const totalStock = Number(stockQuants.reduce((sum, sq) => sum + sq.quantity, 0)).toFixed(2);

  return (
    <AdminLayout>
      {/* Compact Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/products')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{product.name}</h1>
              <p className="text-sm text-slate-500">{product.code || 'No code'}</p>
            </div>
          </div>
          {activeTab === 'info' && (
            <div className="flex gap-2">
              {isEditing ? (
                <button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="px-3 py-1.5 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 transition-all flex items-center gap-1.5"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Compact Tabs */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="flex border-b border-slate-200 px-4">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === 'info'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Information
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === 'stock'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stock
            <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
              {totalStock}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === 'pricing'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tarification
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {/* Product Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-4 max-w-4xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 disabled:bg-slate-50 disabled:text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Product Code
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 disabled:bg-slate-50 disabled:text-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={!isEditing}
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 disabled:bg-slate-50 disabled:text-slate-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isService}
                      onChange={(e) => setFormData({ ...formData, isService: e.target.checked })}
                      disabled={!isEditing}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 disabled:opacity-50"
                    />
                    <span className="text-xs font-medium text-slate-700">Is Service</span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isEnabled}
                      onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                      disabled={!isEditing}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 disabled:opacity-50"
                    />
                    <span className="text-xs font-medium text-slate-700">Enabled</span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPriceChangeAllowed}
                      onChange={(e) => setFormData({ ...formData, isPriceChangeAllowed: e.target.checked })}
                      disabled={!isEditing}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 disabled:opacity-50"
                    />
                    <span className="text-xs font-medium text-slate-700">Allow Price Change</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Stock Tab */}
          {activeTab === 'stock' && (
            <div className="space-y-4 max-w-6xl">
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowStockCorrection(true)}
                  className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Correct Stock
                </button>
                <button
                  onClick={() => setShowStockTransfer(true)}
                  className="px-3 py-1.5 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-1.5"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  Transfer Stock
                </button>
              </div>

              {/* Stock by Warehouse */}
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-700">Location</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-slate-700">On Hand</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-slate-700">Reserved</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-slate-700">Available</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-slate-700">Incoming</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-slate-700">Outgoing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stockQuants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-xs text-slate-500">
                          No stock records found
                        </td>
                      </tr>
                    ) : (
                      stockQuants.map((sq) => (
                        <tr key={sq.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-xs text-slate-900">
                            {sq.location?.name || 'Unknown'}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-900 text-right font-medium">
                            {parseFloat(sq.quantity.toString()).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-xs text-amber-600 text-right">
                            {parseFloat(sq.reservedQuantity.toString()).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-xs text-green-600 text-right font-medium">
                            {parseFloat(sq.availableQuantity.toString()).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-xs text-blue-600 text-right">
                            {parseFloat(sq.incomingQuantity.toString()).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-xs text-orange-600 text-right">
                            {parseFloat(sq.outgoingQuantity.toString()).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                    <tr>
                      <td className="px-3 py-2 text-xs font-bold text-slate-900">Total</td>
                      <td className="px-3 py-2 text-xs font-bold text-slate-900 text-right">
                        {Number(stockQuants.reduce((sum, sq) => sum + sq.quantity, 0)).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-xs font-bold text-amber-600 text-right">
                        {Number(stockQuants.reduce((sum, sq) => sum + sq.reservedQuantity, 0)).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-xs font-bold text-green-600 text-right">
                        {Number(stockQuants.reduce((sum, sq) => sum + sq.availableQuantity, 0)).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-xs font-bold text-blue-600 text-right">
                        {Number(stockQuants.reduce((sum, sq) => sum + sq.incomingQuantity, 0)).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-xs font-bold text-orange-600 text-right">
                        {Number(stockQuants.reduce((sum, sq) => sum + sq.outgoingQuantity, 0)).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === 'pricing' && (
            <div className="space-y-4 max-w-4xl">
              {/* Sale Price Section */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Prix de vente</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Prix de vente <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 disabled:bg-slate-50 disabled:text-slate-600"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-500">DH/U</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Taxes de vente
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={formData.saleTax}
                        onChange={(e) => setFormData({ ...formData, saleTax: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 disabled:bg-slate-50 disabled:text-slate-600"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-500">%</span>
                    </div>
                    {parseFloat(formData.saleTax) > 0 && (
                      <p className="mt-1 text-xs text-slate-600">
                        = {(parseFloat(formData.price || '0') * (1 + parseFloat(formData.saleTax || '0') / 100)).toFixed(2)} DH TTC
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Cost Price Section */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Coût</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Coût <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={formData.cost}
                        onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 disabled:bg-slate-50 disabled:text-slate-600"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-500">DH/U</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Taxes d'achat
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={formData.purchaseTax}
                        onChange={(e) => setFormData({ ...formData, purchaseTax: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 disabled:bg-slate-50 disabled:text-slate-600"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-500">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Pricing Fields */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Prix minimum
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.minPrice}
                    onChange={(e) => setFormData({ ...formData, minPrice: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 disabled:bg-slate-50 disabled:text-slate-600"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500">DH</span>
                </div>
              </div>

              {/* Margin Calculation */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Analyse de marge</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Montant de la marge</p>
                    <p className="text-xl font-bold text-slate-900">
                      {(parseFloat(formData.price || '0') - parseFloat(formData.cost || '0')).toFixed(2)} DH
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Marge %</p>
                    <p className="text-xl font-bold text-green-600">
                      {parseFloat(formData.cost) > 0
                        ? (((parseFloat(formData.price || '0') - parseFloat(formData.cost || '0')) /
                            parseFloat(formData.cost || '1')) *
                            100
                          ).toFixed(2)
                        : '0.00'}
                      %
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Markup %</p>
                    <p className="text-xl font-bold text-blue-600">
                      {parseFloat(formData.price) > 0
                        ? (((parseFloat(formData.price || '0') - parseFloat(formData.cost || '0')) /
                            parseFloat(formData.price || '1')) *
                            100
                          ).toFixed(2)
                        : '0.00'}
                      %
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stock Correction Modal */}
      {showStockCorrection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Correction du stock</h2>
              <p className="text-sm text-slate-600 mt-1">
                Pour le produit {product.code || product.name}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {warehouses.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-amber-800 mb-2">
                    <strong>Aucun entrepôt disponible.</strong>
                  </p>
                  <p className="text-xs text-amber-700 mb-3">
                    Vous devez créer au moins un entrepôt pour gérer le stock.
                  </p>
                  <button
                    type="button"
                    onClick={() => window.open('/warehouses', '_blank')}
                    className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
                  >
                    Créer un entrepôt →
                  </button>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Entrepôt <span className="text-red-500">*</span>
                </label>
                <select
                  value={stockCorrectionData.warehouseId}
                  onChange={(e) =>
                    setStockCorrectionData({ ...stockCorrectionData, warehouseId: e.target.value })
                  }
                  disabled={warehouses.length === 0}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {warehousesLoading 
                      ? 'Chargement...' 
                      : warehouses.length === 0 
                        ? 'Aucun entrepôt - Veuillez en créer un' 
                        : 'Sélectionner un entrepôt'}
                  </option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
                {warehouses.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    {warehouses.length} entrepôt(s) disponible(s)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ajouter/Supprimer <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={stockCorrectionData.operation === 'add'}
                      onChange={() =>
                        setStockCorrectionData({ ...stockCorrectionData, operation: 'add' })
                      }
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-sm">Ajouter</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={stockCorrectionData.operation === 'remove'}
                      onChange={() =>
                        setStockCorrectionData({ ...stockCorrectionData, operation: 'remove' })
                      }
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-sm">Supprimer</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre de pièces <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockCorrectionData.quantity}
                  onChange={(e) =>
                    setStockCorrectionData({ ...stockCorrectionData, quantity: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Prix d'achat unitaire
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={stockCorrectionData.unitPrice}
                  onChange={(e) =>
                    setStockCorrectionData({ ...stockCorrectionData, unitPrice: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Libellé du mouvement
                </label>
                <input
                  type="text"
                  value={stockCorrectionData.notes}
                  onChange={(e) =>
                    setStockCorrectionData({ ...stockCorrectionData, notes: e.target.value })
                  }
                  placeholder={`Correction du stock pour le produit ${product.code || product.name}`}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-600">Code mouvement ou inventaire</p>
                <p className="text-sm font-mono text-slate-900">
                  {new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowStockCorrection(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleStockCorrection}
                disabled={
                  !stockCorrectionData.warehouseId ||
                  !stockCorrectionData.quantity ||
                  stockCorrectionMutation.isPending
                }
                className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50"
              >
                {stockCorrectionMutation.isPending ? 'En cours...' : 'Valider'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Transfer Modal */}
      {showStockTransfer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Transfert de stock</h2>
              <p className="text-sm text-slate-600 mt-1">
                Pour le produit {product.code || product.name}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {warehouses.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-amber-800 mb-2">
                    <strong>Aucun entrepôt disponible.</strong>
                  </p>
                  <p className="text-xs text-amber-700 mb-3">
                    Vous devez créer au moins deux entrepôts pour transférer le stock.
                  </p>
                  <button
                    type="button"
                    onClick={() => window.open('/warehouses', '_blank')}
                    className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
                  >
                    Créer un entrepôt →
                  </button>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Entrepôt source <span className="text-red-500">*</span>
                </label>
                <select
                  value={stockTransferData.sourceWarehouseId}
                  onChange={(e) =>
                    setStockTransferData({ ...stockTransferData, sourceWarehouseId: e.target.value })
                  }
                  disabled={warehouses.length === 0}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {warehousesLoading 
                      ? 'Chargement...' 
                      : warehouses.length === 0 
                        ? 'Aucun entrepôt - Veuillez en créer un' 
                        : "Sélectionner l'entrepôt source"}
                  </option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Entrepôt destination <span className="text-red-500">*</span>
                </label>
                <select
                  value={stockTransferData.destWarehouseId}
                  onChange={(e) =>
                    setStockTransferData({ ...stockTransferData, destWarehouseId: e.target.value })
                  }
                  disabled={warehouses.length === 0}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {warehousesLoading 
                      ? 'Chargement...' 
                      : warehouses.length === 0 
                        ? 'Aucun entrepôt - Veuillez en créer un' 
                        : "Sélectionner l'entrepôt destination"}
                  </option>
                  {warehouses
                    .filter((wh) => wh.id.toString() !== stockTransferData.sourceWarehouseId)
                    .map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre de pièces <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockTransferData.quantity}
                  onChange={(e) =>
                    setStockTransferData({ ...stockTransferData, quantity: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Libellé du mouvement
                </label>
                <input
                  type="text"
                  value={stockTransferData.notes}
                  onChange={(e) =>
                    setStockTransferData({ ...stockTransferData, notes: e.target.value })
                  }
                  placeholder={`Transfert de stock du produit ${product.code || product.name} dans un autre entrepôt`}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-600">Code mouvement ou inventaire</p>
                <p className="text-sm font-mono text-slate-900">
                  {new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowStockTransfer(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleStockTransfer}
                disabled={
                  !stockTransferData.sourceWarehouseId ||
                  !stockTransferData.destWarehouseId ||
                  !stockTransferData.quantity ||
                  stockTransferMutation.isPending
                }
                className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50"
              >
                {stockTransferMutation.isPending ? 'En cours...' : 'Transférer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
