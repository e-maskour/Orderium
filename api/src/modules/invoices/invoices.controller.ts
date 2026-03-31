import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { Res, Header } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { FilterInvoicesDto } from './dto/filter-invoices.dto';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';
import { ApiRes } from '../../common/api-response';
import { INV } from '../../common/response-codes';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) { }

  @Post('list')
  @ApiOperation({ summary: 'Get all invoices with filters (POST method)' })
  @ApiResponse({ status: 200, description: 'Invoices retrieved' })
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
  @ApiResponse({ status: 200, description: 'Invoices retrieved' })
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
  @ApiResponse({ status: 200, description: 'Analytics retrieved' })
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
  @ApiResponse({ status: 200, description: 'Invoice retrieved' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const invoice = await this.invoicesService.findOne(id);
    return ApiRes(INV.DETAIL, invoice);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async create(@Body() createInvoiceDto: CreateInvoiceDto) {
    const invoice = await this.invoicesService.create(createInvoiceDto);
    return ApiRes(INV.CREATED, invoice);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an invoice' })
  @ApiResponse({ status: 200, description: 'Invoice updated' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ) {
    const invoice = await this.invoicesService.update(
      id,
      updateInvoiceDto,
    );
    return ApiRes(INV.UPDATED, invoice);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an invoice' })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Invoice deleted' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.invoicesService.remove(id);
    return ApiRes(INV.DELETED, null);
  }

  @Put(':id/validate')
  @ApiOperation({
    summary: 'Validate an invoice (change from draft to unpaid)',
  })
  @ApiResponse({ status: 200, description: 'Invoice validated' })
  async validate(@Param('id', ParseIntPipe) id: number) {
    const invoice = await this.invoicesService.validate(id);
    return ApiRes(INV.VALIDATED, invoice);
  }

  @Put(':id/devalidate')
  @ApiOperation({ summary: 'Devalidate an invoice (change back to draft)' })
  @ApiResponse({ status: 200, description: 'Invoice devalidated' })
  async devalidate(@Param('id', ParseIntPipe) id: number) {
    const invoice = await this.invoicesService.devalidate(id);
    return ApiRes(INV.DEVALIDATED, invoice);
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Generate a shareable public link for an invoice' })
  @ApiResponse({ status: 200, description: 'Share link generated' })
  async generateShareLink(@Param('id', ParseIntPipe) id: number) {
    const result = await this.invoicesService.generateShareLink(id);
    return ApiRes(INV.SHARED, result);
  }

  @Public()
  @Get('shared/:token')
  @ApiOperation({ summary: 'Get invoice by share token (public, no auth required)' })
  @ApiResponse({ status: 200, description: 'Invoice retrieved' })
  async getByShareToken(@Param('token') token: string) {
    const invoice = await this.invoicesService.getByShareToken(token);
    return ApiRes(INV.SHARED_DETAIL, invoice);
  }

  @Delete(':id/share')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke share link for an invoice' })
  @ApiResponse({ status: 200, description: 'Share link revoked' })
  async revokeShareLink(@Param('id', ParseIntPipe) id: number) {
    await this.invoicesService.revokeShareLink(id);
    return ApiRes(INV.SHARE_REVOKED, null);
  }

  @Get('export/xlsx')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOperation({ summary: 'Export invoices to XLSX file' })
  @ApiResponse({ status: 200, description: 'Export successful' })
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
