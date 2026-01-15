import { useEffect, useState } from "react";
import { productsService, Product } from "@/modules/products";

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
  const { page = 1, pageSize = 24, search = '' } = params;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    
    productsService.getAll({
      page,
      pageSize,
      ...(search && { search }),
    })
      .then(data => {
        // productsService.getAll returns Product[]
        setProducts(data);
        setTotalCount(data.length);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, pageSize, search]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return { products, loading, error, totalCount, totalPages };
}
