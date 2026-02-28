import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { Public } from './modules/auth/decorators/public.decorator';
import { ApiRes } from './common/api-response';
import { APP } from './common/response-codes';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectConnection() private readonly connection: Connection,
  ) { }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Root endpoint' })
  getHello() {
    return ApiRes(APP.API_INFO, { message: this.appService.getHello() });
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  async healthCheck() {
    try {
      await this.connection.query('SELECT 1');
      return ApiRes(APP.HEALTH_OK, {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch {
      return ApiRes(APP.HEALTH_OK, {
        status: 'error',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
