import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    Request,
    Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrintJobsService } from './print-jobs.service';
import { LogPrintJobDto } from './dto/log-print-job.dto';
import { QueryPrintJobsDto } from './dto/query-print-jobs.dto';
import { ApiRes } from '../../common/api-response';
import { PJB } from '../../common/response-codes';

@ApiTags('Print Jobs')
@Controller('print-jobs')
export class PrintJobsController {
    private readonly logger = new Logger(PrintJobsController.name);

    constructor(private readonly printJobsService: PrintJobsService) { }

    @Post()
    @ApiOperation({ summary: 'Log a print attempt' })
    @ApiResponse({ status: 201, description: 'Print job logged' })
    async log(
        @Body() dto: LogPrintJobDto,
        @Request() req: { user: { id: number; sub: number } },
    ) {
        const job = await this.printJobsService.log(req.user.id, dto);
        return ApiRes(PJB.CREATED, job);
    }

    @Get()
    @ApiOperation({ summary: 'List print job history' })
    @ApiResponse({ status: 200, description: 'Print jobs retrieved' })
    async findAll(@Query() query: QueryPrintJobsDto) {
        const result = await this.printJobsService.findAll(query);
        return ApiRes(PJB.LIST, result.data, {
            total: result.meta.total,
            limit: result.meta.limit,
            offset: (result.meta.page - 1) * result.meta.limit,
            hasNext: result.meta.page < result.meta.pages,
            hasPrev: result.meta.page > 1,
        });
    }
}
