
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { CreateCourseDto } from './dto/create-course.dto';
import { AssignCoachDto } from './dto/assign-coach.dto';
import { CoursesService } from './courses.service';

@Controller('courses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles(Role.HEAD_COACH)
  createCourse(@Body() dto: CreateCourseDto) {
    return this.coursesService.createCourse(dto);
  }

  @Post(':id/coaches')
  @Roles(Role.HEAD_COACH)
  assignCoach(
    @Param('id', ParseIntPipe) courseId: number,
    @Body() dto: AssignCoachDto,
  ) {
    return this.coursesService.assignCoach(courseId, dto.coachId);
  }

  @Get('my')
  @Roles(Role.COACH)
  getMyCourses(@Req() request: any) {
    return this.coursesService.getMyCourses(Number(request.user.id));
  }
}


