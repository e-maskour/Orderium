import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { productsService, Product } from '@/modules/products';

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
  const { page = 1, pageSize = 50, search = '' } = params;

  const { data, isLoading, error } = useQuery({
    queryKey: ['products', page, pageSize, search],
    queryFn: () => productsService.getAll({ page, pageSize, ...(search && { search }) }),
    placeholderData: keepPreviousData,
  });

  const products = data?.products ?? [];
  const totalCount = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    products,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    totalCount,
    totalPages,
  };
}
