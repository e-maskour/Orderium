import {
    Controller,
    Get,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    Req,
    UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OnboardingService } from './onboarding.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { Public } from '../auth/decorators/public.decorator';
import { ApiRes } from '../../common/api-response';
import { ONB } from '../../common/response-codes';

@ApiTags('Onboarding')
@Controller('onboarding')
export class OnboardingController {
    constructor(private readonly onboardingService: OnboardingService) { }

    /**
     * Public — check if this tenant has completed onboarding.
     * Returns boolean flags only, no sensitive data.
     * Uses a generous throttle since the frontend calls this on every page load.
     */
    @Public()
    @Get('status')
    @Throttle({ short: { limit: 60, ttl: 60000 } })
    @ApiOperation({ summary: 'Get onboarding status (public)' })
    @ApiResponse({ status: 200, description: 'Onboarding status' })
    async getStatus() {
        const status = await this.onboardingService.getStatus();
        return ApiRes(ONB.STATUS, status);
    }

    /**
     * Public — returns tenant's current status without being blocked by TenantMiddleware.
     * Used by frontend apps to show a proper suspended/disabled screen.
     * Excluded from TenantMiddleware status-checks (safe to call for any tenant state).
     */
    @Public()
    @Get('public-status')
    @Throttle({ short: { limit: 60, ttl: 60000 } })
    @ApiOperation({ summary: 'Get tenant public status (always accessible)' })
    @ApiResponse({ status: 200, description: 'Tenant public status' })
    @ApiResponse({ status: 401, description: 'Missing tenant identifier' })
    async getTenantPublicStatus(@Req() req: Request) {
        const slug = this.extractSlug(req);
        if (!slug) {
            throw new UnauthorizedException('Missing tenant identifier. Provide X-Tenant-ID header or call from a valid tenant subdomain.');
        }
        const status = await this.onboardingService.getTenantPublicStatus(slug);
        return ApiRes(ONB.STATUS, status);
    }

    private extractSlug(req: Request): string | null {
        const header = req.headers['x-tenant-id'];
        if (typeof header === 'string' && header.trim()) {
            return header.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
        }
        const originLike = (req.headers['origin'] ?? req.headers['referer']) as string | undefined;
        if (originLike) {
            const match = originLike.match(/^https?:\/\/([a-z0-9-]+)-(admin|app|delivery)\./i);
            if (match) return match[1].toLowerCase().replace(/[^a-z0-9-]/g, '');
        }
        return null;
    }

    /**
     * Public — create the company profile (Step 1).
     * Returns 409 if a company profile already exists.
     */
    @Public()
    @Post('company')
    @Throttle({ short: { limit: 5, ttl: 60000 } })
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create company profile (onboarding step 1)' })
    @ApiResponse({ status: 201, description: 'Company profile created' })
    @ApiResponse({ status: 409, description: 'Company profile already exists' })
    async createCompany(@Body() dto: CreateCompanyDto) {
        const company = await this.onboardingService.createCompany(dto);
        return ApiRes(ONB.COMPANY_CREATED, company);
    }

    /**
     * Public — create the first super-admin account (Step 2).
     * Returns 409 if any admin user already exists.
     * Returns a JWT so the admin is auto-logged-in.
     */
    @Public()
    @Post('admin')
    @Throttle({ short: { limit: 5, ttl: 60000 } })
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create first admin account (onboarding step 2)' })
    @ApiResponse({ status: 201, description: 'Admin account created with JWT token' })
    @ApiResponse({ status: 409, description: 'Admin user already exists' })
    async createAdmin(@Body() dto: CreateAdminDto) {
        const result = await this.onboardingService.createAdmin(dto);
        return ApiRes(ONB.ADMIN_CREATED, result);
    }

    /**
     * Public — mark onboarding as complete.
     * Called immediately after admin creation; the entire setup flow is the proof of legitimacy.
     */
    @Public()
    @Post('complete')
    @Throttle({ short: { limit: 5, ttl: 60000 } })
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Mark onboarding complete (public)' })
    @ApiResponse({ status: 200, description: 'Onboarding marked as complete' })
    async complete() {
        const result = await this.onboardingService.completeOnboarding();
        return ApiRes(ONB.COMPLETED, result);
    }
}
