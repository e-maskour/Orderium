import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1710000000000 implements MigrationInterface {
  name = 'InitialMigration1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create products table
    await queryRunner.query(`
            CREATE TABLE "products" (
                "id" SERIAL NOT NULL,
                "name" character varying(255) NOT NULL,
                "code" character varying(100),
                "description" text,
                "price" numeric(18,2) NOT NULL DEFAULT 0,
                "cost" numeric(18,2) NOT NULL DEFAULT 0,
                "isService" boolean NOT NULL DEFAULT false,
                "isEnabled" boolean NOT NULL DEFAULT true,
                "isPriceChangeAllowed" boolean NOT NULL DEFAULT true,
                "imageUrl" text,
                "stock" integer,
                "dateCreated" TIMESTAMP NOT NULL DEFAULT now(),
                "dateUpdated" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_products" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "IDX_products_name" ON "products" ("name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_products_code" ON "products" ("code")`,
    );

    // Create customers table
    await queryRunner.query(`
            CREATE TABLE "customers" (
                "id" SERIAL NOT NULL,
                "name" character varying(255) NOT NULL,
                "phoneNumber" character varying(50),
                "email" character varying(255),
                "address" text,
                "latitude" numeric(10,7),
                "longitude" numeric(10,7),
                "googleMapsUrl" character varying(500),
                "wazeUrl" character varying(500),
                "isEnabled" boolean NOT NULL DEFAULT true,
                "dateCreated" TIMESTAMP NOT NULL DEFAULT now(),
                "dateUpdated" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_customers_phoneNumber" UNIQUE ("phoneNumber"),
                CONSTRAINT "PK_customers" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "IDX_customers_phoneNumber" ON "customers" ("phoneNumber")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_customers_email" ON "customers" ("email")`,
    );

    // Create documents table
    await queryRunner.query(`
            CREATE TABLE "documents" (
                "id" SERIAL NOT NULL,
                "number" character varying(50) NOT NULL,
                "adminId" integer,
                "customerId" integer,
                "cashRegisterId" integer,
                "orderNumber" character varying(50),
                "date" date NOT NULL,
                "stockDate" date NOT NULL,
                "total" numeric(18,2) NOT NULL DEFAULT 0,
                "isClockedOut" boolean NOT NULL DEFAULT false,
                "documentTypeId" integer NOT NULL,
                "warehouseId" integer NOT NULL,
                "referenceDocumentNumber" character varying(50),
                "internalNote" text,
                "note" text,
                "dueDate" date,
                "discount" numeric(18,2) NOT NULL DEFAULT 0,
                "discountType" integer NOT NULL DEFAULT 0,
                "paidStatus" integer NOT NULL DEFAULT 0,
                "discountApplyRule" integer NOT NULL DEFAULT 0,
                "serviceType" integer NOT NULL DEFAULT 0,
                "dateCreated" TIMESTAMP NOT NULL DEFAULT now(),
                "dateUpdated" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_documents_number" UNIQUE ("number"),
                CONSTRAINT "PK_documents" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "IDX_documents_number" ON "documents" ("number")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_documents_orderNumber" ON "documents" ("orderNumber")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_documents_customerId" ON "documents" ("customerId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_documents_date" ON "documents" ("date")`,
    );

    // Create document_items table
    await queryRunner.query(`
            CREATE TABLE "document_items" (
                "id" SERIAL NOT NULL,
                "documentId" integer NOT NULL,
                "productId" integer NOT NULL,
                "quantity" numeric(18,3) NOT NULL DEFAULT 0,
                "expectedQuantity" numeric(18,3) NOT NULL DEFAULT 0,
                "priceBeforeTax" numeric(18,2) NOT NULL DEFAULT 0,
                "discount" numeric(18,2) NOT NULL DEFAULT 0,
                "discountType" integer NOT NULL DEFAULT 0,
                "price" numeric(18,2) NOT NULL DEFAULT 0,
                "productCost" numeric(18,2) NOT NULL DEFAULT 0,
                "priceAfterDiscount" numeric(18,2) NOT NULL DEFAULT 0,
                "total" numeric(18,2) NOT NULL DEFAULT 0,
                "priceBeforeTaxAfterDiscount" numeric(18,2) NOT NULL DEFAULT 0,
                "totalAfterDocumentDiscount" numeric(18,2) NOT NULL DEFAULT 0,
                "discountApplyRule" integer NOT NULL DEFAULT 0,
                CONSTRAINT "PK_document_items" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "IDX_document_items_documentId" ON "document_items" ("documentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_document_items_productId" ON "document_items" ("productId")`,
    );

    // Create invoices table
    await queryRunner.query(`
            CREATE TABLE "invoices" (
                "id" SERIAL NOT NULL,
                "invoiceNumber" character varying(50) NOT NULL,
                "customerId" integer,
                "customerName" character varying(255),
                "customerPhone" character varying(50),
                "customerAddress" text,
                "date" date NOT NULL,
                "dueDate" date,
                "subtotal" numeric(18,2) NOT NULL DEFAULT 0,
                "tax" numeric(18,2) NOT NULL DEFAULT 0,
                "discount" numeric(18,2) NOT NULL DEFAULT 0,
                "discountType" integer NOT NULL DEFAULT 0,
                "total" numeric(18,2) NOT NULL DEFAULT 0,
                "paidStatus" integer NOT NULL DEFAULT 0,
                "notes" text,
                "dateCreated" TIMESTAMP NOT NULL DEFAULT now(),
                "dateUpdated" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_invoices_invoiceNumber" UNIQUE ("invoiceNumber"),
                CONSTRAINT "PK_invoices" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "IDX_invoices_invoiceNumber" ON "invoices" ("invoiceNumber")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invoices_customerId" ON "invoices" ("customerId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invoices_date" ON "invoices" ("date")`,
    );

    // Create invoice_items table
    await queryRunner.query(`
            CREATE TABLE "invoice_items" (
                "id" SERIAL NOT NULL,
                "invoiceId" integer NOT NULL,
                "productId" integer,
                "description" character varying(255) NOT NULL,
                "quantity" numeric(18,3) NOT NULL DEFAULT 0,
                "unitPrice" numeric(18,2) NOT NULL DEFAULT 0,
                "discount" numeric(18,2) NOT NULL DEFAULT 0,
                "discountType" integer NOT NULL DEFAULT 0,
                "total" numeric(18,2) NOT NULL DEFAULT 0,
                CONSTRAINT "PK_invoice_items" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "IDX_invoice_items_invoiceId" ON "invoice_items" ("invoiceId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invoice_items_productId" ON "invoice_items" ("productId")`,
    );

    // Create delivery_persons table
    await queryRunner.query(`
            CREATE TABLE "delivery_persons" (
                "id" SERIAL NOT NULL,
                "name" character varying(255) NOT NULL,
                "email" character varying(255) NOT NULL,
                "password" character varying(255) NOT NULL,
                "phoneNumber" character varying(50),
                "isActive" boolean NOT NULL DEFAULT true,
                "dateCreated" TIMESTAMP NOT NULL DEFAULT now(),
                "dateUpdated" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_delivery_persons_email" UNIQUE ("email"),
                CONSTRAINT "PK_delivery_persons" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "IDX_delivery_persons_email" ON "delivery_persons" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_delivery_persons_phoneNumber" ON "delivery_persons" ("phoneNumber")`,
    );

    // Create orders_delivery table
    await queryRunner.query(`
            CREATE TABLE "orders_delivery" (
                "id" SERIAL NOT NULL,
                "orderId" integer NOT NULL,
                "deliveryPersonId" integer,
                "status" character varying(50) NOT NULL DEFAULT 'pending',
                "assignedAt" TIMESTAMP,
                "pickedUpAt" TIMESTAMP,
                "deliveredAt" TIMESTAMP,
                "notes" text,
                "dateCreated" TIMESTAMP NOT NULL DEFAULT now(),
                "dateUpdated" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_orders_delivery" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_delivery_orderId" ON "orders_delivery" ("orderId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_delivery_deliveryPersonId" ON "orders_delivery" ("deliveryPersonId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_delivery_status" ON "orders_delivery" ("status")`,
    );

    // Create notifications table
    await queryRunner.query(`
            CREATE TABLE "notifications" (
                "id" SERIAL NOT NULL,
                "userId" integer,
                "type" character varying(50) NOT NULL,
                "title" character varying(255) NOT NULL,
                "message" text NOT NULL,
                "data" jsonb,
                "isRead" boolean NOT NULL DEFAULT false,
                "dateCreated" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_userId" ON "notifications" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_isRead" ON "notifications" ("isRead")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_dateCreated" ON "notifications" ("dateCreated")`,
    );

    // Create portal table
    await queryRunner.query(`
            CREATE TABLE "portal" (
                "id" SERIAL NOT NULL,
                "email" character varying(255) NOT NULL,
                "password" character varying(255) NOT NULL,
                "name" character varying(255),
                "role" character varying(50) NOT NULL DEFAULT 'admin',
                "isActive" boolean NOT NULL DEFAULT true,
                "dateCreated" TIMESTAMP NOT NULL DEFAULT now(),
                "dateUpdated" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_portal_email" UNIQUE ("email"),
                CONSTRAINT "PK_portal" PRIMARY KEY ("id")
            )
        `);

    // Add foreign key constraints
    await queryRunner.query(`
            ALTER TABLE "documents" 
            ADD CONSTRAINT "FK_documents_customerId" 
            FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "document_items" 
            ADD CONSTRAINT "FK_document_items_documentId" 
            FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "invoices" 
            ADD CONSTRAINT "FK_invoices_customerId" 
            FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "invoice_items" 
            ADD CONSTRAINT "FK_invoice_items_invoiceId" 
            FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoice_items" DROP CONSTRAINT "FK_invoice_items_invoiceId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT "FK_invoices_customerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_items" DROP CONSTRAINT "FK_document_items_documentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" DROP CONSTRAINT "FK_documents_customerId"`,
    );
    await queryRunner.query(`DROP TABLE "portal"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TABLE "orders_delivery"`);
    await queryRunner.query(`DROP TABLE "delivery_persons"`);
    await queryRunner.query(`DROP TABLE "invoice_items"`);
    await queryRunner.query(`DROP TABLE "invoices"`);
    await queryRunner.query(`DROP TABLE "document_items"`);
    await queryRunner.query(`DROP TABLE "documents"`);
    await queryRunner.query(`DROP TABLE "customers"`);
    await queryRunner.query(`DROP TABLE "products"`);
  }
}
