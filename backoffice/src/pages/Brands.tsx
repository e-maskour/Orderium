import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, X, Tags, Package, Globe } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Checkbox } from 'primereact/checkbox';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { AdminLayout } from '../components/AdminLayout';
import { ImageUpload } from '../components/ImageUpload';
import { PageHeader } from '../components/PageHeader';
import { brandsService, Brand, CreateBrandDTO, UpdateBrandDTO } from '../modules/brands';
import { useLanguage } from '../context/LanguageContext';
import {
  toastCreated,
  toastUpdated,
  toastDeleted,
  toastError,
  toastDeleteError,
  toastConfirm,
} from '../services/toast.service';

const EMPTY_FORM: CreateBrandDTO = {
  name: '',
  description: '',
  website: '',
  logoUrl: '',
  logoPublicId: null,
  isActive: true,
};

export default function Brands() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [formData, setFormData] = useState<CreateBrandDTO>(EMPTY_FORM);

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['brands', showInactive],
    queryFn: () => brandsService.getAll({ includeInactive: showInactive }),
  });

  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const createMutation = useMutation({
    mutationFn: (data: CreateBrandDTO) => brandsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toastCreated(t('brandCreated'));
      handleCloseModal();
    },
    onError: (error: any) => {
      toastError(t(error.message) || error.message || t('failedToCreate'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateBrandDTO }) =>
      brandsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toastUpdated(t('brandUpdated'));
      handleCloseModal();
    },
    onError: (error: any) => {
      toastError(t(error.message) || error.message || t('failedToUpdate'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => brandsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toastDeleted(t('brandDeleted'));
    },
    onError: (error: Error) => {
      toastDeleteError(error, t);
    },
  });

  const handleOpenModal = (brand?: Brand) => {
    if (brand) {
      setEditingBrand(brand);
      setFormData({
        name: brand.name,
        description: brand.description ?? '',
        website: brand.website ?? '',
        logoUrl: brand.logoUrl ?? '',
        logoPublicId: brand.logoPublicId ?? null,
        isActive: brand.isActive,
      });
    } else {
      setEditingBrand(null);
      setFormData(EMPTY_FORM);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBrand(null);
    setFormData(EMPTY_FORM);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toastError(t('nameRequired'));
      return;
    }

    // Empty optional strings are sent as null so the API clears them
    const payload: CreateBrandDTO = {
      name: formData.name.trim(),
      description: formData.description?.trim() || null,
      website: formData.website?.trim() || null,
      logoUrl: formData.logoUrl?.trim() || null,
      logoPublicId: formData.logoPublicId || null,
      isActive: formData.isActive,
    };

    if (editingBrand) {
      updateMutation.mutate({ id: editingBrand.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDeleteClick = (brand: Brand) => {
    toastConfirm(t('confirmDeleteBrand').replace('{{name}}', brand.name), () =>
      deleteMutation.mutate(brand.id),
    );
  };

  return (
    <AdminLayout>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <PageHeader
          icon={Tags}
          title={t('brands')}
          subtitle={t('manageBrands')}
          actions={
            <Button
              icon={<Plus style={{ width: '1rem', height: '1rem' }} />}
              label={t('addBrand')}
              onClick={() => handleOpenModal()}
            />
          }
        />

        {/* Search + filters */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div className="page-quick-search" style={{ flex: '1 1 18rem', marginBottom: 0 }}>
            <span
              style={{
                position: 'absolute',
                left: '0.875rem',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Search style={{ width: '1rem', height: '1rem' }} />
            </span>
            <InputText
              id="search-brands"
              type="text"
              placeholder={t('searchBrands')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '2.25rem',
                paddingRight: searchTerm ? '2.5rem' : '0.875rem',
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#94a3b8',
                  padding: '0.25rem',
                }}
              >
                <X style={{ width: '1rem', height: '1rem' }} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Checkbox
              inputId="show-inactive-brands"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.checked ?? false)}
            />
            <label
              htmlFor="show-inactive-brands"
              style={{ fontSize: '0.875rem', color: '#334155' }}
            >
              {t('showInactiveBrands')}
            </label>
          </div>
        </div>

        {/* Brands grid */}
        {isLoading ? (
          <div className="responsive-card-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="wh-card wh-card-skeleton">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div
                    style={{
                      width: '3rem',
                      height: '3rem',
                      backgroundColor: '#e2e8f0',
                      borderRadius: '0.75rem',
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        height: '0.875rem',
                        width: '8rem',
                        backgroundColor: '#e2e8f0',
                        borderRadius: '0.25rem',
                        marginBottom: '0.5rem',
                      }}
                    />
                    <div
                      style={{
                        height: '0.75rem',
                        width: '5rem',
                        backgroundColor: '#f1f5f9',
                        borderRadius: '0.25rem',
                      }}
                    />
                  </div>
                </div>
                <div
                  style={{
                    height: '0.75rem',
                    width: '12rem',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '0.25rem',
                  }}
                />
              </div>
            ))}
          </div>
        ) : filteredBrands.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              paddingTop: '4rem',
              paddingBottom: '4rem',
              background: '#ffffff',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                width: '4.5rem',
                height: '4.5rem',
                background: 'linear-gradient(135deg, #eff3ff, #dbeafe)',
                borderRadius: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <Tags style={{ width: '2rem', height: '2rem', color: '#235ae4' }} />
            </div>
            <p
              style={{ color: '#475569', fontWeight: 500, fontSize: '1rem', margin: '0 0 0.25rem' }}
            >
              {t('noBrandsFound')}
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>
              {searchTerm ? t('tryDifferentSearch') : t('createFirstBrand')}
            </p>
          </div>
        ) : (
          <div className="responsive-card-grid">
            {filteredBrands.map((brand) => (
              <div key={brand.id} className="wh-card">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}
                  >
                    <div
                      style={{
                        width: '3rem',
                        height: '3rem',
                        background: brand.logoUrl
                          ? '#ffffff'
                          : brand.isActive
                            ? 'linear-gradient(135deg, #235ae4, #1a47b8)'
                            : 'linear-gradient(135deg, #94a3b8, #64748b)',
                        border: brand.logoUrl ? '1px solid #e2e8f0' : 'none',
                        borderRadius: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        overflow: 'hidden',
                        boxShadow:
                          !brand.logoUrl && brand.isActive
                            ? '0 4px 12px rgba(35, 90, 228, 0.25)'
                            : 'none',
                      }}
                    >
                      {brand.logoUrl ? (
                        <img
                          src={brand.logoUrl}
                          alt={brand.name}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <span style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.9375rem' }}>
                          {brand.initials}
                        </span>
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h3
                        style={{
                          fontWeight: 600,
                          color: '#0f172a',
                          fontSize: '0.9375rem',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {brand.name}
                      </h3>
                      {!brand.isActive && (
                        <span className="erp-badge erp-badge--draft">{t('inactive')}</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Button
                      icon={<Pencil style={{ width: '1rem', height: '1rem' }} />}
                      onClick={() => handleOpenModal(brand)}
                      text
                      rounded
                      severity="secondary"
                      aria-label={t('editBrand')}
                    />
                    <Button
                      icon={<Trash2 style={{ width: '1rem', height: '1rem' }} />}
                      onClick={() => handleDeleteClick(brand)}
                      text
                      rounded
                      severity="danger"
                      aria-label={t('delete')}
                    />
                  </div>
                </div>

                {brand.description && (
                  <p
                    style={{
                      fontSize: '0.8125rem',
                      color: '#64748b',
                      margin: '0 0 0.75rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {brand.description}
                  </p>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    fontSize: '0.8125rem',
                    color: '#64748b',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Package style={{ width: '0.875rem', height: '0.875rem' }} />
                    {brand.productCount ?? 0} {t('brandProductCount')}
                  </span>
                  {brand.website && (
                    <a
                      href={brand.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        color: '#235ae4',
                        textDecoration: 'none',
                        minWidth: 0,
                      }}
                    >
                      <Globe style={{ width: '0.875rem', height: '0.875rem', flexShrink: 0 }} />
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {brand.website.replace(/^https?:\/\//, '')}
                      </span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit dialog */}
        <Dialog
          visible={isModalOpen}
          onHide={handleCloseModal}
          header={editingBrand ? t('editBrand') : t('createBrand')}
          modal
          dismissableMask
          style={{ width: '42rem', maxHeight: '90vh' }}
        >
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label
                  htmlFor="brand-name"
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#334155',
                    marginBottom: '0.25rem',
                  }}
                >
                  {t('brandName')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <InputText
                  id="brand-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('enterBrandName')}
                  style={{ width: '100%' }}
                  autoFocus
                />
              </div>

              <div>
                <label
                  htmlFor="brand-website"
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#334155',
                    marginBottom: '0.25rem',
                  }}
                >
                  {t('brandWebsite')}
                </label>
                <InputText
                  id="brand-website"
                  type="url"
                  value={formData.website ?? ''}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder={t('enterBrandWebsite')}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#334155',
                    marginBottom: '0.25rem',
                  }}
                >
                  {t('brandLogo')}
                </label>
                <ImageUpload
                  folder="brands"
                  maxSizeMB={5}
                  currentImage={formData.logoUrl ?? undefined}
                  currentPublicId={formData.logoPublicId}
                  onImageUpload={(logoUrl, logoPublicId) =>
                    setFormData((prev) => ({
                      ...prev,
                      logoUrl,
                      logoPublicId: logoPublicId ?? null,
                    }))
                  }
                  onImageRemove={() =>
                    setFormData((prev) => ({ ...prev, logoUrl: null, logoPublicId: null }))
                  }
                />
                <p style={{ margin: '0.375rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  {t('imageShownInClientPortal')}
                </p>
              </div>

              <div>
                <label
                  htmlFor="brand-desc"
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#334155',
                    marginBottom: '0.25rem',
                  }}
                >
                  {t('description')}
                </label>
                <InputTextarea
                  id="brand-desc"
                  value={formData.description ?? ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder={t('optionalDescription')}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Checkbox
                  inputId="brand-active"
                  checked={formData.isActive ?? false}
                  onChange={(e) => setFormData({ ...formData, isActive: e.checked ?? false })}
                />
                <label htmlFor="brand-active" style={{ fontSize: '0.875rem', color: '#334155' }}>
                  {t('active')}
                </label>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'flex-end',
                marginTop: '1.5rem',
              }}
            >
              <Button type="button" label={t('cancel')} onClick={handleCloseModal} outlined />
              <Button
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
                label={editingBrand ? t('update') : t('create')}
              />
            </div>
          </form>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
