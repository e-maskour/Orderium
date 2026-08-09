import { useQuery } from '@tanstack/react-query';
import { productsService, Product } from '@/modules/products';

export interface ProductRail {
  products: Product[];
  loading: boolean;
}

const RAIL_SIZE = 3;

/** Shared cache policy: rails change slowly, so don't refetch them on nav. */
const railOptions = { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 };

export function useTopSellers(limit = RAIL_SIZE): ProductRail {
  const { data, isLoading } = useQuery({
    queryKey: ['rail', 'top-sellers', limit],
    queryFn: () => productsService.getTopSellers(limit),
    ...railOptions,
  });
  return { products: data ?? [], loading: isLoading };
}

export function useNewestProducts(limit = RAIL_SIZE): ProductRail {
  const { data, isLoading } = useQuery({
    queryKey: ['rail', 'newest', limit],
    queryFn: () => productsService.getNewest(limit),
    ...railOptions,
  });
  return { products: data ?? [], loading: isLoading };
}

export function useReorderProducts(limit = RAIL_SIZE): ProductRail {
  const { data, isLoading } = useQuery({
    queryKey: ['rail', 'reorder', limit],
    queryFn: () => productsService.getReorder(limit),
    ...railOptions,
  });
  return { products: data ?? [], loading: isLoading };
}
