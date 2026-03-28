import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Morocom API - NestJS Edition 🚀';
  }
}
