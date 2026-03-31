import {
    Controller,
    Get,
    Patch,
    Post,
    Param,
    Body,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationTemplateService } from './notification-template.service';
import { OrderNotificationService } from './order-notification.service';
import { ApiRes } from '../../common/api-response';
import { NTPL } from '../../common/response-codes';

class UpdateNotificationTemplateDto {
    @ApiPropertyOptional({ example: 'Nouvelle commande' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    titleFr?: string;

    @ApiPropertyOptional({ example: 'Le client a passé une commande.' })
    @IsOptional()
    @IsString()
    bodyFr?: string;

    @ApiPropertyOptional({ example: 'طلب جديد' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    titleAr?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    bodyAr?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    enabled?: boolean;

    @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'urgent'] })
    @IsOptional()
    @IsString()
    priority?: string;
}

class ToggleNotificationTemplateDto {
    @ApiProperty()
    @IsBoolean()
    enabled: boolean;
}

class SendCustomNotificationDto {
    @ApiProperty({ description: 'Partner (customer) ID' })
    customerId: number;

    @ApiProperty({ example: 'Offre speciale' })
    @IsString()
    @MaxLength(255)
    title: string;

    @ApiProperty({
        example: 'Profitez de 20% de reduction sur votre prochaine commande.',
    })
    @IsString()
    message: string;
}

@ApiTags('Notification Templates')
@Controller('notification-templates')
export class NotificationTemplatesController {
    private readonly logger = new Logger(NotificationTemplatesController.name);

    constructor(
        private readonly templateService: NotificationTemplateService,
        private readonly orderNotificationService: OrderNotificationService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'List all notification templates' })
    @ApiResponse({ status: 200, description: 'Templates retrieved' })
    async findAll() {
        const templates = await this.templateService.findAll();
        return ApiRes(NTPL.LIST, templates);
    }

    @Get(':key')
    @ApiOperation({ summary: 'Get a single notification template by key' })
    @ApiResponse({ status: 200, description: 'Template retrieved' })
    @ApiResponse({ status: 404, description: 'Template not found' })
    async findOne(@Param('key') key: string) {
        const template = await this.templateService.findByKey(key);
        if (!template) throw new NotFoundException(`Template '${key}' not found`);
        return ApiRes(NTPL.DETAIL, template);
    }

    @Patch(':key')
    @ApiOperation({ summary: 'Update a notification template' })
    @ApiResponse({ status: 200, description: 'Template updated' })
    async update(
        @Param('key') key: string,
        @Body() dto: UpdateNotificationTemplateDto,
    ) {
        const template = await this.templateService.update(key, dto);
        if (!template) throw new NotFoundException(`Template '${key}' not found`);
        return ApiRes(NTPL.UPDATED, template);
    }

    @Patch(':key/toggle')
    @ApiOperation({ summary: 'Enable or disable a notification template' })
    @ApiResponse({ status: 200, description: 'Template toggled' })
    async toggle(
        @Param('key') key: string,
        @Body() dto: ToggleNotificationTemplateDto,
    ) {
        const template = await this.templateService.toggleEnabled(key, dto.enabled);
        if (!template) throw new NotFoundException(`Template '${key}' not found`);
        return ApiRes(NTPL.TOGGLED, template);
    }

    @Post(':key/reset')
    @ApiOperation({ summary: 'Reset a template to its factory default' })
    @ApiResponse({ status: 200, description: 'Template reset' })
    async resetOne(@Param('key') key: string) {
        const template = await this.templateService.resetToDefault(key);
        if (!template) {
            throw new NotFoundException(
                `Template '${key}' not found or no default exists`,
            );
        }
        return ApiRes(NTPL.RESET, template);
    }

    @Post('reset-all')
    @ApiOperation({ summary: 'Reset all templates to factory defaults' })
    @ApiResponse({ status: 200, description: 'All templates reset' })
    async resetAll() {
        await this.templateService.resetAllToDefaults();
        return ApiRes(NTPL.RESET_ALL, null);
    }

    @Post('send-custom')
    @ApiOperation({
        summary: 'Send a custom push + in-app notification to a client',
    })
    @ApiResponse({ status: 200, description: 'Custom notification sent' })
    async sendCustom(@Body() dto: SendCustomNotificationDto) {
        await this.orderNotificationService.notifyAdminCustomMessage(
            dto.customerId,
            dto.title,
            dto.message,
        );
        return ApiRes(NTPL.SENT, null);
    }
}
