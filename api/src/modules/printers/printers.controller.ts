import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrintersService } from './printers.service';
import { CreatePrinterDto } from './dto/create-printer.dto';
import { UpdatePrinterDto } from './dto/update-printer.dto';
import { ApiRes } from '../../common/api-response';
import { PRI } from '../../common/response-codes';
import { PortalRoute } from '../auth/decorators/portal-route.decorator';

@ApiTags('Printers')
@PortalRoute()
@Controller('printers')
export class PrintersController {
  private readonly logger = new Logger(PrintersController.name);

  constructor(private readonly printersService: PrintersService) {}

  @Get()
  @ApiOperation({ summary: 'List all printers' })
  @ApiResponse({ status: 200, description: 'Printers retrieved' })
  async findAll() {
    const printers = await this.printersService.findAll();
    return ApiRes(PRI.LIST, printers);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get printer by ID' })
  @ApiResponse({ status: 200, description: 'Printer retrieved' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const printer = await this.printersService.findOne(id);
    return ApiRes(PRI.DETAIL, printer);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new printer' })
  @ApiResponse({ status: 201, description: 'Printer created' })
  async create(@Body() dto: CreatePrinterDto) {
    const printer = await this.printersService.create(dto);
    return ApiRes(PRI.CREATED, printer);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a printer' })
  @ApiResponse({ status: 200, description: 'Printer updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePrinterDto,
  ) {
    const printer = await this.printersService.update(id, dto);
    return ApiRes(PRI.UPDATED, printer);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a printer' })
  @ApiResponse({ status: 200, description: 'Printer deleted' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.printersService.remove(id);
    return ApiRes(PRI.DELETED, null);
  }

  @Post(':id/ping')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update printer last_seen_at' })
  @ApiResponse({ status: 200, description: 'Printer pinged' })
  async ping(@Param('id', ParseUUIDPipe) id: string) {
    await this.printersService.ping(id);
    return ApiRes(PRI.PINGED, null);
  }
}
