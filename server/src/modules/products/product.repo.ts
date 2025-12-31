import { getPool } from "../../db/pool";
import { Product } from "./product.model";

export async function findProducts(
  limit: number,
  offset: number,
  search?: string
): Promise<Product[]> {

  const pool = await getPool();

  const request = pool.request()
    .input("limit", limit)
    .input("offset", offset);

  let where = "WHERE IsEnabled = 1";

  if (search) {
    where += " AND Name LIKE @search";
    request.input("search", `%${search}%`);
  }

  const result = await request.query(`
    SELECT
      Id, Name, Code, Description,
      Price, Cost, IsService, IsEnabled,
      DateCreated, DateUpdated
    FROM Product
    ${where}
    ORDER BY Name
    OFFSET @offset ROWS
    FETCH NEXT @limit ROWS ONLY
  `);

  return result.recordset;
}
