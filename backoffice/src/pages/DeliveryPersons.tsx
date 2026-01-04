import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryPersonService } from '../services/api';
import { DeliveryPerson } from '../types';
import { useLanguage } from '../context/LanguageContext';
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
  const { t } = useLanguage();
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
      toast.success(t('deliveryPersonCreated'));
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`${t('failedToCreate')}: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DeliveryPerson> }) =>
      deliveryPersonService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryPersons'] });
      toast.success(t('deliveryPersonUpdated'));
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`${t('failedToUpdate')}: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deliveryPersonService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryPersons'] });
      toast.success(t('deliveryPersonDeleted'));
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast.error(`${t('failedToDelete')}: ${error.message}`);
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
        toast.error(t('passwordRequired'));
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
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200/60 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="text-slate-700 hover:text-amber-600 font-semibold flex items-center gap-2 transition-colors">
                <Truck className="w-5 h-5" />
                ← {t('dashboard')}
              </Link>
              <h1 className="text-xl font-bold text-slate-800">{t('deliveryPersons')}</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(!showForm);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm hover:shadow-md transition-all flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {showForm ? t('cancel') : t('addDeliveryPerson')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {showForm && (
          <div className="bg-white shadow-sm rounded-2xl p-6 mb-6 border border-slate-200/60">
            <h2 className="text-lg font-bold mb-4 text-slate-800">
              {editingId ? t('edit') : t('add')} {t('deliveryPerson')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">{t('name')} *</label>
                  <input
                    type="text"
                    value={formData.Name}
                    onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">{t('phoneNumber')} *</label>
                  <input
                    type="tel"
                    value={formData.PhoneNumber}
                    onChange={(e) => setFormData({ ...formData, PhoneNumber: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-slate-700"
                    placeholder="06XXXXXXXX"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">{t('email')}</label>
                  <input
                    type="email"
                    value={formData.Email}
                    onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-slate-700"
                  />
                </div>
                {!editingId && (
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">{t('password')} *</label>
                    <input
                      type="password"
                      value={formData.Password}
                      onChange={(e) => setFormData({ ...formData, Password: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-slate-700"
                      required={!editingId}
                      placeholder={t('minSixCharacters')}
                    />
                  </div>
                )}
                <div className="flex items-center pt-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.IsActive}
                      onChange={(e) => setFormData({ ...formData, IsActive: e.target.checked })}
                      className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-500 mr-3 rtl:ml-3 rtl:mr-0"
                    />
                    <span className="text-sm font-semibold text-slate-700">{t('active')}</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-medium shadow-sm hover:shadow-md transition-all"
                >
                  {editingId ? t('update') : t('create')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-2.5 rounded-xl font-medium transition-all"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : deliveryPersons.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-16 text-center border border-slate-200/60">
            <Truck className="w-20 h-20 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-800 font-semibold text-lg">{t('noDeliveryPersonsFound')}</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {deliveryPersons.map((person: DeliveryPerson) => (
              <div key={person.Id} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden hover:shadow-lg hover:border-slate-300/60 transition-all duration-200">
                {/* Card Header */}
                <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 tracking-wide">ID #{person.Id}</span>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm ${
                      person.IsActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                        : 'bg-red-50 text-red-700 border border-red-200/50'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full ${person.IsActive ? 'bg-emerald-500' : 'bg-red-500'}"></span>
                      {person.IsActive ? t('active') : t('inactive')}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-4">
                  {/* Name */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/30">
                      <Truck className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-slate-800 leading-snug">{person.Name}</p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">📞</span>
                    </div>
                    <p className="text-xs text-slate-600 flex-1 font-medium">{person.PhoneNumber}</p>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">📧</span>
                    </div>
                    <p className="text-xs text-slate-600 flex-1 truncate">{person.Email || '-'}</p>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-slate-100 pt-4 flex gap-2">
                    <button
                      onClick={() => handleEdit(person)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium shadow-sm hover:shadow-md transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                      {t('edit')}
                    </button>
                    <button
                      onClick={() => setDeleteId(person.Id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium shadow-sm hover:shadow-md transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t('delete')}
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
            <AlertDialogTitle>{t('deleteDeliveryPerson')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDeliveryPersonConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
