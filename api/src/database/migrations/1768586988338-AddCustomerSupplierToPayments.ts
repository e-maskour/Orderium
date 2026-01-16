import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddCustomerSupplierToPayments1768586988338 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn('payments', new TableColumn({
            name: 'customerId',
            type: 'int',
            isNullable: true,
        }));

        await queryRunner.addColumn('payments', new TableColumn({
            name: 'supplierId',
            type: 'int',
            isNullable: true,
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('payments', 'supplierId');
        await queryRunner.dropColumn('payments', 'customerId');
    }

}
