import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Marnova API - NestJS Edition 🚀';
  }
}
