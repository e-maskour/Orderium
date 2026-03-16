import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddValidationDateAndDueDateToQuotesAndOrders1770423238461 implements MigrationInterface {
  name = 'AddValidationDateAndDueDateToQuotesAndOrders1770423238461';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD "validationDate" date`);
    await queryRunner.query(`ALTER TABLE "quotes" ADD "dueDate" date`);
    await queryRunner.query(`ALTER TABLE "quotes" ADD "validationDate" date`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quotes" DROP COLUMN "validationDate"`,
    );
    await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "dueDate"`);
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "validationDate"`,
    );
  }
}
