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
import { QuotesService } from './quotes.service';
import { FilterQuotesDto } from './dto/filter-quotes.dto';
import { CreateQuoteDto, UpdateQuoteDto } from './dto/quote.dto';
import {
  QuoteListResponseDto,
  QuoteDetailResponseDto,
} from './dto/quote-response.dto';
import { Public } from '../auth/decorators/public.decorator';
import { ApiRes } from '../../common/api-response';
import { QUO } from '../../common/response-codes';
import { Serialize } from '../../common/decorators/serialize.decorator';

@ApiTags('Quotes')
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post('list')
  @Serialize(QuoteListResponseDto)
  @ApiOperation({ summary: 'Get all quotes with filters (POST method)' })
  @ApiResponse({ status: 200, description: 'Quotes retrieved' })
  async findAll(
    @Body() filterDto: FilterQuotesDto,
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

    const result = await this.quotesService.findAll(
      filterDto.search,
      filterDto.status,
      filterDto.customerId,
      filterDto.dateFrom,
      filterDto.dateTo,
      pageNum,
      pageSizeNum,
      filterDto.supplierId,
      directionValue,
    );
    const effectivePage = pageNum ?? 1;
    const effectiveLimit = pageSizeNum ?? 50;
    const offset = (effectivePage - 1) * effectiveLimit;
    return ApiRes(QUO.FILTERED, result.quotes, {
      limit: effectiveLimit,
      offset,
      total: result.totalCount,
      hasNext: offset + effectiveLimit < result.totalCount,
      hasPrev: offset > 0,
    });
  }

  @Post('aggregates')
  @ApiOperation({ summary: 'Get financial aggregates for filtered quotes' })
  @ApiResponse({ status: 200, description: 'Quote aggregates retrieved' })
  async getAggregates(
    @Body() filterDto: FilterQuotesDto,
    @Query('direction') direction?: string,
  ) {
    const directionValue =
      direction?.toUpperCase() === 'ACHAT'
        ? 'ACHAT'
        : direction?.toUpperCase() === 'VENTE'
          ? 'VENTE'
          : undefined;

    const aggregates = await this.quotesService.getAggregates(
      filterDto.search,
      filterDto.status,
      filterDto.customerId,
      filterDto.dateFrom,
      filterDto.dateTo,
      filterDto.supplierId,
      directionValue,
    );

    return ApiRes(QUO.AGGREGATES, aggregates);
  }

  @Get()
  @Serialize(QuoteListResponseDto)
  @ApiOperation({ summary: 'Get all quotes (legacy - use POST /list instead)' })
  @ApiResponse({ status: 200, description: 'Quotes retrieved' })
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
    const result = await this.quotesService.findAll(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      limitNum,
      undefined,
      directionValue,
    );
    return ApiRes(QUO.LIST, result.quotes, {
      limit: limitNum,
      offset: 0,
      total: result.count,
      hasNext: false,
      hasPrev: false,
    });
  }

  @Get(':id')
  @Serialize(QuoteDetailResponseDto)
  @ApiOperation({ summary: 'Get quote by ID' })
  @ApiResponse({ status: 200, description: 'Quote retrieved' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const quote = await this.quotesService.findOne(id);
    return ApiRes(QUO.DETAIL, quote);
  }

  @Post()
  @Serialize(QuoteDetailResponseDto)
  @ApiOperation({ summary: 'Create a new quote' })
  @ApiResponse({ status: 201, description: 'Quote created' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async create(@Body() createQuoteDto: CreateQuoteDto) {
    const quote = await this.quotesService.create(createQuoteDto);
    return ApiRes(QUO.CREATED, quote);
  }

  @Patch(':id')
  @Serialize(QuoteDetailResponseDto)
  @ApiOperation({ summary: 'Update a quote' })
  @ApiResponse({ status: 200, description: 'Quote updated' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateQuoteDto: UpdateQuoteDto,
  ) {
    const quote = await this.quotesService.update(id, updateQuoteDto);
    return ApiRes(QUO.UPDATED, quote);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a quote' })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Quote deleted' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.quotesService.remove(id);
    return ApiRes(QUO.DELETED, null);
  }

  @Put(':id/validate')
  @Serialize(QuoteDetailResponseDto)
  @ApiOperation({ summary: 'Validate a quote (change from draft to sent)' })
  @ApiResponse({ status: 200, description: 'Quote validated' })
  async validate(@Param('id', ParseIntPipe) id: number) {
    const quote = await this.quotesService.validate(id);
    return ApiRes(QUO.VALIDATED, quote);
  }

  @Put(':id/devalidate')
  @Serialize(QuoteDetailResponseDto)
  @ApiOperation({ summary: 'Devalidate a quote (change back to draft)' })
  @ApiResponse({ status: 200, description: 'Quote devalidated' })
  async devalidate(@Param('id', ParseIntPipe) id: number) {
    const quote = await this.quotesService.devalidate(id);
    return ApiRes(QUO.DEVALIDATED, quote);
  }

  @Put(':id/accept')
  @Serialize(QuoteDetailResponseDto)
  @ApiOperation({ summary: 'Accept a quote' })
  @ApiResponse({ status: 200, description: 'Quote accepted' })
  async accept(@Param('id', ParseIntPipe) id: number) {
    const quote = await this.quotesService.accept(id);
    return ApiRes(QUO.ACCEPTED, quote);
  }

  @Put(':id/reject')
  @Serialize(QuoteDetailResponseDto)
  @ApiOperation({ summary: 'Reject a quote' })
  @ApiResponse({ status: 200, description: 'Quote rejected' })
  async reject(@Param('id', ParseIntPipe) id: number) {
    const quote = await this.quotesService.reject(id);
    return ApiRes(QUO.REJECTED, quote);
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Generate share link for quote' })
  @ApiResponse({ status: 200, description: 'Share link generated' })
  async generateShareLink(@Param('id', ParseIntPipe) id: number) {
    const result = await this.quotesService.generateShareLink(id);
    return ApiRes(QUO.SHARED, result);
  }

  @Public()
  @Get('shared/:token')
  @Serialize(QuoteDetailResponseDto)
  @ApiOperation({ summary: 'Get quote by share token (public)' })
  @ApiResponse({ status: 200, description: 'Shared quote retrieved' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async getByShareToken(@Param('token') token: string) {
    const quote = await this.quotesService.getByShareToken(token);
    return ApiRes(QUO.SHARED_DETAIL, quote);
  }

  @Public()
  @Post('shared/:token/sign')
  @Serialize(QuoteDetailResponseDto)
  @ApiOperation({ summary: 'Sign quote via share link (public)' })
  @ApiResponse({ status: 200, description: 'Quote signed' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async signQuote(
    @Param('token') token: string,
    @Body() signData: { signedBy: string; clientNotes?: string },
  ) {
    const quote = await this.quotesService.signQuote(
      token,
      signData.signedBy,
      signData.clientNotes,
    );
    return ApiRes(QUO.SIGNED, quote);
  }

  @Put(':id/unsign')
  @Serialize(QuoteDetailResponseDto)
  @ApiOperation({
    summary: 'Refuse a signed quote and set status to closed (admin only)',
  })
  @ApiResponse({ status: 200, description: 'Quote unsigned' })
  async unsignQuote(@Param('id', ParseIntPipe) id: number) {
    const quote = await this.quotesService.unsignQuote(id);
    return ApiRes(QUO.UNSIGNED, quote);
  }

  @Put(':id/convert-to-order')
  @Serialize(QuoteDetailResponseDto)
  @ApiOperation({
    summary: 'Mark quote as converted to order (bon de livraison)',
  })
  @ApiResponse({ status: 200, description: 'Quote converted to order' })
  async convertToOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { orderId: number },
  ) {
    const quote = await this.quotesService.convertToOrder(id, body.orderId);
    return ApiRes(QUO.CONVERTED_ORDER, quote);
  }

  @Put(':id/convert-to-invoice')
  @Serialize(QuoteDetailResponseDto)
  @ApiOperation({ summary: 'Mark quote as converted to invoice (facture)' })
  @ApiResponse({ status: 200, description: 'Quote converted to invoice' })
  async convertToInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { invoiceId: number },
  ) {
    const quote = await this.quotesService.convertToInvoice(id, body.invoiceId);
    return ApiRes(QUO.CONVERTED_INVOICE, quote);
  }

  @Get('analytics/:direction')
  @ApiOperation({ summary: 'Get quote analytics with chart data and KPIs' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved' })
  async getAnalytics(
    @Param('direction') direction: 'vente' | 'achat',
    @Query('year') year?: string,
  ) {
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const analytics = await this.quotesService.getAnalytics(direction, yearNum);
    return ApiRes(QUO.ANALYTICS, analytics);
  }

  @Get('export/xlsx')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOperation({ summary: 'Export quotes/devis to XLSX file' })
  @ApiResponse({ status: 200, description: 'Export successful' })
  async exportToXlsx(
    @Res() res: Response,
    @Query('supplierId') supplierId?: string,
  ) {
    const supplierIdNum = supplierId ? parseInt(supplierId, 10) : undefined;
    const buffer = await this.quotesService.exportToXlsx(supplierIdNum);

    const filename =
      supplierIdNum !== undefined
        ? supplierIdNum
          ? 'demandes-de-prix.xlsx'
          : 'devis.xlsx'
        : 'devis-et-demandes.xlsx';

    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  }
}
