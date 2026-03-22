import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: number;
  phoneNumber: string;
  isAdmin: boolean;
  isCustomer: boolean;
  /** 'portal' = client/delivery app token; 'admin' = backoffice token */
  scope: 'portal' | 'admin';
  /** Role ID for permission checks */
  roleId?: number | null;
  /** Whether this user's role is super_admin (bypasses all permission checks) */
  isSuperAdmin?: boolean;
  /** Array of permission keys, e.g. ["invoices.create", "products.view"] */
  permissions?: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') ?? '',
    });
  }

  validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      phoneNumber: payload.phoneNumber,
      isAdmin: payload.isAdmin,
      isCustomer: payload.isCustomer,
      scope: payload.scope ?? 'admin',
      roleId: payload.roleId ?? null,
      isSuperAdmin: payload.isSuperAdmin ?? false,
      permissions: payload.permissions ?? [],
    };
  }
}
