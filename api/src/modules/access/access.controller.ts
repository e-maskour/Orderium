import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiRes } from '../../common/api-response';
import { ACL } from '../../common/response-codes';
import {
  ACCESS_CATEGORIES,
  ACCESS_LEVELS,
  ACCESS_MODULES,
} from '../../common/access/access-modules';
import {
  NoPermissionRequired,
  RequirePermission,
} from '../auth/decorators/permissions.decorator';
import { AccessControlService } from './access-control.service';
import { AccessSyncService } from './access-sync.service';
import type { RequestWithAccess } from '../auth/guards/permissions.guard';

/**
 * The client-facing half of the access model.
 *
 * `GET /access/me` is what makes live permission changes visible: the
 * backoffice asks the server what the current user may do rather than reading
 * it out of a token minted at login.
 */
@ApiTags('Access Control')
@Controller('access')
export class AccessController {
  constructor(
    private readonly accessControl: AccessControlService,
    private readonly accessSync: AccessSyncService,
  ) {}

  @Get('modules')
  @RequirePermission('roles.view')
  @ApiOperation({
    summary: 'Get the module/action/level registry used by the role matrix',
  })
  @ApiResponse({ status: 200, description: 'Access registry retrieved' })
  getModules() {
    return ApiRes(ACL.MODULES, {
      levels: ACCESS_LEVELS,
      categories: [...ACCESS_CATEGORIES].sort((a, b) => a.order - b.order),
      modules: ACCESS_MODULES,
    });
  }

  @Get('me')
  @NoPermissionRequired()
  @ApiOperation({ summary: "Get the caller's effective permissions" })
  @ApiResponse({ status: 200, description: 'Effective access retrieved' })
  async me(@Req() req: RequestWithAccess) {
    // PermissionsGuard already resolved this for admin-scope tokens.
    const access =
      req.access ??
      (req.user
        ? await this.accessControl.getEffectiveAccess(req.user.id)
        : null);

    return ApiRes(ACL.ME, {
      userId: access?.userId ?? req.user?.id ?? null,
      roleIds: access?.roleIds ?? [],
      roleNames: access?.roleNames ?? [],
      isSuperAdmin: access?.isSuperAdmin ?? false,
      permissions: access?.permissions ?? [],
    });
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('roles.edit')
  @ApiOperation({
    summary:
      'Re-synchronise the permission catalogue and preset roles from the registry',
  })
  @ApiResponse({ status: 200, description: 'Access control synchronised' })
  async sync() {
    const result = await this.accessSync.sync();
    return ApiRes(ACL.SYNCED, result);
  }
}
