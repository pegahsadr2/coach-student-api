import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}
  async login(username: string, password: string) {
    const user = await this.usersService.findByUsername(username);

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const passwordIsValid = await bcrypt.compare(password, user.password);

    if (!passwordIsValid) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const payload = {
      sub: user._id.toString(),
      username: user.username,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      access_token: accessToken,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const { username, password, role } = registerDto;

    const existingUser = await this.usersService.findByUsername(username);

    if (existingUser) {
      throw new ConflictException('Username already exists');
      // eslint-disable-next-line prettier/prettier
      }
    

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.usersService.createUser(
      username,
      hashedPassword,
      role,
    );

    return {
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
    };
  }
}
