import { z } from "zod";

export const getProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(18),
  search: z.string().min(1).optional()
});
