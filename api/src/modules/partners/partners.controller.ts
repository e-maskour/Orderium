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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';

@ApiTags('Partners')
@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new partner' })
  @ApiResponse({ status: 201, description: 'Partner created successfully' })
  @ApiResponse({ status: 409, description: 'Phone number already exists' })
  async create(@Body() createPartnerDto: CreatePartnerDto) {
    const partner = await this.partnersService.create(createPartnerDto);
    return {
      success: true,
      partner,
    };
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
    return {
      success: true,
      partner,
    };
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
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    const { partners, total } = await this.partnersService.findAll(
      limitNum,
      offsetNum,
      search,
    );

    return {
      success: true,
      partners,
      total,
      limit: limitNum,
      offset: offsetNum,
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search partners by phone' })
  @ApiQuery({ name: 'phone', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Partners found' })
  async search(@Query('phone') phone: string) {
    const partners = await this.partnersService.searchByPhone(phone);
    return {
      success: true,
      partners,
    };
  }

  @Get('phone/:phoneNumber')
  @ApiOperation({ summary: 'Get partner by phone number' })
  @ApiResponse({ status: 200, description: 'Partner retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async findByPhone(@Param('phoneNumber') phoneNumber: string) {
    const partner = await this.partnersService.findByPhone(phoneNumber);
    return {
      success: true,
      partner,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get partner by ID' })
  @ApiResponse({ status: 200, description: 'Partner retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const partner = await this.partnersService.findOne(id);
    return {
      success: true,
      partner,
    };
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
    return {
      success: true,
      partner,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a partner' })
  @ApiResponse({ status: 200, description: 'Partner deleted successfully' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.partnersService.remove(id);
    return {
      success: true,
      message: 'Partner deleted successfully',
    };
  }
}
