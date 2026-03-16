import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddQuotesAndOrderIdToPayments1769300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create quotes table
    await queryRunner.createTable(
      new Table({
        name: 'quotes',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'quoteNumber',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
          {
            name: 'customerId',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'customerName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'customerPhone',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'customerAddress',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'date',
            type: 'date',
          },
          {
            name: 'expirationDate',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'subtotal',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 0,
          },
          {
            name: 'tax',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 0,
          },
          {
            name: 'discount',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 0,
          },
          {
            name: 'discountType',
            type: 'int',
            default: 0,
          },
          {
            name: 'total',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 0,
          },
          {
            name: 'status',
            type: 'enum',
            enum: [
              'draft',
              'sent',
              'accepted',
              'rejected',
              'expired',
              'converted',
            ],
            default: "'draft'",
          },
          {
            name: 'isValidated',
            type: 'boolean',
            default: false,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'convertedToInvoiceId',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'convertedToOrderId',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'dateCreated',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'dateUpdated',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes for quotes table
    await queryRunner.createIndex(
      'quotes',
      new TableIndex({
        name: 'IDX_QUOTES_NUMBER',
        columnNames: ['quoteNumber'],
      }),
    );

    await queryRunner.createIndex(
      'quotes',
      new TableIndex({
        name: 'IDX_QUOTES_CUSTOMER',
        columnNames: ['customerId'],
      }),
    );

    await queryRunner.createIndex(
      'quotes',
      new TableIndex({
        name: 'IDX_QUOTES_DATE',
        columnNames: ['date'],
      }),
    );

    await queryRunner.createIndex(
      'quotes',
      new TableIndex({
        name: 'IDX_QUOTES_EXPIRATION_DATE',
        columnNames: ['expirationDate'],
      }),
    );

    // Create foreign key for customerId
    await queryRunner.createForeignKey(
      'quotes',
      new TableForeignKey({
        columnNames: ['customerId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'partners',
        onDelete: 'SET NULL',
      }),
    );

    // Create quote_items table
    await queryRunner.createTable(
      new Table({
        name: 'quote_items',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'quoteId',
            type: 'int',
          },
          {
            name: 'productId',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'quantity',
            type: 'decimal',
            precision: 18,
            scale: 3,
            default: 0,
          },
          {
            name: 'unitPrice',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 0,
          },
          {
            name: 'discount',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 0,
          },
          {
            name: 'discountType',
            type: 'int',
            default: 0,
          },
          {
            name: 'tax',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'total',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 0,
          },
        ],
      }),
      true,
    );

    // Create indexes for quote_items table
    await queryRunner.createIndex(
      'quote_items',
      new TableIndex({
        name: 'IDX_QUOTE_ITEMS_QUOTE',
        columnNames: ['quoteId'],
      }),
    );

    await queryRunner.createIndex(
      'quote_items',
      new TableIndex({
        name: 'IDX_QUOTE_ITEMS_PRODUCT',
        columnNames: ['productId'],
      }),
    );

    // Create foreign keys for quote_items
    await queryRunner.createForeignKey(
      'quote_items',
      new TableForeignKey({
        columnNames: ['quoteId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'quotes',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'quote_items',
      new TableForeignKey({
        columnNames: ['productId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'products',
        onDelete: 'SET NULL',
      }),
    );

    // Add orderId column to payments table
    await queryRunner.addColumn(
      'payments',
      new TableColumn({
        name: 'orderId',
        type: 'int',
        isNullable: true,
      }),
    );

    // Create foreign key for orderId in payments
    await queryRunner.createForeignKey(
      'payments',
      new TableForeignKey({
        columnNames: ['orderId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'orders',
        onDelete: 'CASCADE',
      }),
    );

    // Make invoiceId nullable in payments table (since now we can have payments for orders too)
    await queryRunner.changeColumn(
      'payments',
      'invoiceId',
      new TableColumn({
        name: 'invoiceId',
        type: 'int',
        isNullable: true,
      }),
    );

    // Add conversion tracking to orders table
    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'isConverted',
        type: 'boolean',
        default: false,
      }),
    );

    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'convertedToInvoiceId',
        type: 'int',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop order conversion columns
    await queryRunner.dropColumn('orders', 'convertedToInvoiceId');
    await queryRunner.dropColumn('orders', 'isConverted');

    // Drop foreign key for orderId in payments
    const paymentsTable = await queryRunner.getTable('payments');
    if (paymentsTable) {
      const orderFk = paymentsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('orderId') !== -1,
      );
      if (orderFk) {
        await queryRunner.dropForeignKey('payments', orderFk);
      }
    }

    // Drop orderId column from payments
    await queryRunner.dropColumn('payments', 'orderId');

    // Revert invoiceId to not nullable
    await queryRunner.changeColumn(
      'payments',
      'invoiceId',
      new TableColumn({
        name: 'invoiceId',
        type: 'int',
        isNullable: false,
      }),
    );

    // Drop quote_items foreign keys
    const quoteItemsTable = await queryRunner.getTable('quote_items');
    if (quoteItemsTable) {
      const quoteFk = quoteItemsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('quoteId') !== -1,
      );
      if (quoteFk) {
        await queryRunner.dropForeignKey('quote_items', quoteFk);
      }

      const productFk = quoteItemsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('productId') !== -1,
      );
      if (productFk) {
        await queryRunner.dropForeignKey('quote_items', productFk);
      }
    }

    // Drop quote_items indexes
    await queryRunner.dropIndex('quote_items', 'IDX_QUOTE_ITEMS_QUOTE');
    await queryRunner.dropIndex('quote_items', 'IDX_QUOTE_ITEMS_PRODUCT');

    // Drop quote_items table
    await queryRunner.dropTable('quote_items');

    // Drop quotes foreign keys
    const quotesTable = await queryRunner.getTable('quotes');
    if (quotesTable) {
      const customerFk = quotesTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('customerId') !== -1,
      );
      if (customerFk) {
        await queryRunner.dropForeignKey('quotes', customerFk);
      }
    }

    // Drop quotes indexes
    await queryRunner.dropIndex('quotes', 'IDX_QUOTES_NUMBER');
    await queryRunner.dropIndex('quotes', 'IDX_QUOTES_CUSTOMER');
    await queryRunner.dropIndex('quotes', 'IDX_QUOTES_DATE');
    await queryRunner.dropIndex('quotes', 'IDX_QUOTES_EXPIRATION_DATE');

    // Drop quotes table
    await queryRunner.dropTable('quotes');
  }
}
