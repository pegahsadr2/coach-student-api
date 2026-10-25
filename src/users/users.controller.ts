import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsersService } from './users.service';
import { Role } from './enums/role.enum';
import { CreateCoachDto } from './dto/create-coach.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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

  @Post('coaches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HEAD_COACH)
  async createCoach(@Body() dto: CreateCoachDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const coach = await this.usersService.createCoach({
      firstName: dto.firstName,
      lastName: dto.lastName,
      personnelCode: dto.personnelCode,
      passwordHash,
      role: Role.COACH,
    });

    return {
      message: 'Coach created successfully',
      coach: {
        id: coach.id,
        firstName: coach.firstName,
        lastName: coach.lastName,
        personnelCode: coach.personnelCode,
        role: coach.role,
        createdAt: coach.createdAt,
      },
    };
  }
}
