import { DataSource } from 'typeorm';

/**
 * Idempotently applies the invoice paid-amount / status sync trigger on
 * `payments`.
 *
 * Mirrors the SQL originally introduced in migration
 * 1769452970000-AddPaymentTriggerToUpdateInvoicePaidAmount, but safe to
 * re-run on any existing tenant DB (CREATE OR REPLACE for the function,
 * DROP IF EXISTS before the trigger).
 */
export async function applyPaymentTrigger(
    dataSource: DataSource,
): Promise<void> {
    await dataSource.query(`
    CREATE OR REPLACE FUNCTION update_invoice_paid_amount()
    RETURNS TRIGGER AS $$
    DECLARE
      v_invoice_id INTEGER;
      v_total_paid DECIMAL(18,2);
      v_invoice_total DECIMAL(18,2);
      v_new_status VARCHAR(50);
    BEGIN
      IF (TG_OP = 'DELETE') THEN
        v_invoice_id := OLD."invoiceId";
      ELSE
        v_invoice_id := NEW."invoiceId";
      END IF;

      SELECT COALESCE(SUM(amount), 0)
      INTO v_total_paid
      FROM payments
      WHERE "invoiceId" = v_invoice_id;

      SELECT total INTO v_invoice_total
      FROM invoices
      WHERE id = v_invoice_id;

      SELECT
        CASE
          WHEN "isValidated" = false THEN 'draft'
          WHEN v_total_paid = 0 THEN 'unpaid'
          WHEN v_total_paid >= v_invoice_total THEN 'paid'
          ELSE 'partial'
        END
      INTO v_new_status
      FROM invoices
      WHERE id = v_invoice_id;

      UPDATE invoices
      SET
        "paidAmount" = v_total_paid,
        status = v_new_status::invoices_status_enum
      WHERE id = v_invoice_id;

      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);

    await dataSource.query(
        `DROP TRIGGER IF EXISTS update_invoice_paid_amount_trigger ON payments`,
    );
    await dataSource.query(`
    CREATE TRIGGER update_invoice_paid_amount_trigger
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_invoice_paid_amount()
  `);

    console.log('  ✓ Payment trigger applied (update_invoice_paid_amount)');
}
