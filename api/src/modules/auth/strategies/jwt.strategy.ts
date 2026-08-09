import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/**
 * The token carries identity only.
 *
 * Permissions used to be embedded here, which meant a role edit had no effect
 * until the user logged out. They are now resolved per request by
 * `AccessControlService`, so the token stays small and authorisation stays
 * live. Tokens minted before this change still validate — their extra claims
 * are simply ignored.
 */
export interface JwtPayload {
  sub: number;
  phoneNumber: string;
  isAdmin: boolean;
  isCustomer: boolean;
  /** 'portal' = client/delivery app token; 'admin' = backoffice token */
  scope: 'portal' | 'admin';
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
    };
  }
}
