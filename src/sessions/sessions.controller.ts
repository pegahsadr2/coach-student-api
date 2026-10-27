import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { AddStudentToSessionDto } from './dto/add-student-to-session.dto';
import { SessionsService } from './sessions.service';

@ApiTags('Sessions')
@ApiBearerAuth('access-token')
@Controller('sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @ApiOperation({
    summary: 'Create a session',
    description:
      'Coach or head coach. The course must exist, the coach must be assigned to it, and the session date must be within the course term.',
  })
  @ApiBody({ type: CreateSessionDto })
  @Post()
  @Roles(Role.COACH, Role.HEAD_COACH)
  createSession(@Body() dto: CreateSessionDto, @Req() request: any) {
    return this.sessionsService.createSession(
      dto,
      Number(request.user.id),
      request.user.role,
    );
  }

  @ApiOperation({
    summary: 'Get my sessions',
    description:
      'Returns sessions visible to the authenticated coach/head coach. No request body is needed.',
  })
  @Get('my')
  @Roles(Role.COACH, Role.HEAD_COACH)
  getMySessions(@Req() request: any) {
    return this.sessionsService.getMySessions(
      Number(request.user.id),
      request.user.role,
    );
  }

  @ApiOperation({
    summary: 'Update a session',
    description:
      'Coach can update only their own sessions; head coach can update any session. Only supplied fields are changed. The date must remain within the course date range.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'Existing session ID.' })
  @ApiBody({ type: UpdateSessionDto })
  @Patch(':id')
  @Roles(Role.COACH, Role.HEAD_COACH)
  updateSession(
    @Param('id', ParseIntPipe) sessionId: number,
    @Body() dto: UpdateSessionDto,
    @Req() request: any,
  ) {
    return this.sessionsService.updateSession(
      sessionId,
      dto,
      Number(request.user.id),
      request.user.role,
    );
  }

  @ApiOperation({
    summary: 'Delete a session',
    description:
      'Coach can delete only their own sessions; head coach can delete any session. Related records are affected according to the PostgreSQL foreign-key rules configured for the database. Use a test session when verifying deletion.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'Existing session ID.' })
  @Delete(':id')
  @Roles(Role.COACH, Role.HEAD_COACH)
  deleteSession(
    @Param('id', ParseIntPipe) sessionId: number,
    @Req() request: any,
  ) {
    return this.sessionsService.deleteSession(
      sessionId,
      Number(request.user.id),
      request.user.role,
    );
  }

  @ApiOperation({
    summary: 'Add a student to a session',
    description:
      'The session and student must already exist; a student cannot be enrolled twice.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'Existing session ID.' })
  @ApiBody({ type: AddStudentToSessionDto })
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

  @ApiOperation({
    summary: 'List students in a session',
    description:
      'Use an existing session ID visible to the authenticated coach/head coach. No request body is needed.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'Existing session ID.' })
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

  @ApiOperation({
    summary: 'Remove a student from a session',
    description:
      'Removes only the enrollment link. It does not delete the student account or that student’s other session enrollments. Coach can manage only their own session.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'Existing session ID.' })
  @ApiParam({ name: 'studentId', example: 1, description: 'Existing student ID enrolled in this session.' })
  @Delete(':id/students/:studentId')
  @Roles(Role.COACH, Role.HEAD_COACH)
  removeStudentFromSession(
    @Param('id', ParseIntPipe) sessionId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Req() request: any,
  ) {
    return this.sessionsService.removeStudentFromSession(
      sessionId,
      studentId,
      Number(request.user.id),
      request.user.role,
    );
  }
}
