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
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { ConfigurationsService } from './configurations.service';
import { CreateConfigurationDto } from './dto/create-configuration.dto';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import { CompanyDto, UpdateCompanyDto } from './dto/company.dto';

@ApiTags('Configurations')
@Controller('configurations')
export class ConfigurationsController {
  constructor(
    private readonly configurationsService: ConfigurationsService,
    @Inject(DataSource) private dataSource: DataSource,
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
    const configuration = await this.configurationsService.findByEntity(entity);
    // If it's sequences, enhance with real-time next numbers
    if (entity === 'sequences' && configuration?.values?.sequences) {
      const enhancedSequences = await Promise.all(
        configuration.values.sequences.map(async (sequence) => {
          try {
            const nextNumber = await this.calculateNextSequenceNumber(
              sequence.entityType,
              sequence,
            );
            return {
              ...sequence,
              realTimeNextNumber: nextNumber,
            };
          } catch (error) {
            console.error(
              `Error calculating next number for ${sequence.entityType}:`,
              error,
            );
            return {
              ...sequence,
              realTimeNextNumber: sequence.nextNumber, // Fallback
            };
          }
        }),
      );

      configuration.values.sequences = enhancedSequences;
    }
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

  // Sequences-specific endpoints
  @Post('entity/sequences')
  @ApiOperation({ summary: 'Create a new sequence' })
  async createSequence(@Body() sequenceData: any) {
    const config = await this.configurationsService
      .findByEntity('sequences')
      .catch(() => null);

    if (!config) {
      // Create sequences configuration if it doesn't exist
      const newConfig = await this.configurationsService.create({
        entity: 'sequences',
        values: { sequences: [] },
      });
      const sequences = [
        ...newConfig.values.sequences,
        {
          id: this.generateId(),
          ...sequenceData,
          nextNumber: 1, // Auto-set initial nextNumber
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      const updated = await this.configurationsService.update(newConfig.id, {
        values: { sequences },
      });
      return { success: true, sequence: sequences[sequences.length - 1] };
    }

    const sequences = [
      ...(config.values.sequences || []),
      {
        id: this.generateId(),
        ...sequenceData,
        nextNumber: 1, // Auto-set initial nextNumber
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    const updated = await this.configurationsService.update(config.id, {
      values: { sequences },
    });
    return { success: true, sequence: sequences[sequences.length - 1] };
  }

  @Put('entity/sequences/:id')
  @ApiOperation({ summary: 'Update a sequence' })
  async updateSequence(
    @Param('id') sequenceId: string,
    @Body() sequenceData: any,
  ) {
    const config = await this.configurationsService.findByEntity('sequences');
    const sequences = config.values.sequences || [];
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

    sequences[index] = {
      ...sequences[index],
      ...sequenceData,
      updatedAt: new Date().toISOString(),
    };
    const updated = await this.configurationsService.update(config.id, {
      values: { sequences },
    });
    return { success: true, sequence: sequences[index] };
  }

  @Delete('entity/sequences/:id')
  @ApiOperation({ summary: 'Delete a sequence' })
  async deleteSequence(@Param('id') sequenceId: string) {
    const config = await this.configurationsService.findByEntity('sequences');
    const sequences = config.values.sequences || [];
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
  async generateSequencePreview(@Body() sequenceData: any) {
    const example = this.generateSequenceExample(sequenceData);
    const nextSequence = this.generateNextSequence(sequenceData);
    return { success: true, preview: { example, nextSequence } };
  }

  @Get('entity/sequences/next/:entityType')
  @ApiOperation({ summary: 'Get next sequence for entity type' })
  async getNextSequence(@Param('entityType') entityType: string) {
    const config = await this.configurationsService.findByEntity('sequences');
    const sequences = config.values.sequences || [];
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

    return { success: true, nextSequence, nextNumber };
  }

  private async calculateNextSequenceNumber(
    entityType: string,
    sequence: any,
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
      console.error(
        `Error calculating next sequence for ${entityType}:`,
        error,
      );
      // Fallback to stored nextNumber
      return sequence.nextNumber;
    }
  }

  private generateSequencePattern(sequence: any): string {
    const now = new Date();
    let pattern = sequence.prefix || '';

    if (sequence.yearInPrefix) {
      pattern += now.getFullYear().toString();
    }

    if (sequence.monthInPrefix) {
      pattern += (now.getMonth() + 1).toString().padStart(2, '0');
    }

    if (sequence.dateFormat && sequence.dateFormat !== 'none') {
      switch (sequence.dateFormat) {
        case 'YYYY':
          pattern += now.getFullYear().toString();
          break;
        case 'YYYYMM':
          pattern +=
            now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0');
          break;
        case 'YYYYMMDD':
          pattern += now.toISOString().slice(0, 10).replace(/-/g, '');
          break;
      }
    }

    return pattern;
  }

  private extractNumberFromSequence(
    sequenceValue: string,
    sequence: any,
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

  private generateSequenceWithNumber(sequence: any, number: number): string {
    const pattern = this.generateSequencePattern(sequence);
    const numberPart = number
      .toString()
      .padStart(sequence.numberLength || 4, '0');
    return pattern + numberPart + (sequence.suffix || '');
  }

  @Post('entity/sequences/:id/reset')
  @ApiOperation({ summary: 'Reset sequence number' })
  async resetSequence(@Param('id') sequenceId: string) {
    const config = await this.configurationsService.findByEntity('sequences');
    const sequences = config.values.sequences || [];
    const index = sequences.findIndex((seq) => seq.id === sequenceId);

    if (index === -1) {
      throw new BadRequestException(`Sequence with ID ${sequenceId} not found`);
    }

    sequences[index] = {
      ...sequences[index],
      nextNumber: 1,
      updatedAt: new Date().toISOString(),
    };
    await this.configurationsService.update(config.id, {
      values: { sequences },
    });
    return { success: true };
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private generateSequenceExample(sequenceData: any): string {
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
    let dateComponents: string[] = [];

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

  private generateNextSequence(sequence: any): string {
    return this.generateSequenceExample(sequence);
  }

  // Company Configuration endpoints
  @Get('entity/my_company')
  @ApiOperation({ summary: 'Get company information' })
  async getCompanyInfo() {
    const configuration =
      await this.configurationsService.findByEntity('my_company');
    return { success: true, company: configuration.values };
  }

  @Put('entity/my_company')
  @ApiOperation({ summary: 'Update company information' })
  async updateCompanyInfo(@Body() companyDto: CompanyDto) {
    const config =
      await this.configurationsService.findByEntity('my_company');
    const updated = await this.configurationsService.update(config.id, {
      values: companyDto,
    });
    return { success: true, company: updated.values };
  }
}
