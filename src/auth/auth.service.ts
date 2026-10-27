import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { StudentsService } from '../students/students.service';
import { Role } from '../users/enums/role.enum';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { TokenRevocationService } from './token-revocation.service';
import { randomUUID } from 'crypto';


@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly studentsService: StudentsService,
    private readonly jwtService: JwtService,
    private readonly tokenRevocationService: TokenRevocationService,
  ) {}

  async login(username: string, password: string) {
    // First, check whether the username belongs to a coach.
    const coach = await this.usersService.findByPersonnelCode(username);

    if (coach) {
      const passwordIsValid = await bcrypt.compare(
        password,
        coach.passwordHash,
      );

      if (!passwordIsValid) {
        throw new UnauthorizedException('Invalid username or password');
      }

      const payload = {
        sub: String(coach.id),
        username: coach.personnelCode,
        role: coach.role,
        jti: randomUUID(),
      };

      const accessToken = await this.jwtService.signAsync(payload);

      return {
        access_token: accessToken,
        user: {
          id: coach.id,
          username: coach.personnelCode,
          personnel_code: coach.personnelCode,
          first_name: coach.firstName,
          last_name: coach.lastName,
          role: coach.role,
        },
      };
    }

    // If no coach was found, check the student account.
    const student =
      await this.studentsService.findByStudentCodeForLogin(username);

    if (!student || !student.passwordHash) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const passwordIsValid = await bcrypt.compare(
      password,
      student.passwordHash,
    );

    if (!passwordIsValid) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const payload = {
      sub: String(student.id),
      username: student.studentCode,
      role: Role.STUDENT,
      jti: randomUUID(),
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      access_token: accessToken,
      user: {
        id: student.id,
        username: student.studentCode,
        student_code: student.studentCode,
        first_name: student.firstName,
        last_name: student.lastName,
        role: Role.STUDENT,
      },
    };
  }

  async guestLogin() {
    const guestId = randomUUID();
    const username = `guest-${guestId.slice(0, 8)}`;
    const payload = {
      sub: guestId,
      username,
      role: Role.GUEST,
      jti: randomUUID(),
    };

    // Guest credentials are temporary and do not create a database account.
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '30m',
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 1800,
      guest_mode: true,
      user: {
        id: guestId,
        username,
        role: Role.GUEST,
        isGuest: true,
      },
    };
  }

  async register(_registerDto: RegisterDto) {
    throw new ForbiddenException(
      'Public registration is disabled. Ask the head coach to create accounts.',
    );
  }

  async changePassword(userId: number, role: Role, dto: ChangePasswordDto) {
    if (
      role !== Role.STUDENT &&
      role !== Role.COACH &&
      role !== Role.HEAD_COACH
    ) {
      throw new ForbiddenException('Guest accounts cannot change passwords');
    }

    if (role === Role.STUDENT) {
      const student =
        await this.studentsService.findByIdForPasswordChange(userId);

      if (!student || !student.passwordHash) {
        throw new UnauthorizedException('User not found');
      }

      const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
        student.passwordHash,
      );

      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      student.passwordHash = await bcrypt.hash(dto.newPassword, 12);
      await this.studentsService.updatePasswordHash(
        student.id,
        student.passwordHash,
      );
    } else {
      const coach = await this.usersService.findByIdForPasswordChange(userId);

      if (!coach) {
        throw new UnauthorizedException('User not found');
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        dto.currentPassword,
        coach.passwordHash,
      );

      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      const passwordHash = await bcrypt.hash(dto.newPassword, 12);
      await this.usersService.updatePasswordHash(coach.id, passwordHash);
    }

    return { message: 'Password changed successfully' };
  }

  async logout(jti?: string, tokenExpiresAt?: number) {
    if (!jti || !tokenExpiresAt) {
      throw new BadRequestException('Please log in again to use secure logout');
    }

    await this.tokenRevocationService.revoke(
      jti,
      new Date(tokenExpiresAt * 1000),
    );

    return {
      message: 'Logged out successfully',
    };
  }
}
