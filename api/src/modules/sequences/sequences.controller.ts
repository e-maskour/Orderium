import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  ParseIntPipe,
  DefaultValuePipe,
  Optional,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SequencesService } from './sequences.service';
import { CreateSequenceDto } from './dto/create-sequence.dto';
import { UpdateSequenceDto } from './dto/update-sequence.dto';
import { SequenceResponseDto } from './dto/sequence-response.dto';
import { ApiRes } from '../../common/api-response';
import { SEQ } from '../../common/response-codes';

@ApiTags('Sequences')
@Controller('sequences')
export class SequencesController {
  private readonly logger = new Logger(SequencesController.name);

  constructor(private readonly sequencesService: SequencesService) { }

  @Get()
  @ApiOperation({ summary: 'List all sequences for the current tenant' })
  @ApiResponse({ status: 200, type: [SequenceResponseDto] })
  async findAll() {
    const sequences = await this.sequencesService.findAll();
    return ApiRes(SEQ.LIST, sequences);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a sequence by ID' })
  @ApiResponse({ status: 200, type: SequenceResponseDto })
  async findOne(@Param('id') id: string) {
    const sequence = await this.sequencesService.findOne(id);
    return ApiRes(SEQ.DETAIL, sequence);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new sequence' })
  @ApiResponse({ status: 201, type: SequenceResponseDto })
  async create(@Body() dto: CreateSequenceDto) {
    const sequence = await this.sequencesService.create(dto);
    return ApiRes(SEQ.CREATED, sequence);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Update sequence settings (prefix, format flags, reset period, etc.)',
  })
  @ApiResponse({ status: 200, type: SequenceResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdateSequenceDto) {
    const sequence = await this.sequencesService.update(id, dto);
    return ApiRes(SEQ.UPDATED, sequence);
  }

  @Post(':entityType/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually reset a sequence counter (admin action)' })
  @ApiQuery({
    name: 'resetTo',
    required: false,
    type: Number,
    description: 'Reset counter to this value (default: 1)',
  })
  async resetCounter(
    @Param('entityType') entityType: string,
    @Query('resetTo', new DefaultValuePipe(1), ParseIntPipe) resetTo: number,
  ) {
    await this.sequencesService.resetCounter(entityType, resetTo);
    return ApiRes(SEQ.RESET, null);
  }

  @Get(':entityType/preview')
  @ApiOperation({
    summary: 'Preview the next document number without incrementing',
  })
  @ApiResponse({
    status: 200,
    description: 'Preview of the next document number',
  })
  async getPreview(@Param('entityType') entityType: string) {
    const preview = await this.sequencesService.getPreview(entityType);
    return ApiRes(SEQ.PREVIEW, { preview });
  }

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Seed default sequences for this tenant (idempotent)',
  })
  async seedDefaults() {
    await this.sequencesService.seedDefaults();
    return ApiRes(SEQ.SEEDED, null);
  }
}
