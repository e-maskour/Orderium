import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { Res, Header } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { FilterInvoicesDto } from './dto/filter-invoices.dto';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';
import { ApiRes } from '../../common/api-response';
import { INV } from '../../common/response-codes';

@ApiTags('Invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post('list')
  @ApiOperation({ summary: 'Get all invoices with filters (POST method)' })
  async findAll(
    @Body() filterDto: FilterInvoicesDto,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('direction') direction?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) || undefined : undefined;
    const pageSizeNum = pageSize
      ? Math.min(100, Math.max(1, parseInt(pageSize, 10) || 50))
      : undefined;
    const directionValue =
      direction?.toUpperCase() === 'ACHAT'
        ? 'ACHAT'
        : direction?.toUpperCase() === 'VENTE'
          ? 'VENTE'
          : undefined;

    const result = await this.invoicesService.findAll(
      filterDto.search,
      filterDto.status,
      filterDto.customerId,
      filterDto.supplierId,
      filterDto.dateFrom,
      filterDto.dateTo,
      pageNum,
      pageSizeNum,
      directionValue,
    );
    const effectivePage = pageNum ?? 1;
    const effectiveLimit = pageSizeNum ?? 50;
    const offset = (effectivePage - 1) * effectiveLimit;
    return ApiRes(INV.FILTERED, result.invoices, {
      limit: effectiveLimit,
      offset,
      total: result.totalCount,
      hasNext: offset + effectiveLimit < result.totalCount,
      hasPrev: offset > 0,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'Get all invoices (legacy - use POST /list instead)',
  })
  async findAllLegacy(
    @Query('limit') limit?: string,
    @Query('direction') direction?: string,
  ) {
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit ?? '100', 10) || 100),
    );
    const directionValue =
      direction?.toUpperCase() === 'ACHAT'
        ? 'ACHAT'
        : direction?.toUpperCase() === 'VENTE'
          ? 'VENTE'
          : undefined;
    const result = await this.invoicesService.findAll(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      limitNum,
      directionValue,
    );
    return ApiRes(INV.LIST, result.invoices, {
      limit: limitNum,
      offset: 0,
      total: result.count,
      hasNext: false,
      hasPrev: false,
    });
  }

  @Get('analytics/:direction')
  @ApiOperation({ summary: 'Get invoice analytics with chart data and KPIs' })
  async getAnalytics(
    @Param('direction') direction: 'vente' | 'achat',
    @Query('year') year?: string,
  ) {
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const analytics = await this.invoicesService.getAnalytics(
      direction,
      yearNum,
    );
    return ApiRes(INV.ANALYTICS, analytics);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const invoice = await this.invoicesService.findOne(id);
    return ApiRes(INV.DETAIL, invoice);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  async create(@Body() createInvoiceDto: CreateInvoiceDto) {
    const invoice = await this.invoicesService.create(createInvoiceDto as any);
    return ApiRes(INV.CREATED, invoice);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an invoice' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ) {
    const invoice = await this.invoicesService.update(
      id,
      updateInvoiceDto as any,
    );
    return ApiRes(INV.UPDATED, invoice);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an invoice' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.invoicesService.remove(id);
    return ApiRes(INV.DELETED, null);
  }

  @Put(':id/validate')
  @ApiOperation({
    summary: 'Validate an invoice (change from draft to unpaid)',
  })
  async validate(@Param('id', ParseIntPipe) id: number) {
    const invoice = await this.invoicesService.validate(id);
    return ApiRes(INV.VALIDATED, invoice);
  }

  @Put(':id/devalidate')
  @ApiOperation({ summary: 'Devalidate an invoice (change back to draft)' })
  async devalidate(@Param('id', ParseIntPipe) id: number) {
    const invoice = await this.invoicesService.devalidate(id);
    return ApiRes(INV.DEVALIDATED, invoice);
  }

  @Get('export/xlsx')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOperation({ summary: 'Export invoices to XLSX file' })
  async exportToXlsx(
    @Res() res: Response,
    @Query('supplierId') supplierId?: string,
  ) {
    const supplierIdNum = supplierId ? parseInt(supplierId, 10) : undefined;
    const buffer = await this.invoicesService.exportToXlsx(supplierIdNum);

    const filename =
      supplierIdNum !== undefined
        ? supplierIdNum
          ? 'factures-achat.xlsx'
          : 'factures-vente.xlsx'
        : 'factures.xlsx';

    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  }
}
