import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropDeviceTokensPortalFK1742940000000
    implements MigrationInterface {
    name = 'DropDeviceTokensPortalFK1742940000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Find and drop the FK constraint on device_tokens.userId -> portal.id
        // The constraint name may vary between environments (auto-generated vs migration-created)
        const table = await queryRunner.getTable('device_tokens');
        if (table) {
            const fk = table.foreignKeys.find(
                (fk) =>
                    fk.columnNames.includes('userId') &&
                    fk.referencedTableName === 'portal',
            );
            if (fk) {
                await queryRunner.dropForeignKey('device_tokens', fk);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "device_tokens" ADD CONSTRAINT "FK_device_tokens_portal" FOREIGN KEY ("userId") REFERENCES "portal"("id") ON DELETE CASCADE`,
        );
    }
}
