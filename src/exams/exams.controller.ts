import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { CreateExamActivityDto } from './dto/create-exam-activity.dto';
import { ApplyExamErrorDto } from './dto/apply-exam-error.dto';

@ApiTags('Exams')
@ApiBearerAuth('access-token')
@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @ApiOperation({ summary: 'List my exams', description: 'Student-only. Returns exams owned by the authenticated student. No request body is needed.' })
  @Get('my')
  @Roles(Role.STUDENT)
  getMyExams(@Req() request: any) {
    return this.examsService.getMyExams(Number(request.user.id));
  }

  @ApiOperation({ summary: 'Get one of my exams', description: 'Student-only. The exam must belong to the authenticated student.' })
  @ApiParam({ name: 'id', example: 1, description: 'Existing exam ID owned by the logged-in student.' })
  @Get('my/:id')
  @Roles(Role.STUDENT)
  getMyExamById(
    @Param('id', ParseIntPipe) examId: number,
    @Req() request: any,
  ) {
    return this.examsService.getMyExamById(examId, Number(request.user.id));
  }

  @ApiOperation({
    summary: 'Get a completed exam report card',
    description:
      'Returns the student, coach, course, session, exam area, score calculation, and activity history. Students can view only their own report cards; coaches can view exams they are responsible for; head coaches can view all report cards. The exam must be COMPLETED. No request body is needed.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'ID of an existing completed exam.' })
  @ApiOkResponse({
    description: 'Completed exam report card and activity detail.',
    schema: {
      example: {
        exam: {
          examId: 1,
          mode: 'exam',
          examType: 'real_hardware',
          status: 'COMPLETED',
          startedAt: '2026-10-27T08:00:00.000Z',
          finishedAt: '2026-10-27T08:12:00.000Z',
          totalScore: '14.00',
          studentId: 3,
          studentCode: 'ST003',
          studentFirstName: 'Ali',
          studentLastName: 'Ahmadi',
          sessionId: 2,
          sessionName: 'Introduction Session',
          sessionDate: '2026-10-27',
          sessionTime: '10:00:00',
          courseId: 1,
          courseName: 'Autumn 2026',
          coachId: 2,
          coachPersonnelCode: 'COACH001',
          coachFirstName: 'Sara',
          coachLastName: 'Ahmadi',
          examAreaId: 1,
          examAreaName: 'Test 1',
          baseScore: '20.00',
          durationMinutes: 15,
          passed: false,
          areaScore: '14.00',
        },
        scoring: {
          baseScore: '20.00',
          totalPenalty: '6.00',
          errorCount: 1,
          totalScore: '14.00',
          passed: false,
          result: 'FAILED',
        },
        activities: [
          {
            id: 1,
            examAreaId: 1,
            examAreaName: 'Test 1',
            errorTypeId: 2,
            activityType: 'error',
            title: 'Wrong order',
            penalty: '6.00',
            occurredAt: '2026-10-27T08:05:00.000Z',
          },
        ],
      },
    },
  })
  @Get(':id/report-card')
  @Roles(Role.STUDENT, Role.COACH, Role.HEAD_COACH)
  getReportCard(@Param('id', ParseIntPipe) examId: number, @Req() request: any) {
    return this.examsService.getReportCard(
      examId,
      Number(request.user.id),
      request.user.role,
    );
  }

  @ApiOperation({ summary: 'List activities for an exam', description: 'Use an exam ID that the authenticated user is allowed to access. No request body is needed.' })
  @ApiParam({ name: 'id', example: 1, description: 'Existing exam ID.' })
  @Get(':id/activities')
  @Roles(Role.STUDENT, Role.COACH, Role.HEAD_COACH)
  getExamActivities(
    @Param('id', ParseIntPipe) examId: number,
    @Req() request: any,
  ) {
    return this.examsService.getExamActivities(
      examId,
      Number(request.user.id),
      request.user.role,
    );
  }

  @ApiOperation({ summary: 'Create an exam', description: 'Coach or head coach. sessionId, studentId and examAreaId must refer to existing records; the student should be enrolled in the session.' })
  @ApiBody({ type: CreateExamDto })
  @Post()
  @Roles(Role.COACH, Role.HEAD_COACH)
  createExam(@Body() dto: CreateExamDto, @Req() request: any) {
    return this.examsService.createExam(
      dto,
      Number(request.user.id),
      request.user.role,
    );
  }

  @ApiOperation({
    summary: 'Update a pending exam before the student starts it',
    description:
      'Coach or head coach only. The exam must still be PENDING. Coaches may edit only exams they are responsible for and may not move an exam to another coach’s session. The selected student must be enrolled in the selected session. If any activities/errors have already been recorded, cancel the exam and create a new one instead.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'Existing exam ID with PENDING status.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'integer', example: 2 },
        studentId: { type: 'integer', example: 3 },
        examAreaId: { type: 'integer', example: 1 },
        mode: { type: 'string', enum: ['exam', 'practice'], example: 'practice' },
        examType: { type: 'string', enum: ['real_hardware', 'interactive'], example: 'interactive' },
      },
      example: { mode: 'practice', examType: 'interactive' },
    },
    examples: {
      changeMode: {
        summary: 'Change only the mode to practice',
        value: { mode: 'practice' },
      },
      changeExamSetup: {
        summary: 'Change the mode and type',
        value: { mode: 'practice', examType: 'interactive' },
      },
      changeSessionStudentAndArea: {
        summary: 'Change the session, student, and exam area',
        value: { sessionId: 2, studentId: 3, examAreaId: 1 },
      },
    },
  })
  @Patch(':id')
  @Roles(Role.COACH, Role.HEAD_COACH)
  updatePendingExam(
    @Param('id', ParseIntPipe) examId: number,
    @Body() dto: UpdateExamDto,
    @Req() request: any,
  ) {
    return this.examsService.updatePendingExam(
      examId,
      dto,
      Number(request.user.id),
      request.user.role,
    );
  }

  @ApiOperation({
    summary: 'Cancel a pending exam before student confirmation',
    description:
      'Coach or head coach only. Only a PENDING exam can be canceled. Cancellation keeps the record for history by changing its status to ABANDONED; it does not hard-delete the exam.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'Existing exam ID with PENDING status.' })
  @Post(':id/cancel')
  @Roles(Role.COACH, Role.HEAD_COACH)
  cancelPendingExam(@Param('id', ParseIntPipe) examId: number, @Req() request: any) {
    return this.examsService.cancelPendingExam(
      examId,
      Number(request.user.id),
      request.user.role,
    );
  }

  @ApiOperation({ summary: 'Start an exam', description: 'Student-only. The exam must belong to the student and be in PENDING status. No request body is needed.' })
  @ApiParam({ name: 'id', example: 1, description: 'Existing pending exam ID belonging to the logged-in student.' })
  @Post(':id/start')
  @Roles(Role.STUDENT)
  startExam(@Param('id', ParseIntPipe) examId: number, @Req() request: any) {
    return this.examsService.startExam(examId, Number(request.user.id));
  }

  @ApiOperation({ summary: 'Record an exam activity', description: 'Student-only. Use the correct example for a successful step, or the error example to report a predefined procedure error.' })
  @ApiParam({ name: 'id', example: 1, description: 'Existing exam ID that is IN_PROGRESS and belongs to the logged-in student.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['activityType'],
      properties: {
        activityType: { type: 'string', enum: ['correct', 'error'], example: 'correct' },
        errorTypeId: { type: 'integer', minimum: 1, example: 1 },
      },
    },
    examples: {
      correctStep: {
        summary: 'Record a correct step',
        value: { activityType: 'correct' },
      },
      procedureError: {
        summary: 'Report a procedure error',
        value: { activityType: 'error', errorTypeId: 1 },
      },
    },
  })
  @Post(':id/activities')
  @Roles(Role.STUDENT)
  createActivity(
    @Param('id', ParseIntPipe) examId: number,
    @Body() dto: CreateExamActivityDto,
    @Req() request: any,
  ) {
    return this.examsService.createActivity(
      examId,
      Number(request.user.id),
      dto,
    );
  }

  @ApiOperation({ summary: 'Apply a pre-exam error', description: 'Coach or head coach. Exam must be PENDING; errorTypeId must refer to a predefined coach_applied or visual error for this exam area.' })
  @ApiParam({ name: 'id', example: 1, description: 'Existing pending exam ID.' })
  @ApiBody({ type: ApplyExamErrorDto })
  @Post(':id/apply-error')
  @Roles(Role.COACH, Role.HEAD_COACH)
  applyError(
    @Param('id', ParseIntPipe) examId: number,
    @Body() dto: ApplyExamErrorDto,
    @Req() request: any,
  ) {
    return this.examsService.applyError(
      examId,
      dto,
      Number(request.user.id),
      request.user.role,
    );
  }

  @ApiOperation({ summary: 'Record a visual error during an exam', description: 'Coach or head coach. Use a predefined visual error applicable to this exam area.' })
  @ApiParam({ name: 'id', example: 1, description: 'Existing exam ID.' })
  @ApiBody({ type: ApplyExamErrorDto })
  @Post(':id/visual-errors')
  @Roles(Role.COACH, Role.HEAD_COACH)
  createVisualError(
    @Param('id', ParseIntPipe) examId: number,
    @Body() dto: ApplyExamErrorDto,
    @Req() request: any,
  ) {
    return this.examsService.createVisualError(
      examId,
      dto,
      Number(request.user.id),
      request.user.role,
    );
  }

  @ApiOperation({ summary: 'Finish an exam', description: 'Student-only. The exam must be IN_PROGRESS and belong to the logged-in student. No request body is needed.' })
  @ApiParam({ name: 'id', example: 1, description: 'Existing in-progress exam ID belonging to the logged-in student.' })
  @Post(':id/finish')
  @Roles(Role.STUDENT)
  finishExam(@Param('id', ParseIntPipe) examId: number, @Req() request: any) {
    return this.examsService.finishExam(examId, Number(request.user.id));
  }
}
