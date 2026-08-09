import {
  NO_PERMISSION_KEY,
  PermissionRequirement,
  REQUIRE_PERMISSION_KEY,
} from '../auth/decorators/permissions.decorator';

export type AccessDeclaration =
  | { kind: 'requirement'; requirement: PermissionRequirement }
  | { kind: 'exempt' }
  | { kind: 'none' };

function readOne(target: object): AccessDeclaration {
  const requirement = Reflect.getMetadata(REQUIRE_PERMISSION_KEY, target) as
    | PermissionRequirement
    | undefined;
  if (requirement?.permissions?.length) {
    return { kind: 'requirement', requirement };
  }
  if (Reflect.getMetadata(NO_PERMISSION_KEY, target) === true) {
    return { kind: 'exempt' };
  }
  return { kind: 'none' };
}

/**
 * Resolve what a route declares, handler before controller.
 *
 * Reading each metadata key independently — the way `Reflector.getAllAndOverride`
 * works — would let a class-level `@NoPermissionRequired()` silently win over a
 * handler-level `@RequirePermission(...)`, because the handler defines nothing
 * for the exemption key. That pattern is exactly what `PortalController` needs:
 * portal self-service by default, with a handful of admin routes tightened on
 * top. So precedence is decided per level, not per key.
 */
export function readAccessDeclaration(
  handler: object,
  controller: object,
): AccessDeclaration {
  const fromHandler = readOne(handler);
  if (fromHandler.kind !== 'none') return fromHandler;
  return readOne(controller);
}
