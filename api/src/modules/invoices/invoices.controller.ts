import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { FilterInvoicesDto } from './dto/filter-invoices.dto';

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
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : undefined;
    
    const result = await this.invoicesService.findAll(
      filterDto.search,
      filterDto.status,
      filterDto.customerId,
      filterDto.supplierId,
      filterDto.dateFrom,
      filterDto.dateTo,
      pageNum,
      pageSizeNum,
    );
    return { success: true, invoices: result.invoices, count: result.count, totalCount: result.totalCount };
  }

  @Get()
  @ApiOperation({ summary: 'Get all invoices (legacy - use POST /list instead)' })
  async findAllLegacy(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const result = await this.invoicesService.findAll(undefined, undefined, undefined, undefined, undefined, undefined, undefined, limitNum);
    return { success: true, invoices: result.invoices, count: result.count };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const invoice = await this.invoicesService.findOne(id);
    return { success: true, invoice };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  async create(@Body() createInvoiceDto: any) {
    const invoice = await this.invoicesService.create(createInvoiceDto);
    return { success: true, invoice };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an invoice' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateInvoiceDto: any) {
    const invoice = await this.invoicesService.update(id, updateInvoiceDto);
    return { success: true, invoice };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an invoice' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.invoicesService.remove(id);
    return { success: true, message: 'Invoice deleted successfully' };
  }

  @Put(':id/validate')
  @ApiOperation({ summary: 'Validate an invoice (change from draft to unpaid)' })
  async validate(@Param('id', ParseIntPipe) id: number) {
    const invoice = await this.invoicesService.validate(id);
    return { success: true, invoice };
  }

  @Put(':id/devalidate')
  @ApiOperation({ summary: 'Devalidate an invoice (change back to draft)' })
  async devalidate(@Param('id', ParseIntPipe) id: number) {
    const invoice = await this.invoicesService.devalidate(id);
    return { success: true, invoice };
  }
}
