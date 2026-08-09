import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ReportMapper, UnknownReportTypeError } from '../types';

/**
 * DI token for the multi-provider array of mappers. Feature modules contribute
 * report types by adding providers under this token.
 */
export const REPORT_MAPPERS = Symbol('REPORT_MAPPERS');

/**
 * Look-up table from `reportType` to its mapper.
 *
 * This is the extension point: registering a mapper makes a new report type
 * renderable without any change to the engine, the client, or the templates.
 */
@Injectable()
export class ReportMapperRegistry {
  private readonly logger = new Logger(ReportMapperRegistry.name);
  private readonly mappers = new Map<string, ReportMapper<any>>();

  constructor(
    @Optional()
    @Inject(REPORT_MAPPERS)
    mappers: ReportMapper<any>[] | null,
  ) {
    for (const mapper of mappers ?? []) {
      this.register(mapper);
    }
  }

  /** Registers a mapper. A duplicate `reportType` replaces the previous one. */
  register(mapper: ReportMapper<any>): void {
    if (this.mappers.has(mapper.reportType)) {
      this.logger.warn(
        `Report mapper "${mapper.reportType}" is being replaced by a later registration`,
      );
    }
    this.mappers.set(mapper.reportType, mapper);
  }

  /** Returns the mapper for `reportType`, or throws {@link UnknownReportTypeError}. */
  get<TData = unknown>(reportType: string): ReportMapper<TData> {
    const mapper = this.mappers.get(reportType);
    if (!mapper) {
      throw new UnknownReportTypeError(reportType, this.list());
    }
    return mapper as ReportMapper<TData>;
  }

  /** Whether a mapper is registered for `reportType`. */
  has(reportType: string): boolean {
    return this.mappers.has(reportType);
  }

  /** All registered report types, sorted — handy for diagnostics endpoints. */
  list(): string[] {
    return [...this.mappers.keys()].sort();
  }
}
