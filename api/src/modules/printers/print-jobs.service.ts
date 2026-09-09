import { Injectable } from '@nestjs/common';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { PrintJob } from './entities/print-job.entity';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { QueryPrintJobsDto } from './dto/query-print-jobs.dto';

@Injectable()
export class PrintJobsService {
  constructor(private readonly tenantConnService: TenantConnectionService) {}

  private get repo(): Repository<PrintJob> {
    return this.tenantConnService.getRepository(PrintJob);
  }


  async findAll(query: QueryPrintJobsDto) {
    const where: FindOptionsWhere<PrintJob> = {};

    if (query.printerId) where.printerId = query.printerId;
    if (query.status) where.status = query.status as PrintJob['status'];
    if (query.from && query.to) {
      where.printedAt = Between(new Date(query.from), new Date(query.to));
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [data, total] = await this.repo.findAndCount({
      where,
      relations: ['printer', 'user'],
      order: { printedAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
