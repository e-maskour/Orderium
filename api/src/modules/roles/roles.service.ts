import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PermissionsService } from '../permissions/permissions.service';
import { TenantConnectionService } from '../tenant/tenant-connection.service';

@Injectable()
export class RolesService {
    constructor(
        private readonly tenantConnService: TenantConnectionService,
        private readonly permissionsService: PermissionsService,
    ) { }

    private get repo(): Repository<Role> {
        return this.tenantConnService.getRepository(Role);
    }

    async findAll(): Promise<Role[]> {
        return this.repo.find({
            relations: ['permissions'],
            order: { name: 'ASC' },
        });
    }

    async findOne(id: number): Promise<Role> {
        const role = await this.repo.findOne({
            where: { id },
            relations: ['permissions'],
        });
        if (!role) throw new NotFoundException(`Role #${id} not found`);
        return role;
    }

    async create(dto: CreateRoleDto): Promise<Role> {
        const existing = await this.repo.findOne({ where: { name: dto.name } });
        if (existing) throw new ConflictException(`Role "${dto.name}" already exists`);

        const permissions = dto.permissionIds?.length
            ? await Promise.all(
                dto.permissionIds.map((id) => this.permissionsService.findOne(id)),
            )
            : [];

        const role = this.repo.create({
            name: dto.name,
            description: dto.description ?? null,
            isSuperAdmin: dto.isSuperAdmin ?? false,
            permissions,
        });

        return this.repo.save(role);
    }

    async update(id: number, dto: UpdateRoleDto): Promise<Role> {
        const role = await this.findOne(id);

        if (dto.name && dto.name !== role.name) {
            const existing = await this.repo.findOne({ where: { name: dto.name } });
            if (existing) throw new ConflictException(`Role "${dto.name}" already exists`);
        }

        if (dto.permissionIds !== undefined) {
            role.permissions = dto.permissionIds.length
                ? await Promise.all(
                    dto.permissionIds.map((pid) => this.permissionsService.findOne(pid)),
                )
                : [];
        }

        if (dto.name !== undefined) role.name = dto.name;
        if (dto.description !== undefined) role.description = dto.description ?? null;
        if (dto.isSuperAdmin !== undefined) role.isSuperAdmin = dto.isSuperAdmin;

        return this.repo.save(role);
    }

    async remove(id: number): Promise<void> {
        const role = await this.findOne(id);
        if (role.isSuperAdmin) {
            throw new ConflictException('Cannot delete the super_admin role');
        }
        await this.repo.remove(role);
    }

    /** Seed default super_admin role */
    async seedDefaults(): Promise<Role> {
        const existing = await this.repo.findOne({ where: { name: 'super_admin' } });
        if (existing) return existing;
        return this.repo.save(
            this.repo.create({
                name: 'super_admin',
                description: 'Full access — bypasses all permission checks',
                isSuperAdmin: true,
                permissions: [],
            }),
        );
    }
}
