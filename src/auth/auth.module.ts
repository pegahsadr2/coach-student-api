import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { StudentsModule } from '../students/students.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RevokedToken } from './entities/revoked-token.entity';
import { TokenRevocationService } from './token-revocation.service';

@Module({
  imports: [
    UsersModule,
    StudentsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '1h',
        },
      }),
    }),

   TypeOrmModule.forFeature([RevokedToken]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard, TokenRevocationService ],
})
export class AuthModule {}
