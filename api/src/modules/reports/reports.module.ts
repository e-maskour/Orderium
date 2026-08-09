import { Module } from '@nestjs/common';
import { TenantModule } from '../tenant/tenant.module';

import { SalesReportsService } from './sales/sales-reports.service';
import { SalesReportsController } from './sales/sales-reports.controller';

import { PurchasesReportsService } from './purchases/purchases-reports.service';
import { PurchasesReportsController } from './purchases/purchases-reports.controller';

import { InvoiceReportsService } from './invoices/invoice-reports.service';
import { InvoiceReportsController } from './invoices/invoice-reports.controller';

import { PaymentReportsService } from './payments/payment-reports.service';
import { PaymentReportsController } from './payments/payment-reports.controller';

import { ClientReportsService } from './partners/client-reports.service';
import { ClientReportsController } from './partners/client-reports.controller';

import { SupplierReportsService } from './partners/supplier-reports.service';
import { SupplierReportsController } from './partners/supplier-reports.controller';

import { StockReportsService } from './stock/stock-reports.service';
import { StockReportsController } from './stock/stock-reports.controller';

import { ProductReportsService } from './products/product-reports.service';
import { ProductReportsController } from './products/product-reports.controller';

import { ReportExportService } from './shared/report-export.service';

import { ConfigurationsModule } from '../configurations/configurations.module';
import { PdfReportModule } from '../pdf-report';
import { ReportPdfController } from './pdf/report-pdf.controller';
import { ReportPdfService } from './pdf/report-pdf.service';
import { ReportPdfResolver } from './pdf/report-pdf.resolver';

@Module({
  imports: [TenantModule, ConfigurationsModule, PdfReportModule],
  controllers: [
    ReportPdfController,
    SalesReportsController,
    PurchasesReportsController,
    InvoiceReportsController,
    PaymentReportsController,
    ClientReportsController,
    SupplierReportsController,
    StockReportsController,
    ProductReportsController,
  ],
  providers: [
    SalesReportsService,
    PurchasesReportsService,
    InvoiceReportsService,
    PaymentReportsService,
    ClientReportsService,
    SupplierReportsService,
    StockReportsService,
    ProductReportsService,
    ReportExportService,
    ReportPdfResolver,
    ReportPdfService,
  ],
})
export class ReportsModule {}
