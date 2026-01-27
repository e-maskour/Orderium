import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';

@ApiTags('Quotes')
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all quotes' })
  async findAll(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const quotes = await this.quotesService.findAll(limitNum);
    return { success: true, quotes, count: quotes.length };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quote by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const quote = await this.quotesService.findOne(id);
    return { success: true, quote };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new quote' })
  async create(@Body() createQuoteDto: any) {
    const quote = await this.quotesService.create(createQuoteDto);
    return { success: true, quote };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a quote' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateQuoteDto: any) {
    const quote = await this.quotesService.update(id, updateQuoteDto);
    return { success: true, quote };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a quote' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.quotesService.remove(id);
    return { success: true, message: 'Quote deleted successfully' };
  }

  @Put(':id/validate')
  @ApiOperation({ summary: 'Validate a quote (change from draft to sent)' })
  async validate(@Param('id', ParseIntPipe) id: number) {
    const quote = await this.quotesService.validate(id);
    return { success: true, quote };
  }

  @Put(':id/devalidate')
  @ApiOperation({ summary: 'Devalidate a quote (change back to draft)' })
  async devalidate(@Param('id', ParseIntPipe) id: number) {
    const quote = await this.quotesService.devalidate(id);
    return { success: true, quote };
  }

  @Put(':id/accept')
  @ApiOperation({ summary: 'Accept a quote' })
  async accept(@Param('id', ParseIntPipe) id: number) {
    const quote = await this.quotesService.accept(id);
    return { success: true, quote };
  }

  @Put(':id/reject')
  @ApiOperation({ summary: 'Reject a quote' })
  async reject(@Param('id', ParseIntPipe) id: number) {
    const quote = await this.quotesService.reject(id);
    return { success: true, quote };
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Generate share link for quote' })
  async generateShareLink(@Param('id', ParseIntPipe) id: number) {
    const result = await this.quotesService.generateShareLink(id);
    return { success: true, ...result };
  }

  @Get('shared/:token')
  @ApiOperation({ summary: 'Get quote by share token (public)' })
  async getByShareToken(@Param('token') token: string) {
    const quote = await this.quotesService.getByShareToken(token);
    return { success: true, quote };
  }

  @Post('shared/:token/sign')
  @ApiOperation({ summary: 'Sign quote via share link (public)' })
  async signQuote(
    @Param('token') token: string,
    @Body() signData: { signedBy: string; clientNotes?: string }
  ) {
    const quote = await this.quotesService.signQuote(token, signData.signedBy, signData.clientNotes);
    return { success: true, quote };
  }

  @Put(':id/unsign')
  @ApiOperation({ summary: 'Refuse a signed quote and set status to closed (admin only)' })
  async unsignQuote(@Param('id', ParseIntPipe) id: number) {
    const quote = await this.quotesService.unsignQuote(id);
    return { success: true, quote };
  }

  @Put(':id/convert-to-order')
  @ApiOperation({ summary: 'Mark quote as converted to order (bon de livraison)' })
  async convertToOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { orderId: number }
  ) {
    const quote = await this.quotesService.convertToOrder(id, body.orderId);
    return { success: true, quote };
  }

  @Put(':id/convert-to-invoice')
  @ApiOperation({ summary: 'Mark quote as converted to invoice (facture)' })
  async convertToInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { invoiceId: number }
  ) {
    const quote = await this.quotesService.convertToInvoice(id, body.invoiceId);
    return { success: true, quote };
  }
}
