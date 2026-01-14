import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Portal } from './entities/portal.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PortalService {
  constructor(
    @InjectRepository(Portal)
    private readonly portalRepository: Repository<Portal>,
  ) {}

  async findByEmail(email: string): Promise<Portal | null> {
    return this.portalRepository.findOne({ where: { email } });
  }

  async validateUser(email: string, password: string): Promise<Portal | null> {
    const user = await this.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  async create(data: Partial<Portal>): Promise<Portal> {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    const user = this.portalRepository.create(data);
    return this.portalRepository.save(user);
  }
}
