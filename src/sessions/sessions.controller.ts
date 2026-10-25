import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Param,
  ParseIntPipe,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';

import { CreateSessionDto } from './dto/create-session.dto';
import { AddStudentToSessionDto } from './dto/add-student-to-session.dto';
import { SessionsService } from './sessions.service';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('access-token')
@Controller('sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @Roles(Role.COACH, Role.HEAD_COACH)
  createSession(@Body() dto: CreateSessionDto, @Req() request: any) {
    return this.sessionsService.createSession(
      dto,
      Number(request.user.id),
      request.user.role,
    );
  }

  @Get('my')
  @Roles(Role.COACH, Role.HEAD_COACH)
  getMySessions(@Req() request: any) {
    return this.sessionsService.getMySessions(
      Number(request.user.id),
      request.user.role,
    );
  }

  @Post(':id/students')
  @Roles(Role.COACH, Role.HEAD_COACH)
  addStudentToSession(
    @Param('id', ParseIntPipe) sessionId: number,
    @Body() dto: AddStudentToSessionDto,
    @Req() request: any,
  ) {
    return this.sessionsService.addStudentToSession(
      sessionId,
      dto.studentId,
      Number(request.user.id),
      request.user.role,
    );
  }
  @Get(':id/students')
  @Roles(Role.COACH, Role.HEAD_COACH)
  getSessionStudents(
    @Param('id', ParseIntPipe) sessionId: number,
    @Req() request: any,
  ) {
    return this.sessionsService.getSessionStudents(
      sessionId,
      Number(request.user.id),
      request.user.role,
    );
  }
}
