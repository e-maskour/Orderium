import { Controller, Get, Query, Header, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiRes } from '../../../common/api-response';
import { RPT } from '../../../common/response-codes';
import { InvoiceReportsService } from './invoice-reports.service';
import {
  InvoiceReportFilterDto,
  ReportFilterDto,
  AgingReportFilterDto,
} from '../dto/report-filter.dto';

@ApiTags('Reports — Invoices')
@Controller('reports/invoices')
export class InvoiceReportsController {
  constructor(private readonly service: InvoiceReportsService) {}

  @Get('journal-vente')
  @ApiOperation({
    summary: 'Sales invoice journal (journal des factures vente)',
  })
  @ApiResponse({ status: 200 })
  async getJournalVente(@Query() filter: InvoiceReportFilterDto) {
    return ApiRes(
      RPT.INVOICE_JOURNAL_VENTE,
      await this.service.getJournalVente(filter),
    );
  }

  @Get('journal-achat')
  @ApiOperation({
    summary: 'Purchase invoice journal (journal des factures achat)',
  })
  @ApiResponse({ status: 200 })
  async getJournalAchat(@Query() filter: InvoiceReportFilterDto) {
    return ApiRes(
      RPT.INVOICE_JOURNAL_ACHAT,
      await this.service.getJournalAchat(filter),
    );
  }

  @Get('tva-summary')
  @ApiOperation({ summary: 'TVA summary by Moroccan rate (20/14/10/7/0%)' })
  @ApiResponse({ status: 200 })
  async getTvaSummary(@Query() filter: InvoiceReportFilterDto) {
    return ApiRes(
      RPT.INVOICE_TVA_SUMMARY,
      await this.service.getTvaSummary(filter),
    );
  }

  @Get('outstanding')
  @ApiOperation({ summary: 'Outstanding (impayées) invoices' })
  @ApiResponse({ status: 200 })
  async getOutstanding(@Query() filter: ReportFilterDto) {
    return ApiRes(
      RPT.INVOICE_OUTSTANDING,
      await this.service.getOutstanding(filter),
    );
  }

  @Get('aging-balance')
  @ApiOperation({
    summary: 'Aging balance by partner (0 / 1-30 / 31-60 / 61-90 / +90 days)',
  })
  @ApiResponse({ status: 200 })
  async getAgingBalance(@Query() filter: AgingReportFilterDto) {
    return ApiRes(
      RPT.INVOICE_AGING,
      await this.service.getAgingBalance(filter),
    );
  }

  // ── XLSX exports ──────────────────────────────────────────────────────────

  @Get('journal-vente/xlsx')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOperation({ summary: 'Export sales journal as XLSX' })
  async getJournalVenteXlsx(
    @Query() filter: InvoiceReportFilterDto,
    @Res() res: Response,
  ) {
    const buffer = await this.service.getJournalVenteXlsx(filter);
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="journal-ventes.xlsx"',
    );
    res.end(buffer);
  }

  @Get('tva-summary/xlsx')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOperation({ summary: 'Export TVA summary as XLSX' })
  async getTvaSummaryXlsx(
    @Query() filter: InvoiceReportFilterDto,
    @Res() res: Response,
  ) {
    const buffer = await this.service.getTvaSummaryXlsx(filter);
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="recap-tva.xlsx"',
    );
    res.end(buffer);
  }
}
