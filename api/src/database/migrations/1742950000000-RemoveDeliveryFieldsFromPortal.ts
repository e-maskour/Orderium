import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class RemoveDeliveryFieldsFromPortal1742950000000 implements MigrationInterface {
    name = 'RemoveDeliveryFieldsFromPortal1742950000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop FK constraint on deliveryId if it exists
        const table = await queryRunner.getTable('portal');
        if (table) {
            const fk = table.foreignKeys.find(
                (fk) =>
                    fk.columnNames.includes('deliveryId') ||
                    fk.columnNames.includes('delivery_id'),
            );
            if (fk) {
                await queryRunner.dropForeignKey('portal', fk);
            }
        }

        // Drop columns
        const hasDeliveryId = table?.columns.find(
            (c) => c.name === 'deliveryId' || c.name === 'delivery_id',
        );
        if (hasDeliveryId) {
            await queryRunner.dropColumn('portal', hasDeliveryId.name);
        }

        const hasIsDelivery = table?.columns.find(
            (c) => c.name === 'isDelivery' || c.name === 'is_delivery',
        );
        if (hasIsDelivery) {
            await queryRunner.dropColumn('portal', hasIsDelivery.name);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'portal',
            new TableColumn({
                name: 'isDelivery',
                type: 'boolean',
                default: false,
            }),
        );

        await queryRunner.addColumn(
            'portal',
            new TableColumn({
                name: 'deliveryId',
                type: 'int',
                isNullable: true,
            }),
        );

        await queryRunner.createForeignKey(
            'portal',
            new TableForeignKey({
                columnNames: ['deliveryId'],
                referencedTableName: 'delivery_persons',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
            }),
        );
    }
}
