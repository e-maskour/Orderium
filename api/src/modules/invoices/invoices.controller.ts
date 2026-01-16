import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';

@ApiTags('Invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all invoices' })
  async findAll(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const invoices = await this.invoicesService.findAll(limitNum);
    return { success: true, invoices, count: invoices.length };
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
}
