import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Role } from './enums/role.enum';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@Controller('users')
export class UsersController {
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() request: any) {
    return request.user;
  }

  @Get('head-coach-area')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HEAD_COACH)
  getHeadCoachArea() {
    return {
      message: 'Welcome Head Coach',
    };
  }
}
