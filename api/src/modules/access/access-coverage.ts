import { PATH_METADATA } from '@nestjs/common/constants';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { isKnownPermissionKey } from '../../common/access/access-modules';
import { readAccessDeclaration } from './access-decision';

export type CoverageProblemKind = 'undeclared' | 'unknown-permission';

export interface CoverageProblem {
  kind: CoverageProblemKind;
  controller: string;
  handler: string;
  detail: string;
}

function isPublic(handler: object, controller: object): boolean {
  return (
    Reflect.getMetadata(IS_PUBLIC_KEY, handler) === true ||
    Reflect.getMetadata(IS_PUBLIC_KEY, controller) === true
  );
}

function routeHandlerNames(
  controller: new (...args: any[]) => unknown,
): string[] {
  const proto = controller.prototype as Record<string, unknown>;
  return Object.getOwnPropertyNames(proto).filter((name) => {
    if (name === 'constructor') return false;
    const member = proto[name];
    if (typeof member !== 'function') return false;
    // A route handler always carries a path from @Get/@Post/@Patch/…
    return Reflect.hasMetadata(PATH_METADATA, member);
  });
}

/**
 * Verify that every route either declares a permission or opts out explicitly,
 * and that the permissions it names actually exist in the registry.
 *
 * Runs at application bootstrap and again as a unit test, so a controller that
 * would silently 403 in production fails the build instead.
 */
export function auditControllers(
  controllers: Array<new (...args: any[]) => unknown>,
): CoverageProblem[] {
  const problems: CoverageProblem[] = [];

  for (const controller of controllers) {
    for (const handlerName of routeHandlerNames(controller)) {
      const handler = (controller.prototype as Record<string, unknown>)[
        handlerName
      ] as object;

      if (isPublic(handler, controller)) continue;

      const declaration = readAccessDeclaration(handler, controller);
      if (declaration.kind === 'exempt') continue;

      if (declaration.kind === 'none') {
        problems.push({
          kind: 'undeclared',
          controller: controller.name,
          handler: handlerName,
          detail:
            'declares no permission — add @RequirePermission(...), @RequireAnyPermission(...) or @NoPermissionRequired()',
        });
        continue;
      }

      const unknown = declaration.requirement.permissions.filter(
        (key) => !isKnownPermissionKey(key),
      );
      if (unknown.length) {
        problems.push({
          kind: 'unknown-permission',
          controller: controller.name,
          handler: handlerName,
          detail: `references permissions absent from the registry: ${unknown.join(', ')}`,
        });
      }
    }
  }

  return problems;
}

export function formatCoverageProblems(problems: CoverageProblem[]): string {
  const lines = problems.map(
    (p) => `  • ${p.controller}.${p.handler} — ${p.detail}`,
  );
  return [
    `Access control coverage failed for ${problems.length} route(s):`,
    ...lines,
    '',
    'Every admin-scope route must declare its access requirement. See',
    'api/src/common/access/access-modules.ts for the permission catalogue.',
  ].join('\n');
}
