import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { CreateExamActivityDto } from './dto/create-exam-activity.dto';
import { ApplyExamErrorDto } from './dto/apply-exam-error.dto';
@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get('my')
  @Roles(Role.STUDENT)
  getMyExams(@Req() request: any) {
    return this.examsService.getMyExams(Number(request.user.id));
  }

  @Get('my/:id')
  @Roles(Role.STUDENT)
  getMyExamById(
    @Param('id', ParseIntPipe) examId: number,
    @Req() request: any,
  ) {
    return this.examsService.getMyExamById(examId, Number(request.user.id));
  }

  @Post()
  @Roles(Role.COACH, Role.HEAD_COACH)
  createExam(@Body() dto: CreateExamDto, @Req() request: any) {
    return this.examsService.createExam(
      dto,
      Number(request.user.id),
      request.user.role,
    );
  }

  @Post(':id/start')
  @Roles(Role.STUDENT)
  startExam(@Param('id', ParseIntPipe) examId: number, @Req() request: any) {
    return this.examsService.startExam(examId, Number(request.user.id));
  }

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

  @Post(':id/finish')
  @Roles(Role.STUDENT)
  finishExam(@Param('id', ParseIntPipe) examId: number, @Req() request: any) {
    return this.examsService.finishExam(examId, Number(request.user.id));
  }
}
