import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService, deliveryPersonService } from '../services/api';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Package, Phone, MapPin, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

export default function Orders() {
  const queryClient = useQueryClient();
  const [unassignOrderId, setUnassignOrderId] = useState<number | null>(null);

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: orderService.getAll,
  });

  const { data: deliveryPersons = [] } = useQuery({
    queryKey: ['deliveryPersons'],
    queryFn: deliveryPersonService.getAll,
  });

  const assignMutation = useMutation({
    mutationFn: ({ orderId, deliveryPersonId }: { orderId: number; deliveryPersonId: number }) =>
      orderService.assignToDelivery(orderId, deliveryPersonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order assigned successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign order: ${error.message}`);
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (orderId: number) => orderService.unassignOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order unassigned successfully');
      setUnassignOrderId(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to unassign order: ${error.message}`);
    },
  });

  const handleAssign = (orderId: number, deliveryPersonId: string) => {
    if (!deliveryPersonId) return;
    assignMutation.mutate({ orderId, deliveryPersonId: parseInt(deliveryPersonId) });
  };

  const handleUnassign = () => {
    if (unassignOrderId) {
      unassignMutation.mutate(unassignOrderId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'to_delivery': return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'in_delivery': return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
      case 'delivered': return 'bg-green-100 text-green-700 border border-green-200';
      case 'canceled': return 'bg-red-100 text-red-700 border border-red-200';
      default: return 'bg-muted text-muted-foreground border border-border';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'to_delivery': return '📋';
      case 'in_delivery': return '🚚';
      case 'delivered': return '🎉';
      case 'canceled': return '❌';
      default: return '•';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'to_delivery': return 'To Delivery';
      case 'in_delivery': return 'In Delivery';
      case 'delivered': return 'Delivered';
      case 'canceled': return 'Canceled';
      default: return status || 'Unassigned';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="text-foreground hover:text-primary font-semibold flex items-center gap-2 transition-colors">
                <Package className="w-5 h-5" />
                ← Dashboard
              </Link>
              <h1 className="text-xl font-bold text-foreground">Order Management</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {ordersLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-card rounded-lg shadow-card p-12 text-center border border-border">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium">No orders found</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {orders.map((order: any) => (
              <div key={order.OrderId} className="bg-card rounded-lg shadow-card border border-border overflow-hidden hover:shadow-medium transition-all">
                {/* Card Header */}
                <div className="p-2.5 border-b border-border bg-muted/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">#{order.OrderNumber}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.Status)}`}>
                      {getStatusIcon(order.Status)} {getStatusLabel(order.Status)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.CreatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Card Body */}
                <div className="p-2.5 space-y-2">
                  {/* Customer */}
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 gradient-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <Package className="w-3 h-3 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{order.CustomerName}</p>
                      <a href={`tel:${order.CustomerPhone}`} className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {order.CustomerPhone}
                      </a>
                    </div>
                  </div>

                  {/* Address */}
                  {order.CustomerAddress && (
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-3 h-3 text-primary" />
                      </div>
                      <p className="text-xs text-muted-foreground flex-1 line-clamp-2">{order.CustomerAddress}</p>
                    </div>
                  )}

                  {/* Total */}
                  <div className="border-t border-border pt-2 mt-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-muted-foreground">Total Amount</span>
                      <span className="text-primary">{order.TotalAmount?.toFixed(2)} DH</span>
                    </div>
                  </div>

                  {/* Assignment */}
                  <div className="border-t border-border pt-2 mt-2">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Assign to Delivery
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={order.DeliveryPersonId || ''}
                        onChange={(e) => handleAssign(order.OrderId, e.target.value)}
                        className="flex-1 border border-input rounded-lg px-2 py-1.5 text-xs bg-background focus:ring-2 focus:ring-ring focus:border-input text-foreground"
                        disabled={order.Status === 'delivered'}
                      >
                        <option value="">Select person...</option>
                        {deliveryPersons.filter((p: any) => p.IsActive).map((person: any) => (
                          <option key={person.Id} value={person.Id}>{person.Name}</option>
                        ))}
                      </select>
                      {order.DeliveryPersonId && (
                        <button
                          onClick={() => setUnassignOrderId(order.OrderId)}
                          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground p-1.5 rounded-lg transition-colors"
                          title="Unassign"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={unassignOrderId !== null} onOpenChange={(open) => !open && setUnassignOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unassign Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unassign this order from the delivery person? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnassign}>Unassign</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
