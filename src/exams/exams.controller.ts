
import {
  Body,
  Controller,
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

@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @Roles(Role.COACH, Role.HEAD_COACH)
  createExam(
    @Body() dto: CreateExamDto,
    @Req() request: any,
  ) {
    return this.examsService.createExam(
      dto,
      Number(request.user.id),
      request.user.role,
    );
  }
}


