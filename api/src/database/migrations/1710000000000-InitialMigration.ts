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

    // Create orders table
    await queryRunner.query(`
            CREATE TABLE "orders" (
                "id" SERIAL NOT NULL,
                "number" character varying(50) NOT NULL,
                "adminId" integer,
                "customerId" integer,
                "orderNumber" character varying(50),
                "date" date NOT NULL,
                "stockDate" date NOT NULL,
                "total" numeric(18,2) NOT NULL DEFAULT 0,
                "isClockedOut" boolean NOT NULL DEFAULT false,
                "documentTypeId" integer,
                "warehouseId" integer,
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
                CONSTRAINT "UQ_orders_number" UNIQUE ("number"),
                CONSTRAINT "PK_orders" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_number" ON "orders" ("number")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_orderNumber" ON "orders" ("orderNumber")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_customerId" ON "orders" ("customerId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_date" ON "orders" ("date")`,
    );

    // Create order_items table
    await queryRunner.query(`
            CREATE TABLE "order_items" (
                "id" SERIAL NOT NULL,
                "orderId" integer NOT NULL,
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
                CONSTRAINT "PK_order_items" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "IDX_order_items_orderId" ON "order_items" ("orderId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_items_productId" ON "order_items" ("productId")`,
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
                "phoneNumber" character varying(50) NOT NULL,
                "password" character varying(255) NOT NULL,
                "name" character varying(255),
                "email" character varying(255),
                "isAdmin" boolean NOT NULL DEFAULT false,
                "isCustomer" boolean NOT NULL DEFAULT false,
                "customerId" integer,
                "isDelivery" boolean NOT NULL DEFAULT false,
                "deliveryId" integer,
                "isActive" boolean NOT NULL DEFAULT true,
                "dateCreated" TIMESTAMP NOT NULL DEFAULT now(),
                "dateUpdated" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_portal_phoneNumber" UNIQUE ("phoneNumber"),
                CONSTRAINT "PK_portal" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "IDX_portal_phoneNumber" ON "portal" ("phoneNumber")`,
    );

    // Add foreign key constraints
    await queryRunner.query(`
            ALTER TABLE "orders" 
            ADD CONSTRAINT "FK_orders_customerId" 
            FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "order_items" 
            ADD CONSTRAINT "FK_order_items_orderId" 
            FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION
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

    await queryRunner.query(`
            ALTER TABLE "portal" 
            ADD CONSTRAINT "FK_portal_customerId" 
            FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "portal" 
            ADD CONSTRAINT "FK_portal_deliveryId" 
            FOREIGN KEY ("deliveryId") REFERENCES "delivery_persons"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "portal" DROP CONSTRAINT "FK_portal_deliveryId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "portal" DROP CONSTRAINT "FK_portal_customerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoice_items" DROP CONSTRAINT "FK_invoice_items_invoiceId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT "FK_invoices_customerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_order_items_orderId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_customerId"`,
    );
    await queryRunner.query(`DROP TABLE "portal"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TABLE "orders_delivery"`);
    await queryRunner.query(`DROP TABLE "delivery_persons"`);
    await queryRunner.query(`DROP TABLE "invoice_items"`);
    await queryRunner.query(`DROP TABLE "invoices"`);
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TABLE "customers"`);
    await queryRunner.query(`DROP TABLE "products"`);
  }
}
