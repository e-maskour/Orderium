import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRemainingAmountToInvoices1769453126000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add remainingAmount column
    await queryRunner.addColumn(
      'invoices',
      new TableColumn({
        name: 'remainingAmount',
        type: 'decimal',
        precision: 18,
        scale: 2,
        default: 0,
      }),
    );

    // Update existing invoices to set remainingAmount = total - paidAmount
    await queryRunner.query(`
      UPDATE invoices 
      SET "remainingAmount" = total - "paidAmount"
    `);

    // Drop the old trigger and function
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_invoice_paid_amount_trigger ON payments;
    `);
    
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS update_invoice_paid_amount();
    `);

    // Create updated function that also calculates remainingAmount
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_invoice_paid_amount()
      RETURNS TRIGGER AS $$
      DECLARE
        v_invoice_id INTEGER;
        v_total_paid DECIMAL(18,2);
        v_invoice_total DECIMAL(18,2);
        v_remaining DECIMAL(18,2);
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

        -- Calculate remaining amount
        v_remaining := v_invoice_total - v_total_paid;
        IF v_remaining < 0 THEN
          v_remaining := 0;
        END IF;

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

        -- Update invoice with new paidAmount, remainingAmount and status
        UPDATE invoices
        SET 
          "paidAmount" = v_total_paid,
          "remainingAmount" = v_remaining,
          status = v_new_status::invoices_status_enum
        WHERE id = v_invoice_id;

        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Recreate trigger
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

    // Recreate old function without remainingAmount
    await queryRunner.query(`
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

    // Recreate old trigger
    await queryRunner.query(`
      CREATE TRIGGER update_invoice_paid_amount_trigger
      AFTER INSERT OR UPDATE OR DELETE ON payments
      FOR EACH ROW
      EXECUTE FUNCTION update_invoice_paid_amount();
    `);

    // Drop remainingAmount column
    await queryRunner.dropColumn('invoices', 'remainingAmount');
  }
}
