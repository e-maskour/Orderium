import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PortalService } from './portal.service';

@ApiTags('Portal')
@Controller('api/portal')
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
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
