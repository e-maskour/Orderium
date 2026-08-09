import { useEffect, useState } from 'react';
import { brandsService } from '@/modules/brands';
// The barrel's `Brand` is the model class; the service returns plain objects.
import type { Brand } from '@/modules/brands/brands.interface';

/**
 * Mirrors `useCategories`: fetch-once list used by the landing page and the
 * shop's brand filter. Never throws — an unavailable endpoint degrades to an
 * empty list, which hides the filter rather than breaking the page.
 */
export function useBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    brandsService
      .getAll()
      .then((res) => setBrands(res.brands))
      .catch(() => setBrands([]))
      .finally(() => setLoading(false));
  }, []);

  return { brands, loading };
}
