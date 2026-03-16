import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  Request,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import { PortalService } from './portal.service';
import { LoginDto, RegisterDto } from './dto/portal.dto';
import { Public } from '../auth/decorators/public.decorator';
import { ApiRes } from '../../common/api-response';
import { PRT } from '../../common/response-codes';

@ApiTags('Portal')
@Controller('portal')
export class PortalController {
  constructor(
    private readonly portalService: PortalService,
    private readonly jwtService: JwtService,
  ) { }

  @Public()
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @Post('login')
  @ApiOperation({ summary: 'Portal login' })
  async login(@Body() body: LoginDto) {
    const emailOrPhone = body.email || body.phoneNumber;
    if (!emailOrPhone) {
      throw new BadRequestException('Email or phone number required');
    }
    const user = await this.portalService.validateUser(
      emailOrPhone,
      body.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = {
      sub: user.id,
      phoneNumber: user.phoneNumber,
      isAdmin: user.isAdmin,
      isCustomer: user.isCustomer,
      isDelivery: user.isDelivery,
    };
    const token = this.jwtService.sign(payload);
    return ApiRes(PRT.LOGIN, {
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        email: user.email,
        name: user.name,
        customerId: user.customerId,
        customerName: user.name,
        isAdmin: user.isAdmin,
        isCustomer: user.isCustomer,
        isDelivery: user.isDelivery,
        deliveryId: user.deliveryId,
      },
      token,
    });
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Portal registration' })
  async register(@Body() body: RegisterDto) {
    const existingUser = await this.portalService.findByPhoneNumber(
      body.phoneNumber,
    );
    if (existingUser) {
      throw new ConflictException('Phone number already registered');
    }

    const user = await this.portalService.create({
      phoneNumber: body.phoneNumber,
      password: body.password,
      name: body.fullName,
      customerId: body.customerId,
      isCustomer: body.isCustomer ?? true,
      isDelivery: body.isDelivery ?? false,
      isAdmin: false, // Never allow self-registration as admin
    });

    const payload = {
      sub: user.id,
      phoneNumber: user.phoneNumber,
      isAdmin: user.isAdmin,
      isCustomer: user.isCustomer,
      isDelivery: user.isDelivery,
    };
    const token = this.jwtService.sign(payload);

    return ApiRes(PRT.REGISTERED, {
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        customerId: user.customerId,
        isCustomer: user.isCustomer,
        isDelivery: user.isDelivery,
        isAdmin: user.isAdmin,
      },
      token,
    });
  }

  // @UseGuards(JwtAuthGuard)
  @Get('user/:phoneNumber')
  @ApiOperation({ summary: 'Get portal user by phone number (authenticated)' })
  async getUserByPhone(
    @Param('phoneNumber') phoneNumber: string,
    @Request() req: { user: { id: number; isAdmin: boolean } },
  ) {
    const user = await this.portalService.findByPhoneNumber(phoneNumber);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    // Non-admin users may only retrieve their own profile
    if (!req.user.isAdmin && req.user.id !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    return ApiRes(PRT.USER_DETAIL, {
      id: user.id,
      phoneNumber: user.phoneNumber,
      name: user.name,
      customerId: user.customerId,
      customerName: user.name,
      isCustomer: user.isCustomer,
      isDelivery: user.isDelivery,
    });
  }

  @Get('me/data-export')
  @ApiOperation({ summary: 'Export own personal data (GDPR)' })
  async exportMyData(@Request() req: { user: { id: number; sub: number } }) {
    const userId = req.user.sub ?? req.user.id;
    const data = await this.portalService.exportUserData(userId);
    if (!data) {
      throw new NotFoundException('User not found');
    }
    return ApiRes(PRT.USER_DETAIL, data);
  }

  @Delete('me/account')
  @ApiOperation({ summary: 'Delete own account and personal data (GDPR)' })
  async deleteMyAccount(@Request() req: { user: { id: number; sub: number } }) {
    const userId = req.user.sub ?? req.user.id;
    const user = await this.portalService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.portalService.deleteUserData(userId);
    return ApiRes(PRT.USER_DETAIL, { deleted: true });
  }
}
