import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class ExamIntegrationGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedKey = this.configService.get<string>(
      'INBOUND_INTEGRATION_API_KEY',
    );

    const request = context.switchToHttp().getRequest();

    const receivedKey = request.headers['x-integration-key'];

    if (!expectedKey || typeof receivedKey !== 'string') {
      throw new UnauthorizedException('Invalid integration credentials');
    }

    const expected = Buffer.from(expectedKey);
    const received = Buffer.from(receivedKey);

    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      throw new UnauthorizedException('Invalid integration credentials');
    }

    return true;
  }
}