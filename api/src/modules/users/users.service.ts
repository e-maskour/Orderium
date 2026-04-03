import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Repository, ILike, FindOptionsWhere } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Portal } from '../portal/entities/portal.entity';
import { Role } from '../roles/entities/role.entity';
import { CreateUserDto, UserType, UserStatus } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FilterUsersDto } from './dto/filter-users.dto';
import { TenantConnectionService } from '../tenant/tenant-connection.service';

@Injectable()
export class UsersService {
  constructor(private readonly tenantConnService: TenantConnectionService) {}

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
      relations: ['role', 'role.permissions'],
      order: { dateCreated: 'DESC' },
      skip,
      take: perPage,
    });

    return { users, total };
  }

  async findOne(id: number): Promise<Portal> {
    const user = await this.portalRepo.findOne({
      where: { id },
      relations: ['role', 'role.permissions'],
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

    let role: Role | null = null;
    if (dto.roleId) {
      role = await this.roleRepo.findOne({ where: { id: dto.roleId } });
      if (!role) throw new NotFoundException(`Role #${dto.roleId} not found`);
    }

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
      roleId: role?.id ?? null,
    } as Partial<Portal>);

    return this.portalRepo.save(user);
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

    if (dto.roleId !== undefined && dto.roleId !== null) {
      const role = await this.roleRepo.findOne({ where: { id: dto.roleId } });
      if (!role) throw new NotFoundException(`Role #${dto.roleId} not found`);

      // Guard: cannot remove own super_admin role
      if (
        currentUserId === id &&
        user.role?.isSuperAdmin &&
        !role.isSuperAdmin
      ) {
        throw new ForbiddenException(
          'You cannot remove your own super_admin role',
        );
      }
      user.roleId = dto.roleId;
    } else if (dto.roleId === null) {
      user.roleId = null;
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

    return this.portalRepo.save(user);
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
  }
}
