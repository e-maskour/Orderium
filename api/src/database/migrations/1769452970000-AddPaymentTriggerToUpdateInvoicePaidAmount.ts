import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentTriggerToUpdateInvoicePaidAmount1769452970000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create function to update invoice paidAmount and status
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_invoice_paid_amount()
      RETURNS TRIGGER AS $$
      DECLARE
        v_invoice_id INTEGER;
        v_total_paid DECIMAL(18,2);
        v_invoice_total DECIMAL(18,2);
        v_new_status VARCHAR(50);
      BEGIN
        -- Determine which invoice ID to update
        IF (TG_OP = 'DELETE') THEN
          v_invoice_id := OLD."invoiceId";
        ELSE
          v_invoice_id := NEW."invoiceId";
        END IF;

        -- Calculate total paid for this invoice
        SELECT COALESCE(SUM(amount), 0)
        INTO v_total_paid
        FROM payments
        WHERE "invoiceId" = v_invoice_id;

        -- Get invoice total and check if validated
        SELECT total INTO v_invoice_total
        FROM invoices
        WHERE id = v_invoice_id;

        -- Determine new status based on payment
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

        -- Update invoice with new paidAmount and status
        UPDATE invoices
        SET 
          "paidAmount" = v_total_paid,
          status = v_new_status::invoices_status_enum
        WHERE id = v_invoice_id;

        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger on payments table
    await queryRunner.query(`
      CREATE TRIGGER update_invoice_paid_amount_trigger
      AFTER INSERT OR UPDATE OR DELETE ON payments
      FOR EACH ROW
      EXECUTE FUNCTION update_invoice_paid_amount();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_invoice_paid_amount_trigger ON payments;
    `);

    // Drop function
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS update_invoice_paid_amount();
    `);
  }
}
