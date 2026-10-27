import { Injectable,UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '../../users/enums/role.enum';
import { TokenRevocationService } from '../token-revocation.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly tokenRevocationService: TokenRevocationService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: {
    sub: string;
    username: string;
    role: Role;
    jti?: string;
    exp?: number;
  }) {
    if (!payload.jti || !payload.exp) {
      throw new UnauthorizedException(
        'Please log in again to obtain a valid token',
      );
    }

    if (await this.tokenRevocationService.isRevoked(payload.jti)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      jti: payload.jti,
      tokenExpiresAt: payload.exp,
    };
  }
}
