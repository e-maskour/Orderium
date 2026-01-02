import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryPersonService } from '../services/api';
import { DeliveryPerson } from '../types';
import { Link } from 'react-router-dom';
import { UserPlus, Edit2, Trash2, Truck } from 'lucide-react';
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

export default function DeliveryPersons() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    Name: '',
    PhoneNumber: '',
    Email: '',
    Password: '',
    IsActive: true,
  });

  const queryClient = useQueryClient();

  const { data: deliveryPersons = [], isLoading } = useQuery({
    queryKey: ['deliveryPersons'],
    queryFn: deliveryPersonService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: deliveryPersonService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryPersons'] });
      toast.success('Delivery person created successfully');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to create: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DeliveryPerson> }) =>
      deliveryPersonService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryPersons'] });
      toast.success('Delivery person updated successfully');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deliveryPersonService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryPersons'] });
      toast.success('Delivery person deleted successfully');
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({ Name: '', PhoneNumber: '', Email: '', Password: '', IsActive: true });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const { Password, Email, ...updateData } = formData;
      updateMutation.mutate({ 
        id: editingId, 
        data: { 
          ...updateData, 
          Email: Email || undefined 
        } 
      });
    } else {
      if (!formData.Password) {
        toast.error('Password is required for new delivery persons');
        return;
      }
      createMutation.mutate({
        ...formData,
        Email: formData.Email || undefined
      });
    }
  };

  const handleEdit = (person: DeliveryPerson) => {
    setFormData({
      Name: person.Name,
      PhoneNumber: person.PhoneNumber,
      Email: person.Email || '',
      Password: '',
      IsActive: person.IsActive,
    });
    setEditingId(person.Id);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="text-foreground hover:text-primary font-semibold flex items-center gap-2 transition-colors">
                <Truck className="w-5 h-5" />
                ← Dashboard
              </Link>
              <h1 className="text-xl font-bold text-foreground">Delivery Persons</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(!showForm);
                }}
                className="gradient-primary text-white px-4 py-2 rounded-lg font-medium hover:shadow-soft transition-all flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {showForm ? 'Cancel' : 'Add Delivery Person'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {showForm && (
          <div className="bg-card shadow-card rounded-xl p-6 mb-6 border border-border">
            <h2 className="text-lg font-semibold mb-4 text-foreground">
              {editingId ? 'Edit' : 'Add'} Delivery Person
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Name *</label>
                  <input
                    type="text"
                    value={formData.Name}
                    onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
                    className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Phone Number *</label>
                  <input
                    type="tel"
                    value={formData.PhoneNumber}
                    onChange={(e) => setFormData({ ...formData, PhoneNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="06XXXXXXXX"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Email</label>
                  <input
                    type="email"
                    value={formData.Email}
                    onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                    className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                {!editingId && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">Password *</label>
                    <input
                      type="password"
                      value={formData.Password}
                      onChange={(e) => setFormData({ ...formData, Password: e.target.value })}
                      className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                      required={!editingId}
                      placeholder="Min. 6 characters"
                    />
                  </div>
                )}
                <div className="flex items-center pt-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.IsActive}
                      onChange={(e) => setFormData({ ...formData, IsActive: e.target.checked })}
                      className="w-4 h-4 text-primary border-border rounded focus:ring-primary mr-3"
                    />
                    <span className="text-sm font-medium text-foreground">Active</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="gradient-primary text-white px-6 py-2 rounded-lg font-medium hover:shadow-soft transition-all"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-muted text-muted-foreground px-6 py-2 rounded-lg font-medium hover:bg-muted/80 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : deliveryPersons.length === 0 ? (
          <div className="bg-card rounded-lg shadow-card p-12 text-center border border-border">
            <Truck className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium">No delivery persons found</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {deliveryPersons.map((person: DeliveryPerson) => (
              <div key={person.Id} className="bg-card rounded-lg shadow-card border border-border overflow-hidden hover:shadow-medium transition-all">
                {/* Card Header */}
                <div className="p-2.5 border-b border-border bg-muted/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">ID #{person.Id}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium border ${
                      person.IsActive
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-red-100 text-red-700 border-red-200'
                    }`}>
                      {person.IsActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-2.5 space-y-2">
                  {/* Name */}
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 gradient-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <Truck className="w-3 h-3 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{person.Name}</p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs">📞</span>
                    </div>
                    <p className="text-xs text-muted-foreground flex-1">{person.PhoneNumber}</p>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs">📧</span>
                    </div>
                    <p className="text-xs text-muted-foreground flex-1 truncate">{person.Email || '-'}</p>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-border pt-2 mt-2 flex gap-2">
                    <button
                      onClick={() => handleEdit(person)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteId(person.Id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-destructive/10 text-destructive rounded-lg text-xs font-medium hover:bg-destructive/20 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Delivery Person</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this delivery person? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
