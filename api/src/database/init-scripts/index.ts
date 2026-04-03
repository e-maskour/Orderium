import { DataSource } from 'typeorm';
import { applyStockTrigger } from './stock-trigger.init';
import { applyPaymentTrigger } from './payment-trigger.init';

/**
 * Runs all tenant DB init scripts after migrations and seeders have been
 * applied. Each script is idempotent — safe to call on a freshly created DB
 * as well as on an existing DB (e.g. during a tenant reset).
 *
 * Scripts registered here:
 *  - applyStockTrigger   — keeps `products.stock` in sync with `stock_quants`
 *  - applyPaymentTrigger — keeps `invoices.paidAmount`/status in sync with `payments`
 */
export async function runTenantInitScripts(
  dataSource: DataSource,
): Promise<void> {
  console.log('⚙️  Running tenant init scripts...\n');

  try {
    await applyStockTrigger(dataSource);
    await applyPaymentTrigger(dataSource);

    console.log('\n✅ Tenant init scripts completed successfully');
  } catch (error) {
    console.error('\n❌ Error running tenant init scripts:', error);
    throw error;
  }
}
