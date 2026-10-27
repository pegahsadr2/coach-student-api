import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RevokedToken } from './entities/revoked-token.entity';

@Injectable()
export class TokenRevocationService {
  constructor(
    @InjectRepository(RevokedToken)
    private readonly revokedTokenRepository: Repository<RevokedToken>,
  ) {}

  async revoke(jti: string, expiresAt: Date): Promise<void> {
    // Remove expired revocation records to keep the table small.
    await this.revokedTokenRepository
      .createQueryBuilder()
      .delete()
      .where('expires_at <= CURRENT_TIMESTAMP')
      .execute();

    const existing = await this.revokedTokenRepository.findOne({
      where: { jti },
    });

    if (existing) {
      return;
    }

    const revokedToken = this.revokedTokenRepository.create({
      jti,
      expiresAt,
    });

    await this.revokedTokenRepository.save(revokedToken);
  }

  async isRevoked(jti: string): Promise<boolean> {
    const token = await this.revokedTokenRepository.findOne({
      where: { jti },
    });

    return token !== null;
  }
}
