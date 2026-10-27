import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Roles(Role.HEAD_COACH, Role.COACH)
  @ApiOperation({
    summary: 'Get dashboard summary',
    description:
      'Head coaches receive system-wide counts. Coaches receive counts limited to their assigned courses and their own sessions/exams. No request body is needed.',
  })
  @ApiOkResponse({
    description: 'Summary counters for the authenticated coach or head coach.',
    schema: {
      example: {
        role: 'head_coach',
        headCoachCount: 1,
        coachCount: 4,
        studentCount: 28,
        courseCount: 3,
        sessionCount: 16,
        todaySessionCount: 2,
        examCount: 12,
      },
    },
  })
  getSummary(@Req() request: any) {
    return this.dashboardService.getSummary(
      Number(request.user.id),
      request.user.role,
    );
  }

  @Get('today-sessions')
  @Roles(Role.HEAD_COACH, Role.COACH)
  @ApiOperation({
    summary: 'List today\'s sessions and enrolled students',
    description:
      'Head coaches see all sessions for the current database date. Coaches see their own sessions only. No request body is needed.',
  })
  @ApiOkResponse({
    description: 'Sessions taking place today, including each session\'s enrolled students.',
    schema: {
      example: [
        {
          sessionId: 3,
          sessionName: 'Introduction Session',
          sessionDate: '2026-10-27',
          sessionTime: '10:00:00',
          description: 'Practice session',
          courseId: 1,
          courseName: 'Autumn 2026',
          coachId: 2,
          coachFirstName: 'Sara',
          coachLastName: 'Ahmadi',
          studentCount: 2,
          students: [
            { id: 1, studentCode: 'ST001', firstName: 'Ali', lastName: 'Ahmadi' },
            { id: 2, studentCode: 'ST002', firstName: 'Mina', lastName: 'Karimi' },
          ],
        },
      ],
    },
  })
  getTodaySessions(@Req() request: any) {
    return this.dashboardService.getTodaySessions(
      Number(request.user.id),
      request.user.role,
    );
  }

  @Get('course-stats')
  @Roles(Role.HEAD_COACH, Role.COACH)
  @ApiOperation({
    summary: 'Get course statistics',
    description:
      'Head coaches see all courses. Coaches see courses to which they are assigned. Returns counts of coaches, sessions, unique enrolled students, and exams for each course.',
  })
  @ApiOkResponse({
    description: 'Course information and aggregate counts.',
    schema: {
      example: [
        {
          courseId: 1,
          courseName: 'Autumn 2026',
          startDate: '2026-10-01',
          endDate: '2026-12-31',
          coachCount: 2,
          sessionCount: 6,
          studentCount: 14,
          examCount: 9,
        },
      ],
    },
  })
  getCourseStats(@Req() request: any) {
    return this.dashboardService.getCourseStats(
      Number(request.user.id),
      request.user.role,
    );
  }

  @Get('coach-stats')
  @Roles(Role.HEAD_COACH)
  @ApiOperation({
    summary: 'Get coach statistics',
    description:
      'Head coach only. Shows course assignments, sessions, unique enrolled students, and exams for every coach. Password hashes are never returned.',
  })
  @ApiOkResponse({
    description: 'Statistics for each coach.',
    schema: {
      example: [
        {
          coachId: 2,
          firstName: 'Sara',
          lastName: 'Ahmadi',
          personnelCode: 'COACH001',
          assignedCourseCount: 1,
          sessionCount: 4,
          studentCount: 8,
          examCount: 5,
        },
      ],
    },
  })
  getCoachStats() {
    return this.dashboardService.getCoachStats();
  }
}
