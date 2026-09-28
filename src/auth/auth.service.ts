import { ConflictException, Injectable } from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async register(registerDto: RegisterDto) {
    const { username, password, role } = registerDto;

    const existingUser = await this.usersService.findByUsername(username);

    if (existingUser) {
      throw new ConflictException('Username already exists');
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
