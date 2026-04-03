import { useEffect, useState } from 'react';
import { http } from '@/services/httpClient';
import { API_ROUTES } from '@/common/api-routes';

export interface Category {
  id: number;
  name: string;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    http<{ data: { id: number; name: string }[] }>(API_ROUTES.PORTAL.CATEGORIES)
      .then((res) => {
        const items = Array.isArray(res.data)
          ? res.data.map((c) => ({ id: c.id, name: c.name }))
          : [];
        setCategories(items);
      })
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  return { categories, loading };
}
