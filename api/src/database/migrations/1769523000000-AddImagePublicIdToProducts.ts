import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddImagePublicIdToProducts1737950000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'products',
      new TableColumn({
        name: 'imagePublicId',
        type: 'varchar',
        length: '500',
        isNullable: true,
        comment: 'Public ID from CDN provider (Cloudinary, S3, etc) for image management',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('products', 'imagePublicId');
  }
}
