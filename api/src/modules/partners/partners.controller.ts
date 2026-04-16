import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { PartnerResponseDto } from './dto/partner-response.dto';
import { ApiRes } from '../../common/api-response';
import { PTR } from '../../common/response-codes';
import { PortalRoute } from '../auth/decorators/portal-route.decorator';
import { Serialize } from '../../common/decorators/serialize.decorator';
import { SERIALIZE_KEY } from '../../common/interceptors/serialize.interceptor';

@ApiTags('Partners')
@PortalRoute()
@Serialize(PartnerResponseDto)
@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new partner' })
  @ApiResponse({ status: 201, description: 'Partner created successfully' })
  @ApiResponse({ status: 409, description: 'Phone number already exists' })
  async create(@Body() createPartnerDto: CreatePartnerDto) {
    const partner = await this.partnersService.create(createPartnerDto);
    return ApiRes(PTR.CREATED, partner);
  }

  @Post('upsert')
  @ApiOperation({ summary: 'Create or update partner and link to portal' })
  @ApiResponse({ status: 201, description: 'Partner upserted successfully' })
  async upsert(
    @Body()
    body: CreatePartnerDto & { portalPhoneNumber?: string },
  ) {
    const { portalPhoneNumber, ...createPartnerDto } = body;
    const partner = await this.partnersService.upsert(
      createPartnerDto,
      portalPhoneNumber,
    );
    return ApiRes(PTR.UPSERTED, partner);
  }

  @Get()
  @ApiOperation({ summary: 'Get all partners' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Partners retrieved successfully' })
  async findAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
  ) {
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit ?? '100', 10) || 100),
    );
    const offsetNum = Math.max(0, parseInt(offset ?? '0', 10) || 0);

    const { partners, total } = await this.partnersService.findAll(
      limitNum,
      offsetNum,
      search,
    );

    return ApiRes(PTR.LIST, partners, {
      limit: limitNum,
      offset: offsetNum,
      total,
      hasNext: offsetNum + limitNum < total,
      hasPrev: offsetNum > 0,
    });
  }

  @Get('dashboard/customers')
  @ApiOperation({ summary: 'Get customers dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
  })
  async getCustomersDashboard() {
    const stats = await this.partnersService.getCustomersDashboard();
    return ApiRes(PTR.CUSTOMER_DASHBOARD, stats);
  }

  @Get('dashboard/suppliers')
  @ApiOperation({ summary: 'Get suppliers dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
  })
  async getSuppliersDashboard() {
    const stats = await this.partnersService.getSuppliersDashboard();
    return ApiRes(PTR.SUPPLIER_DASHBOARD, stats);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search partners by phone' })
  @ApiQuery({ name: 'phone', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Partners found' })
  async search(@Query('phone') phone: string) {
    const partners = await this.partnersService.searchByPhone(phone);
    return ApiRes(PTR.SEARCH, partners);
  }

  @Get('phone/:phoneNumber')
  @ApiOperation({ summary: 'Get partner by phone number' })
  @ApiResponse({ status: 200, description: 'Partner retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async findByPhone(@Param('phoneNumber') phoneNumber: string) {
    const partner = await this.partnersService.findByPhone(phoneNumber);
    return ApiRes(PTR.BY_PHONE, partner);
  }

  @Get(':id/customer-analytics')
  @SetMetadata(SERIALIZE_KEY, null)
  @ApiOperation({ summary: 'Get customer analytics with chart data and KPIs' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Customer analytics retrieved successfully',
  })
  async getCustomerAnalytics(
    @Param('id', ParseIntPipe) id: number,
    @Query('year') year?: string,
  ) {
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const analytics = await this.partnersService.getCustomerAnalytics(
      id,
      yearNum,
    );
    return ApiRes(PTR.CUSTOMER_ANALYTICS, analytics);
  }

  @Get(':id/supplier-analytics')
  @SetMetadata(SERIALIZE_KEY, null)
  @ApiOperation({ summary: 'Get supplier analytics with chart data and KPIs' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Supplier analytics retrieved successfully',
  })
  async getSupplierAnalytics(
    @Param('id', ParseIntPipe) id: number,
    @Query('year') year?: string,
  ) {
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const analytics = await this.partnersService.getSupplierAnalytics(
      id,
      yearNum,
    );
    return ApiRes(PTR.SUPPLIER_ANALYTICS, analytics);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get partner by ID' })
  @ApiResponse({ status: 200, description: 'Partner retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const partner = await this.partnersService.findOne(id);
    return ApiRes(PTR.DETAIL, partner);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a partner' })
  @ApiResponse({ status: 200, description: 'Partner updated successfully' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  @ApiResponse({ status: 409, description: 'Phone number already exists' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePartnerDto: UpdatePartnerDto,
  ) {
    const partner = await this.partnersService.update(id, updatePartnerDto);
    return ApiRes(PTR.UPDATED, partner);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a partner' })
  @ApiResponse({ status: 200, description: 'Partner deleted successfully' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.partnersService.remove(id);
    return ApiRes(PTR.DELETED, null);
  }
}
