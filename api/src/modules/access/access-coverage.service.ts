import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiscoveryService } from '@nestjs/core';
import {
  auditControllers,
  CoverageProblem,
  formatCoverageProblems,
} from './access-coverage';

/**
 * Refuses to start the application while any admin route is left undeclared.
 *
 * Fail-closed enforcement means an undecorated handler returns 403 to real
 * users. Catching that at boot turns a production incident into a startup
 * error a developer sees on the first `pnpm start:dev` after adding a route.
 *
 * Set `ACCESS_CONTROL_STRICT_BOOT=false` to downgrade the failure to a warning
 * — useful when bisecting, never in CI.
 */
@Injectable()
export class AccessCoverageService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AccessCoverageService.name);

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly configService: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    const problems = this.audit();

    if (problems.length === 0) {
      this.logger.log('Access control coverage verified for all routes');
      return;
    }

    const report = formatCoverageProblems(problems);
    const strict =
      this.configService.get<string>('ACCESS_CONTROL_STRICT_BOOT') !== 'false';

    if (strict) throw new Error(report);
    this.logger.warn(report);
  }

  audit(): CoverageProblem[] {
    const controllers = this.discoveryService
      .getControllers()
      .map((wrapper) => wrapper.metatype)
      .filter(
        (metatype): metatype is new (...args: any[]) => unknown =>
          typeof metatype === 'function',
      );

    return auditControllers(controllers);
  }
}
