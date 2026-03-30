import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddShareTokenToInvoicesAndOrders1743000000000 implements MigrationInterface {
    name = 'AddShareTokenToInvoicesAndOrders1743000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Skip on brand-new tenant databases: the invoices/orders tables don't
        // exist yet. They will be created by InitialMigration1774300911703,
        // and AddShareTokenColumnsIfNotExists1774619375000 will add these
        // columns idempotently after that.
        const invoicesExists = await queryRunner.hasTable('invoices');
        if (!invoicesExists) return;

        await queryRunner.addColumn(
            'invoices',
            new TableColumn({
                name: 'share_token',
                type: 'varchar',
                length: '100',
                isNullable: true,
                isUnique: true,
            }),
        );

        await queryRunner.addColumn(
            'invoices',
            new TableColumn({
                name: 'share_token_expiry',
                type: 'timestamp',
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            'orders',
            new TableColumn({
                name: 'share_token',
                type: 'varchar',
                length: '100',
                isNullable: true,
                isUnique: true,
            }),
        );

        await queryRunner.addColumn(
            'orders',
            new TableColumn({
                name: 'share_token_expiry',
                type: 'timestamp',
                isNullable: true,
            }),
        );

        await queryRunner.createIndex(
            'invoices',
            new TableIndex({
                name: 'IDX_invoice_share_token',
                columnNames: ['share_token'],
            }),
        );

        await queryRunner.createIndex(
            'orders',
            new TableIndex({
                name: 'IDX_order_share_token',
                columnNames: ['share_token'],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const invoicesExists = await queryRunner.hasTable('invoices');
        if (!invoicesExists) return;

        await queryRunner.dropIndex('orders', 'IDX_order_share_token');
        await queryRunner.dropIndex('invoices', 'IDX_invoice_share_token');
        await queryRunner.dropColumn('orders', 'share_token_expiry');
        await queryRunner.dropColumn('orders', 'share_token');
        await queryRunner.dropColumn('invoices', 'share_token_expiry');
        await queryRunner.dropColumn('invoices', 'share_token');
    }
}
