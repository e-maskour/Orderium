import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigurationsService } from './configurations.service';
import { CreateConfigurationDto } from './dto/create-configuration.dto';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';

@ApiTags('Configurations')
@Controller('configurations')
export class ConfigurationsController {
  constructor(
    private readonly configurationsService: ConfigurationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all configurations' })
  async findAll() {
    const configurations = await this.configurationsService.findAll();
    return { success: true, configurations };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get configuration by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const configuration = await this.configurationsService.findOne(id);
    return { success: true, configuration };
  }

  @Get('entity/:entity')
  @ApiOperation({ summary: 'Get configuration by entity name' })
  async findByEntity(@Param('entity') entity: string) {
    const configuration =
      await this.configurationsService.findByEntity(entity);
    return { success: true, configuration };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new configuration' })
  async create(@Body() createDto: CreateConfigurationDto) {
    const configuration = await this.configurationsService.create(createDto);
    return { success: true, configuration };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a configuration' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateConfigurationDto,
  ) {
    const configuration = await this.configurationsService.update(
      id,
      updateDto,
    );
    return { success: true, configuration };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a configuration' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.configurationsService.delete(id);
  }
}
