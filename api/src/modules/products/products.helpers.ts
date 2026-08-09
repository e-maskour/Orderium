import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { Brand } from '../brands/entities/brand.entity';
import { UnitOfMeasure } from '../inventory/entities/unit-of-measure.entity';
import { Warehouse } from '../inventory/entities/warehouse.entity';

// ─── Parsers ──────────────────────────────────────────────────────────────

export function parseNumber(value: unknown, defaultValue = 0): number {
  if (value === null || value === undefined || value === '')
    return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

export function parseBoolean(value: unknown, defaultValue = false): boolean {
  if (value === null || value === undefined || value === '')
    return defaultValue;
  if (typeof value === 'boolean') return value;
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  const str = String(value).toLowerCase().trim();
  return str === 'oui' || str === 'yes' || str === '1' || str === 'true';
}

// ─── XLSX ─────────────────────────────────────────────────────────────────

export const PRODUCT_XLSX_COL_WIDTHS = [
  15, 30, 40, 15, 15, 15, 10, 15, 15, 12, 15, 15, 15, 20, 30, 20,
].map((w) => ({ wch: w }));

export function buildProductExportRow(
  product: Product,
): Record<string, unknown> {
  return {
    Code: product.code || '',
    Nom: product.name,
    Description: product.description || '',
    'Prix de vente': Number(product.price),
    "Prix d'achat": Number(product.cost),
    'Prix minimum': Number(product.minPrice),
    Stock: product.stock || 0,
    'Taxe vente (%)': Number(product.saleTax),
    'Taxe achat (%)': Number(product.purchaseTax),
    'Est service': product.isService ? 'Oui' : 'Non',
    'Prix modifiable': product.isPriceChangeAllowed ? 'Oui' : 'Non',
    'Unité vente': product.saleUnitOfMeasure?.name || '',
    'Unité achat': product.purchaseUnitOfMeasure?.name || '',
    Entrepôt: product.warehouse?.name || '',
    Catégories: product.categories?.map((c) => c.name).join(', ') || '',
    Marque: product.brand?.name || '',
  };
}

// ─── Import row mapping ───────────────────────────────────────────────────

/**
 * Maps a raw XLSX row onto an existing or new product.
 * Mutations are applied in-place; the caller must save the entity.
 */
export function mapImportRow(
  row: Record<string, unknown>,
  product: Product,
  units: UnitOfMeasure[],
  warehouses: Warehouse[],
  categories: Category[],
  brands: Brand[] = [],
): void {
  product.name = row['Nom'] as string;
  product.code = (row['Code'] as string) || null;
  product.description = (row['Description'] as string) || null;
  product.price = parseNumber(row['Prix de vente'], 0);
  product.cost = parseNumber(row["Prix d'achat"], 0);
  product.minPrice = parseNumber(row['Prix minimum'], 0);
  product.stock = parseNumber(row['Stock'], 0);
  product.saleTax = parseNumber(row['Taxe vente (%)'], 0);
  product.purchaseTax = parseNumber(row['Taxe achat (%)'], 0);
  product.isService = parseBoolean(row['Est service']);
  product.isPriceChangeAllowed = parseBoolean(row['Prix modifiable'], true);

  if (row['Unité vente']) {
    const unit = units.find(
      (u) =>
        u.name.toLowerCase() === (row['Unité vente'] as string).toLowerCase(),
    );
    if (unit) product.saleUnitId = unit.id;
  }

  if (row['Unité achat']) {
    const unit = units.find(
      (u) =>
        u.name.toLowerCase() === (row['Unité achat'] as string).toLowerCase(),
    );
    if (unit) product.purchaseUnitId = unit.id;
  }

  if (row['Entrepôt']) {
    const warehouse = warehouses.find(
      (w) => w.name.toLowerCase() === (row['Entrepôt'] as string).toLowerCase(),
    );
    if (warehouse) product.warehouseId = warehouse.id;
  }

  if (row['Catégories']) {
    const names = (row['Catégories'] as string)
      .split(',')
      .map((n: string) => n.trim())
      .filter(Boolean);
    product.categories = categories.filter((c) =>
      names.some((n: string) => c.name.toLowerCase() === n.toLowerCase()),
    );
  }

  // Brand is optional — an empty cell clears it, an unknown name leaves it untouched
  if (row['Marque'] !== undefined) {
    const raw = row['Marque'];
    // Cells arrive as `unknown`. Only a primitive can name a brand; a non-primitive
    // (a date cell, say) is left alone rather than stringified — String() on an
    // object yields "[object Object]", which matches nothing anyway.
    const isNameable =
      raw === null ||
      typeof raw === 'string' ||
      typeof raw === 'number' ||
      typeof raw === 'boolean';

    if (isNameable) {
      const brandName = raw === null ? '' : String(raw).trim();
      if (!brandName) {
        product.brandId = null;
      } else {
        const brand = brands.find(
          (b) => b.name.toLowerCase() === brandName.toLowerCase(),
        );
        if (brand) product.brandId = brand.id;
      }
    }
  }
}
