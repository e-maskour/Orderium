import { useEffect, useState } from "react";
import { Product } from "@/types/database";
import { productService } from "@/services";

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
    
    productService.getAll({
      page,
      pageSize,
      ...(search && { search }),
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
