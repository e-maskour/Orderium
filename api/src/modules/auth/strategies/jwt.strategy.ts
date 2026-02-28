import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
    sub: number;
    phoneNumber: string;
    isAdmin: boolean;
    isCustomer: boolean;
    isDelivery: boolean;
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
            isDelivery: payload.isDelivery,
        };
    }
}
