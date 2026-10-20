
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  NotFoundException,
  UseGuards,
  Request,
} from '@nestjs/common';

import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.COACH, Role.HEAD_COACH)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  create(@Body() dto: CreateStudentDto, @Request() req: any) {
    return this.studentsService.create(dto, Number(req.user.id));
  }

  @Get()
  findAll() {
    return this.studentsService.findAll();
  }

  @Get('me/academic-record')
  @Roles(Role.STUDENT)
  getMyAcademicRecord(@Request() req: any) {
    return this.studentsService.getAcademicRecord(Number(req.user.id));
  }

  @Get('course-academic-records')
  @Roles(Role.COACH)
  getCourseAcademicRecords(@Request() req: any) {
    return this.studentsService.getCourseAcademicRecords(Number(req.user.id));
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const student = await this.studentsService.findOne(id);

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }
}
