import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { StudentsService } from '../students/students.service';
import { Role } from '../users/enums/role.enum';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly studentsService: StudentsService,
    private readonly jwtService: JwtService,
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

  async register(_registerDto: RegisterDto) {
    throw new ForbiddenException(
      'Public registration is disabled. Ask the head coach to create accounts.',
    );
  }
}
