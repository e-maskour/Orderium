import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreatePaymentsTable1768586701259 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'payments',
                columns: [
                    {
                        name: 'id',
                        type: 'int',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'increment',
                    },
                    {
                        name: 'invoiceId',
                        type: 'int',
                    },
                    {
                        name: 'amount',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                    },
                    {
                        name: 'paymentDate',
                        type: 'date',
                    },
                    {
                        name: 'paymentType',
                        type: 'enum',
                        enum: ['cash', 'check', 'bank_transfer', 'credit_card', 'mobile_payment', 'other'],
                        default: "'cash'",
                    },
                    {
                        name: 'notes',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'referenceNumber',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updatedAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        onUpdate: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        await queryRunner.createForeignKey(
            'payments',
            new TableForeignKey({
                columnNames: ['invoiceId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'invoices',
                onDelete: 'CASCADE',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('payments');
        if (table) {
            const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('invoiceId') !== -1);
            if (foreignKey) {
                await queryRunner.dropForeignKey('payments', foreignKey);
            }
        }
        await queryRunner.dropTable('payments');
    }

}
