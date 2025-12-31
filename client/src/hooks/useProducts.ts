import { useEffect, useState } from "react";
import { Product } from "@/types/database";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface UseProductsParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

interface UseProductsResult {
  products: Product[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  totalPages: number;
}

export function useProducts(params: UseProductsParams = {}): UseProductsResult {
  const { page = 1, pageSize = 18, search = '' } = params;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    const queryParams = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...(search && { search }),
    });

    fetch(`${API_URL}/api/products?${queryParams}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load products");
        return res.json();
      })
      .then(data => {
        // Assuming API returns { products: Product[], total: number } or just Product[]
        if (Array.isArray(data)) {
          setProducts(data);
          setTotalCount(data.length);
        } else {
          setProducts(data.products || []);
          setTotalCount(data.total || data.products?.length || 0);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, pageSize, search]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return { products, loading, error, totalCount, totalPages };
}
