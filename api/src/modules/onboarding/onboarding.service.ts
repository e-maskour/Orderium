import {
    Injectable,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Configuration } from '../configurations/entities/configuration.entity';
import { Portal } from '../portal/entities/portal.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class OnboardingService {
    constructor(
        private readonly tenantConnService: TenantConnectionService,
        private readonly tenantService: TenantService,
        private readonly jwtService: JwtService,
    ) { }

    private get configRepository() {
        return this.tenantConnService.getRepository(Configuration);
    }

    private get portalRepository() {
        return this.tenantConnService.getRepository(Portal);
    }

    async getStatus() {
        const company = await this.configRepository.findOne({
            where: { entity: 'my_company' },
        });

        const companyProfileDone = Boolean(
            company?.values?.['companyName'] &&
            String(company.values['companyName']).trim().length > 0,
        );

        const adminCount = await this.portalRepository.count({
            where: { isAdmin: true },
        });

        // Include tenant lifecycle info for the trial banner
        const tenantSlug = this.tenantConnService.getCurrentTenantSlug();
        const tenant = await this.tenantService.getTenantBySlug(tenantSlug);
        const trialDaysRemaining = tenant?.trialEndsAt
            ? Math.max(0, Math.ceil((tenant.trialEndsAt.getTime() - Date.now()) / 86_400_000))
            : null;

        return {
            is_onboarded: companyProfileDone && adminCount > 0,
            steps: {
                company_profile: companyProfileDone,
                super_admin: adminCount > 0,
            },
            tenant: tenant ? {
                status: tenant.status,
                subscriptionPlan: tenant.subscriptionPlan,
                trialDaysRemaining: tenant.status === 'trial' ? trialDaysRemaining : null,
                trialEndsAt: tenant.trialEndsAt ?? null,
                subscriptionEndsAt: tenant.subscriptionEndsAt ?? null,
            } : null,
        };
    }

    async getTenantPublicStatus(slug: string) {
        const tenant = await this.tenantService.getTenantBySlug(slug);
        if (!tenant) {
            return null;
        }
        const trialDaysRemaining = tenant.trialEndsAt
            ? Math.max(0, Math.ceil((tenant.trialEndsAt.getTime() - Date.now()) / 86_400_000))
            : null;
        return {
            status: tenant.status,
            isActive: tenant.isActive,
            statusReason: tenant.statusReason ?? null,
            trialDaysRemaining: tenant.status === 'trial' ? trialDaysRemaining : null,
            trialEndsAt: tenant.trialEndsAt ?? null,
            subscriptionEndsAt: tenant.subscriptionEndsAt ?? null,
        };
    }

    async createCompany(dto: CreateCompanyDto): Promise<Configuration> {
        // The seeder always pre-creates the my_company row — we only ever update it.
        const existing = await this.configRepository.findOne({
            where: { entity: 'my_company' },
        });

        if (!existing) {
            // Safety fallback if seeder hasn't run
            const config = this.configRepository.create({
                entity: 'my_company',
                values: dto as unknown as Record<string, unknown>,
            });
            return this.configRepository.save(config);
        }

        existing.values = dto as unknown as Record<string, unknown>;
        return this.configRepository.save(existing);
    }

    async createAdmin(dto: CreateAdminDto) {
        // Step 1 prerequisite
        const company = await this.configRepository.findOne({
            where: { entity: 'my_company' },
        });
        if (
            !company?.values?.['companyName'] ||
            String(company.values['companyName']).trim().length === 0
        ) {
            throw new BadRequestException(
                'Please complete the company profile (Step 1) first',
            );
        }

        // Guard: only one admin allowed via onboarding
        const adminCount = await this.portalRepository.count({
            where: { isAdmin: true },
        });
        if (adminCount > 0) {
            throw new ConflictException(
                'An admin account already exists for this tenant',
            );
        }

        // Phone uniqueness check
        const existingPhone = await this.portalRepository.findOne({
            where: { phoneNumber: dto.phoneNumber },
        });
        if (existingPhone) {
            throw new ConflictException('Phone number already registered');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const portal = this.portalRepository.create({
            phoneNumber: dto.phoneNumber,
            name: dto.fullName,
            email: dto.email,
            password: hashedPassword,
            isAdmin: true,
            isCustomer: false,
            isDelivery: false,
            isActive: true,
        });

        const saved = await this.portalRepository.save(portal);

        const token = this.jwtService.sign({
            sub: saved.id,
            phoneNumber: saved.phoneNumber,
            isAdmin: true,
            isCustomer: false,
            isDelivery: false,
        });

        return {
            user: {
                id: saved.id,
                phoneNumber: saved.phoneNumber,
                email: saved.email,
                name: saved.name,
                fullName: saved.name,
                isAdmin: true,
                isCustomer: false,
                isDelivery: false,
            },
            token,
        };
    }

    async completeOnboarding(): Promise<Configuration> {
        const existing = await this.configRepository.findOne({
            where: { entity: 'onboarding' },
        });

        const values: Record<string, unknown> = {
            completed: true,
            completed_at: new Date().toISOString(),
        };

        if (existing) {
            existing.values = values;
            return this.configRepository.save(existing);
        }

        const config = this.configRepository.create({
            entity: 'onboarding',
            values,
        });
        return this.configRepository.save(config);
    }
}
