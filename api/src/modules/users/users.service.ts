import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Repository, ILike, In, FindOptionsWhere } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Portal } from '../portal/entities/portal.entity';
import { Role } from '../roles/entities/role.entity';
import { CreateUserDto, UserType, UserStatus } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FilterUsersDto } from './dto/filter-users.dto';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { AccessControlService } from '../access/access-control.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly tenantConnService: TenantConnectionService,
    private readonly accessControl: AccessControlService,
  ) {}

  private get portalRepo(): Repository<Portal> {
    return this.tenantConnService.getRepository(Portal);
  }

  private get roleRepo(): Repository<Role> {
    return this.tenantConnService.getRepository(Role);
  }

  async findAll(
    dto: FilterUsersDto,
  ): Promise<{ users: Portal[]; total: number }> {
    const page = dto.page ?? 1;
    const perPage = Math.min(dto.perPage ?? 20, 100);
    const skip = (page - 1) * perPage;

    const where: FindOptionsWhere<Portal>[] = [];

    const baseConditions: FindOptionsWhere<Portal> = {};
    if (dto.userType === UserType.ADMIN) {
      baseConditions.isAdmin = true;
    } else if (dto.userType === UserType.CLIENT) {
      baseConditions.isCustomer = true;
    }
    if (dto.status === UserStatus.ACTIVE) {
      baseConditions.isActive = true;
    } else if (dto.status === UserStatus.INACTIVE) {
      baseConditions.isActive = false;
    }
    if (dto.roleId) {
      // Role membership lives in `user_roles`, so filter on the relation
      // rather than on the deprecated `portal.roleId` column.
      baseConditions.roles = { id: dto.roleId };
    }

    if (dto.search) {
      const term = dto.search;
      where.push(
        { ...baseConditions, name: ILike(`%${term}%`) },
        { ...baseConditions, phoneNumber: ILike(`%${term}%`) },
        { ...baseConditions, email: ILike(`%${term}%`) },
      );
    } else {
      where.push(baseConditions);
    }

    const [users, total] = await this.portalRepo.findAndCount({
      where,
      relations: ['role', 'roles'],
      order: { dateCreated: 'DESC' },
      skip,
      take: perPage,
    });

    return { users, total };
  }

  async findOne(id: number): Promise<Portal> {
    const user = await this.portalRepo.findOne({
      where: { id },
      relations: ['role', 'roles'],
    });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto): Promise<Portal> {
    const existing = await this.portalRepo.findOne({
      where: { phoneNumber: dto.phoneNumber },
    });
    if (existing) {
      throw new ConflictException(
        `A user with phone number "${dto.phoneNumber}" already exists`,
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const roles = await this.resolveRoles(dto.roleIds, dto.roleId);

    const user = this.portalRepo.create({
      name: dto.name,
      phoneNumber: dto.phoneNumber,
      email: dto.email,
      password: hashedPassword,
      avatarUrl: dto.avatarUrl,
      isActive: dto.status !== UserStatus.INACTIVE,
      userType: dto.userType,
      isAdmin: dto.userType === UserType.ADMIN || dto.isAdmin === true,
      isCustomer: dto.userType === UserType.CLIENT || dto.isCustomer === true,
      status: 'approved',
      roles,
    } as Partial<Portal>);

    const saved = await this.portalRepo.save(user);
    await this.accessControl.invalidate();
    return this.findOne(saved.id);
  }

  async update(
    id: number,
    dto: UpdateUserDto,
    currentUserId?: number,
  ): Promise<Portal> {
    const user = await this.findOne(id);

    // Guard: cannot deactivate own account
    if (currentUserId === id && dto.status === UserStatus.INACTIVE) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    if (dto.roleIds !== undefined || dto.roleId !== undefined) {
      const next = await this.resolveRoles(dto.roleIds, dto.roleId);

      // Guard: an administrator must not be able to lock themselves out.
      const heldSuperAdmin = (user.roles ?? []).some((r) => r.isSuperAdmin);
      if (
        currentUserId === id &&
        heldSuperAdmin &&
        !next.some((r) => r.isSuperAdmin)
      ) {
        throw new ForbiddenException(
          'You cannot remove your own administrator role',
        );
      }

      user.roles = next;
      // Keep the deprecated column loosely in step for any straggling reader.
      user.roleId = next[0]?.id ?? null;
    }

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.phoneNumber !== undefined) {
      if (dto.phoneNumber !== user.phoneNumber) {
        const conflict = await this.portalRepo.findOne({
          where: { phoneNumber: dto.phoneNumber },
        });
        if (conflict && conflict.id !== id) {
          throw new ConflictException(
            `Phone number "${dto.phoneNumber}" is already in use`,
          );
        }
      }
      user.phoneNumber = dto.phoneNumber;
    }
    if (dto.avatarUrl !== undefined) (user as any).avatarUrl = dto.avatarUrl;
    if (dto.status !== undefined) {
      user.isActive = dto.status === UserStatus.ACTIVE;
    }
    if (dto.userType !== undefined) {
      (user as any).userType = dto.userType;
      user.isAdmin = dto.userType === UserType.ADMIN;
      user.isCustomer = dto.userType === UserType.CLIENT;
    }
    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException(
          'Current password is required to set a new password',
        );
      }
      const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
      if (!isMatch) {
        throw new UnauthorizedException('Current password is incorrect');
      }
      user.password = await bcrypt.hash(dto.newPassword, 10);
    } else if (dto.password) {
      user.password = await bcrypt.hash(dto.password, 10);
    }

    await this.portalRepo.save(user);
    await this.accessControl.invalidate();
    return this.findOne(id);
  }

  async setStatus(
    id: number,
    active: boolean,
    currentUserId?: number,
  ): Promise<Portal> {
    if (currentUserId === id && !active) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }
    const user = await this.findOne(id);
    user.isActive = active;
    return this.portalRepo.save(user);
  }

  async remove(id: number, currentUserId?: number): Promise<void> {
    if (currentUserId === id) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    const user = await this.findOne(id);
    await this.portalRepo.remove(user);
    await this.accessControl.invalidate();
  }

  /**
   * Accepts the many-to-many `roleIds` and folds in the deprecated single
   * `roleId` so older callers keep working.
   */
  private async resolveRoles(
    roleIds?: number[],
    legacyRoleId?: number | null,
  ): Promise<Role[]> {
    const ids = new Set<number>(roleIds ?? []);
    if (legacyRoleId !== undefined && legacyRoleId !== null) {
      ids.add(legacyRoleId);
    }
    if (ids.size === 0) return [];

    const roles = await this.roleRepo.find({ where: { id: In([...ids]) } });
    if (roles.length !== ids.size) {
      const missing = [...ids].filter((id) => !roles.some((r) => r.id === id));
      throw new NotFoundException(`Role(s) not found: ${missing.join(', ')}`);
    }
    return roles;
  }
}
