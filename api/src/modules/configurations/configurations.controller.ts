import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { ConfigurationsService } from './configurations.service';
import { CreateConfigurationDto } from './dto/create-configuration.dto';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import { CompanyDto } from './dto/company.dto';
import {
  CreateSequenceDto,
  UpdateSequenceDto,
  SequencePreviewDto,
} from './dto/sequence.dto';
import { ApiRes } from '../../common/api-response';
import { CFG } from '../../common/response-codes';
import { SequenceConfig } from '../../common/types/sequence-config.interface';

@ApiTags('Configurations')
@Controller('configurations')
export class ConfigurationsController {
  private readonly logger = new Logger(ConfigurationsController.name);

  constructor(
    private readonly configurationsService: ConfigurationsService,
    @Inject(DataSource) private dataSource: DataSource,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all configurations' })
  @ApiResponse({ status: 200, description: 'List of configurations' })
  async findAll() {
    const configurations = await this.configurationsService.findAll();
    return ApiRes(CFG.LIST, configurations);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get configuration by ID' })
  @ApiResponse({ status: 200, description: 'Configuration details' })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const configuration = await this.configurationsService.findOne(id);
    return ApiRes(CFG.DETAIL, configuration);
  }

  @Get('entity/:entity')
  @ApiOperation({ summary: 'Get configuration by entity name' })
  @ApiResponse({ status: 200, description: 'Configuration details' })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async findByEntity(@Param('entity') entity: string) {
    const configuration = await this.configurationsService.findByEntity(entity);
    // If it's sequences, enhance with real-time next numbers and format info
    if (entity === 'sequences' && configuration?.values?.sequences) {
      const sequences = configuration.values.sequences as SequenceConfig[];
      const enhancedSequences = await Promise.all(
        sequences.map(async (sequence) => {
          try {
            const nextNumber = await this.calculateNextSequenceNumber(
              sequence.entityType,
              sequence,
            );
            const nextDocumentNumber = this.generateSequenceWithNumber(
              sequence,
              nextNumber,
            );
            return {
              ...sequence,
              format: this.buildFormatPattern(sequence),
              nextDocumentNumber: nextDocumentNumber,
              realTimeNextNumber: nextNumber,
            };
          } catch (error) {
            this.logger.error(
              `Error calculating next number for ${sequence.entityType}`,
              (error as Error)?.stack,
            );
            return {
              ...sequence,
              format: this.buildFormatPattern(sequence),
              nextDocumentNumber: this.generateSequenceWithNumber(
                sequence,
                sequence.nextNumber,
              ),
              realTimeNextNumber: sequence.nextNumber, // Fallback
            };
          }
        }),
      );

      configuration.values.sequences = enhancedSequences as unknown[];
    }
    return ApiRes(CFG.BY_ENTITY, configuration);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new configuration' })
  @ApiResponse({
    status: 201,
    description: 'Configuration created successfully',
  })
  async create(@Body() createDto: CreateConfigurationDto) {
    const configuration = await this.configurationsService.create(createDto);
    return ApiRes(CFG.CREATED, configuration);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a configuration' })
  @ApiResponse({
    status: 200,
    description: 'Configuration updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateConfigurationDto,
  ) {
    const configuration = await this.configurationsService.update(
      id,
      updateDto,
    );
    return ApiRes(CFG.UPDATED, configuration);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a configuration' })
  @ApiResponse({
    status: 204,
    description: 'Configuration deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.configurationsService.delete(id);
  }

  // Sequences-specific endpoints
  @Post('entity/sequences')
  @ApiOperation({ summary: 'Create a new sequence' })
  @ApiResponse({ status: 201, description: 'Sequence created successfully' })
  async createSequence(@Body() sequenceData: CreateSequenceDto) {
    const config = await this.configurationsService
      .findByEntity('sequences')
      .catch(() => null);

    if (!config) {
      // Create sequences configuration if it doesn't exist
      const newConfig = await this.configurationsService.create({
        entity: 'sequences',
        values: { sequences: [] },
      });
      const newSequence = {
        id: this.generateId(),
        ...sequenceData,
        nextNumber: 1, // Auto-set initial nextNumber
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const sequences = [
        ...((newConfig.values.sequences as SequenceConfig[]) || []),
        newSequence,
      ];
      await this.configurationsService.update(newConfig.id, {
        values: { sequences },
      });
      const enrichedSequence = {
        ...newSequence,
        format: this.buildFormatPattern(newSequence),
        nextDocumentNumber: this.generateSequenceWithNumber(newSequence, 1),
      };
      return ApiRes(CFG.SEQ_CREATED, enrichedSequence);
    }

    const newSequence = {
      id: this.generateId(),
      ...sequenceData,
      nextNumber: 1, // Auto-set initial nextNumber
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const sequences = [
      ...((config.values.sequences as SequenceConfig[]) || []),
      newSequence,
    ];
    await this.configurationsService.update(config.id, {
      values: { sequences },
    });
    const enrichedSequence = {
      ...newSequence,
      format: this.buildFormatPattern(newSequence),
      nextDocumentNumber: this.generateSequenceWithNumber(newSequence, 1),
    };
    return ApiRes(CFG.SEQ_CREATED, enrichedSequence);
  }

  @Patch('entity/sequences/:id')
  @ApiOperation({ summary: 'Update a sequence' })
  @ApiResponse({ status: 200, description: 'Sequence updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update sequence' })
  @ApiResponse({ status: 404, description: 'Sequence not found' })
  async updateSequence(
    @Param('id') sequenceId: string,
    @Body() sequenceData: UpdateSequenceDto,
  ) {
    const config = await this.configurationsService.findByEntity('sequences');
    const sequences = (config.values.sequences as SequenceConfig[]) || [];
    const index = sequences.findIndex((seq) => seq.id === sequenceId);

    if (index === -1) {
      throw new BadRequestException(`Sequence with ID ${sequenceId} not found`);
    }

    const existingSequence = sequences[index];

    // Prevent updates if invoices already exist (nextNumber > 1)
    if (existingSequence.nextNumber > 1) {
      throw new BadRequestException(
        `Cannot update sequence. Invoices already exist using this sequence (next number: ${existingSequence.nextNumber}). ` +
          `To modify this sequence, please create a new one instead.`,
      );
    }

    const updatedSequence = {
      ...sequences[index],
      ...sequenceData,
      updatedAt: new Date().toISOString(),
    };
    sequences[index] = updatedSequence;
    await this.configurationsService.update(config.id, {
      values: { sequences },
    });
    const enrichedSequence = {
      ...updatedSequence,
      format: this.buildFormatPattern(updatedSequence),
      nextDocumentNumber: this.generateSequenceWithNumber(
        updatedSequence,
        updatedSequence.nextNumber,
      ),
    };
    return ApiRes(CFG.SEQ_UPDATED, enrichedSequence);
  }

  @Delete('entity/sequences/:id')
  @ApiOperation({ summary: 'Delete a sequence' })
  @ApiResponse({ status: 400, description: 'Sequences cannot be deleted' })
  @ApiResponse({ status: 404, description: 'Sequence not found' })
  async deleteSequence(@Param('id') sequenceId: string) {
    const config = await this.configurationsService.findByEntity('sequences');
    const sequences = (config.values.sequences as SequenceConfig[]) || [];
    const sequenceToDelete = sequences.find((seq) => seq.id === sequenceId);

    if (!sequenceToDelete) {
      throw new BadRequestException(`Sequence with ID ${sequenceId} not found`);
    }

    // Prevent deletion - sequences cannot be deleted once created
    throw new BadRequestException(
      `Sequences cannot be deleted. If you no longer need this sequence, please deactivate it instead by setting 'isActive' to false.`,
    );
  }

  @Post('entity/sequences/preview')
  @ApiOperation({ summary: 'Generate sequence preview' })
  @ApiResponse({ status: 200, description: 'Sequence preview generated' })
  generateSequencePreview(@Body() sequenceData: SequencePreviewDto) {
    const config = sequenceData as unknown as SequenceConfig;
    const example = this.generateSequenceExample(config);
    const nextSequence = this.generateNextSequence(config);
    const format = this.buildFormatPattern(config);
    return ApiRes(CFG.SEQ_PREVIEW, { example, nextSequence, format });
  }

  @Get('entity/sequences/next/:entityType')
  @ApiOperation({ summary: 'Get next sequence for entity type' })
  @ApiResponse({ status: 200, description: 'Next sequence details' })
  @ApiResponse({ status: 400, description: 'No active sequence found' })
  async getNextSequence(@Param('entityType') entityType: string) {
    const config = await this.configurationsService.findByEntity('sequences');
    const sequences = (config.values.sequences as SequenceConfig[]) || [];
    const sequence = sequences.find(
      (seq) => seq.entityType === entityType && seq.isActive,
    );

    if (!sequence) {
      throw new BadRequestException(
        `No active sequence found for entity type: ${entityType}`,
      );
    }

    // Calculate next number based on actual database records
    const nextNumber = await this.calculateNextSequenceNumber(
      entityType,
      sequence,
    );
    const nextSequence = this.generateSequenceWithNumber(sequence, nextNumber);
    const format = this.buildFormatPattern(sequence);

    return ApiRes(CFG.SEQ_NEXT, { nextSequence, nextNumber, format });
  }

  private async calculateNextSequenceNumber(
    entityType: string,
    sequence: SequenceConfig,
  ): Promise<number> {
    let tableName = '';
    let numberColumn = 'invoiceNumber';

    // Map entity types to actual database tables
    switch (entityType) {
      case 'invoice_sale':
      case 'invoice_purchase':
        tableName = 'invoices';
        numberColumn = 'invoiceNumber';
        break;
      case 'quote':
        tableName = 'quotes'; // Assuming quotes table exists
        numberColumn = 'quoteNumber';
        break;
      case 'delivery_note':
        tableName = 'delivery_notes'; // Assuming delivery_notes table exists
        numberColumn = 'deliveryNumber';
        break;
      case 'purchase_order':
        tableName = 'purchase_orders'; // Assuming purchase_orders table exists
        numberColumn = 'orderNumber';
        break;
      case 'payment':
        tableName = 'payments'; // Assuming payments table exists
        numberColumn = 'paymentNumber';
        break;
      default:
        // If no specific table, use the stored nextNumber
        return sequence.nextNumber;
    }

    try {
      // Get the highest existing number for this sequence pattern
      const sequencePattern = this.generateSequencePattern(sequence);
      const query = `
        SELECT ${numberColumn} 
        FROM ${tableName} 
        WHERE ${numberColumn} LIKE $1 
        ORDER BY LENGTH(${numberColumn}) DESC, ${numberColumn} DESC 
        LIMIT 1
      `;

      const result = await this.dataSource.query(query, [
        sequencePattern + '%',
      ]);

      if (result.length === 0) {
        // No existing records, start from 1
        return 1;
      }

      const lastNumber = result[0][numberColumn];
      const extractedNumber = this.extractNumberFromSequence(
        lastNumber,
        sequence,
      );

      return extractedNumber + 1;
    } catch (error) {
      this.logger.error(
        `Error calculating next sequence for ${entityType}`,
        (error as Error)?.stack,
      );
      // Fallback to stored nextNumber
      return sequence.nextNumber;
    }
  }

  private generateSequencePattern(sequence: SequenceConfig): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');

    // Calculate trimester (Q1=01, Q2=04, Q3=07, Q4=10)
    const currentMonth = now.getMonth() + 1; // 1-12
    const trimester =
      currentMonth <= 3
        ? '01'
        : currentMonth <= 6
          ? '04'
          : currentMonth <= 9
            ? '07'
            : '10';

    let pattern = sequence.prefix || '';
    const dateComponents: string[] = [];

    // Build date components in order: year-trimester/month-day
    if (sequence.yearInPrefix) {
      dateComponents.push(year.toString());
    }

    if (sequence.trimesterInPrefix && sequence.monthInPrefix) {
      // If both trimester and month are selected, trimester takes precedence
      dateComponents.push(trimester);
    } else if (sequence.trimesterInPrefix) {
      dateComponents.push(trimester);
    } else if (sequence.monthInPrefix) {
      dateComponents.push(month);
    }

    if (sequence.dayInPrefix) {
      dateComponents.push(day);
    }

    // Add space before date components if prefix exists
    if (pattern && dateComponents.length > 0) {
      pattern += ' ';
    }

    // Join date components with hyphens
    if (dateComponents.length > 0) {
      pattern += dateComponents.join('-') + '-';
    }

    return pattern;
  }

  private extractNumberFromSequence(
    sequenceValue: string,
    sequence: SequenceConfig,
  ): number {
    const pattern = this.generateSequencePattern(sequence);
    const suffix = sequence.suffix || '';

    // Remove prefix and suffix to get the number part
    let numberPart = sequenceValue;

    if (pattern) {
      numberPart = numberPart.substring(pattern.length);
    }

    if (suffix) {
      numberPart = numberPart.substring(0, numberPart.length - suffix.length);
    }

    const number = parseInt(numberPart, 10);
    return isNaN(number) ? 0 : number;
  }

  private generateSequenceWithNumber(
    sequence: SequenceConfig,
    number: number,
  ): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');

    // Calculate trimester (Q1=01, Q2=04, Q3=07, Q4=10)
    const currentMonth = now.getMonth() + 1; // 1-12
    const trimester =
      currentMonth <= 3
        ? '01'
        : currentMonth <= 6
          ? '04'
          : currentMonth <= 9
            ? '07'
            : '10';

    let result = sequence.prefix || '';
    const dateComponents: string[] = [];

    // Build date components in order: year-trimester/month-day
    if (sequence.yearInPrefix) {
      dateComponents.push(year.toString());
    }

    if (sequence.trimesterInPrefix && sequence.monthInPrefix) {
      // If both trimester and month are selected, trimester takes precedence
      dateComponents.push(trimester);
    } else if (sequence.trimesterInPrefix) {
      dateComponents.push(trimester);
    } else if (sequence.monthInPrefix) {
      dateComponents.push(month);
    }

    if (sequence.dayInPrefix) {
      dateComponents.push(day);
    }

    // Add space before date components if prefix exists
    if (result && dateComponents.length > 0) {
      result += ' ';
    }

    // Join date components with hyphens
    if (dateComponents.length > 0) {
      result += dateComponents.join('-') + '-';
    }

    // Add the number part
    const numberPart = number
      .toString()
      .padStart(sequence.numberLength || 4, '0');
    result += numberPart;

    // Add suffix
    result += sequence.suffix || '';

    return result;
  }

  @Post('entity/sequences/:id/reset')
  @ApiOperation({ summary: 'Reset sequence number' })
  @ApiResponse({ status: 200, description: 'Sequence reset successfully' })
  @ApiResponse({ status: 404, description: 'Sequence not found' })
  async resetSequence(@Param('id') sequenceId: string) {
    const config = await this.configurationsService.findByEntity('sequences');
    const sequences = (config.values.sequences as SequenceConfig[]) || [];
    const index = sequences.findIndex((seq) => seq.id === sequenceId);

    if (index === -1) {
      throw new BadRequestException(`Sequence with ID ${sequenceId} not found`);
    }

    const resetSequence = {
      ...sequences[index],
      nextNumber: 1,
      updatedAt: new Date().toISOString(),
    };
    sequences[index] = resetSequence;
    await this.configurationsService.update(config.id, {
      values: { sequences },
    });
    const enrichedSequence = {
      ...resetSequence,
      format: this.buildFormatPattern(resetSequence),
      nextDocumentNumber: this.generateSequenceWithNumber(resetSequence, 1),
    };
    return ApiRes(CFG.SEQ_RESET, enrichedSequence);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private buildFormatPattern(sequence: SequenceConfig): string {
    let result = sequence.prefix || '';
    const dateComponents: string[] = [];

    if (sequence.yearInPrefix) dateComponents.push('YYYY');
    if (sequence.trimesterInPrefix) dateComponents.push('TRIM');
    if (sequence.monthInPrefix) dateComponents.push('MM');
    if (sequence.dayInPrefix) dateComponents.push('DD');

    const numberPart = 'X'.repeat(sequence.numberLength || 4);

    // Build the pattern string
    if (result && dateComponents.length > 0) {
      result += ' ' + dateComponents.join('-') + '-' + numberPart;
    } else if (dateComponents.length > 0) {
      result = dateComponents.join('-') + '-' + numberPart;
    } else {
      result = result + (result ? '-' : '') + numberPart;
    }

    if (sequence.suffix) {
      result += sequence.suffix;
    }

    return result;
  }

  private generateSequenceExample(sequenceData: SequenceConfig): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');

    // Calculate trimester (Q1=01, Q2=04, Q3=07, Q4=10)
    const currentMonth = now.getMonth() + 1; // 1-12
    const trimester =
      currentMonth <= 3
        ? '01'
        : currentMonth <= 6
          ? '04'
          : currentMonth <= 9
            ? '07'
            : '10';

    let result = sequenceData.prefix || '';
    const dateComponents: string[] = [];

    // Build date components in order: year-trimester/month-day
    if (sequenceData.yearInPrefix) {
      dateComponents.push(year.toString());
    }

    if (sequenceData.trimesterInPrefix && sequenceData.monthInPrefix) {
      // If both trimester and month are selected, trimester takes precedence
      dateComponents.push(trimester);
    } else if (sequenceData.trimesterInPrefix) {
      dateComponents.push(trimester);
    } else if (sequenceData.monthInPrefix) {
      dateComponents.push(month);
    }

    if (sequenceData.dayInPrefix) {
      dateComponents.push(day);
    }

    // Add space before date components if prefix exists
    if (result && dateComponents.length > 0) {
      result += ' ';
    }

    // Join date components with hyphens
    if (dateComponents.length > 0) {
      result += dateComponents.join('-') + '-';
    }

    // Add the number part
    const numberPart = (sequenceData.nextNumber || 1)
      .toString()
      .padStart(sequenceData.numberLength || 4, '0');
    result += numberPart;

    // Add suffix
    result += sequenceData.suffix || '';

    return result;
  }

  private generateNextSequence(sequence: SequenceConfig): string {
    return this.generateSequenceExample(sequence);
  }

  // Company Configuration endpoints
  @Get('entity/my_company')
  @ApiOperation({ summary: 'Get company information' })
  @ApiResponse({ status: 200, description: 'Company information' })
  async getCompanyInfo() {
    const configuration =
      await this.configurationsService.findByEntity('my_company');
    return ApiRes(CFG.COMPANY_DETAIL, configuration.values);
  }

  @Patch('entity/my_company')
  @ApiOperation({ summary: 'Update company information' })
  @ApiResponse({ status: 200, description: 'Company information updated' })
  async updateCompanyInfo(@Body() companyDto: CompanyDto) {
    const config = await this.configurationsService.findByEntity('my_company');
    const updated = await this.configurationsService.update(config.id, {
      values: companyDto,
    });
    return ApiRes(CFG.COMPANY_UPDATED, updated.values);
  }
}
