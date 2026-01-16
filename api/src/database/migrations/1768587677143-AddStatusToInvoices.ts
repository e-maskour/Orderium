import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddStatusToInvoices1768587677143 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create enum type
        await queryRunner.query(`
            CREATE TYPE "public"."invoices_status_enum" AS ENUM('draft', 'unpaid', 'partial', 'paid')
        `);

        // Add status column
        await queryRunner.addColumn('invoices', new TableColumn({
            name: 'status',
            type: 'enum',
            enum: ['draft', 'unpaid', 'partial', 'paid'],
            default: "'draft'",
        }));

        // Update existing invoices based on their state
        await queryRunner.query(`
            UPDATE invoices i
            SET status = CASE
                WHEN NOT EXISTS (SELECT 1 FROM invoice_items WHERE "invoiceId" = i.id) THEN 'draft'::invoices_status_enum
                WHEN i."paidStatus" = 2 THEN 'paid'::invoices_status_enum
                WHEN i."paidStatus" = 1 THEN 'partial'::invoices_status_enum
                ELSE 'unpaid'::invoices_status_enum
            END
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('invoices', 'status');
        await queryRunner.query(`DROP TYPE "public"."invoices_status_enum"`);
    }

}
