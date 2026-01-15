import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PortalService } from './portal.service';

@ApiTags('Portal')
@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Post('login')
  @ApiOperation({ summary: 'Portal login' })
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.portalService.validateUser(
      body.email,
      body.password,
    );
    if (!user) {
      return { success: false, message: 'Invalid credentials' };
    }
    return {
      success: true,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        isCustomer: user.isCustomer,
        isDelivery: user.isDelivery,
      },
    };
  }

  @Post('register')
  @ApiOperation({ summary: 'Portal registration' })
  async register(
    @Body()
    body: {
      phoneNumber: string;
      password: string;
      fullName?: string;
      customerId?: number;
      isCustomer?: boolean;
      isDelivery?: boolean;
      isAdmin?: boolean;
    },
  ) {
    const existingUser = await this.portalService.findByPhoneNumber(
      body.phoneNumber,
    );
    if (existingUser) {
      return { success: false, message: 'Phone number already registered' };
    }

    const user = await this.portalService.create({
      phoneNumber: body.phoneNumber,
      password: body.password,
      name: body.fullName,
      customerId: body.customerId,
      isCustomer: body.isCustomer ?? true, // Default to true for client portal
      isDelivery: body.isDelivery ?? false,
      isAdmin: body.isAdmin ?? false,
    });

    return {
      success: true,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        customerId: user.customerId,
        isCustomer: user.isCustomer,
        isDelivery: user.isDelivery,
        isAdmin: user.isAdmin,
      },
      token: 'mock-token', // TODO: Implement JWT token generation
    };
  }

  @Get('user/:phoneNumber')
  @ApiOperation({ summary: 'Get portal user by phone number' })
  async getUserByPhone(@Param('phoneNumber') phoneNumber: string) {
    const user = await this.portalService.findByPhoneNumber(phoneNumber);
    if (!user) {
      return { success: false };
    }
    return {
      success: true,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        customerId: user.customerId,
        customerName: user.name,
        isCustomer: user.isCustomer,
        isDelivery: user.isDelivery,
        isAdmin: user.isAdmin,
      },
    };
  }
}
