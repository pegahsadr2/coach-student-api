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
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { AssignCoachDto } from './dto/assign-coach.dto';
import { CoursesService } from './courses.service';

@ApiTags('Courses')
@ApiBearerAuth('access-token')
@Controller('courses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @ApiOperation({
    summary: 'Create a course/term',
    description: 'Head coach only. endDate must be on or after startDate.',
  })
  @ApiBody({ type: CreateCourseDto })
  @Post()
  @Roles(Role.HEAD_COACH)
  createCourse(@Body() dto: CreateCourseDto) {
    return this.coursesService.createCourse(dto);
  }

  @ApiOperation({
    summary: 'Update a course/term',
    description:
      'Head coach only. Send only the fields that need to change. The new date range must contain all existing sessions.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'Existing course ID.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Autumn 2026 Updated' },
        startDate: { type: 'string', format: 'date', example: '2026-11-01' },
        endDate: { type: 'string', format: 'date', example: '2027-03-31' },
      },
      example: {
        name: 'Autumn 2026 Updated',
        startDate: '2026-11-01',
        endDate: '2027-03-31',
      },
    },
  })
  @Patch(':id')
  @Roles(Role.HEAD_COACH)
  updateCourse(
    @Param('id', ParseIntPipe) courseId: number,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.coursesService.updateCourse(courseId, dto);
  }

  @ApiOperation({
    summary: 'Delete a course/term',
    description:
      'Head coach only. Depending on the database foreign-key constraints, deleting a course also deletes its sessions and related exams. Student records are not deleted.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'Existing course ID.' })
  @Delete(':id')
  @Roles(Role.HEAD_COACH)
  deleteCourse(@Param('id', ParseIntPipe) courseId: number) {
    return this.coursesService.deleteCourse(courseId);
  }

  @ApiOperation({
    summary: 'Assign a coach to a course',
    description: 'Use the course ID in the path and an existing coach ID in the body.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'Existing course ID.' })
  @ApiBody({ type: AssignCoachDto })
  @Post(':id/coaches')
  @Roles(Role.HEAD_COACH)
  assignCoach(
    @Param('id', ParseIntPipe) courseId: number,
    @Body() dto: AssignCoachDto,
  ) {
    return this.coursesService.assignCoach(courseId, dto.coachId);
  }

  @ApiOperation({
    summary: 'Get my courses',
    description: 'Returns courses assigned to the authenticated coach. No request body is needed.',
  })
  @Get('my')
  @Roles(Role.COACH)
  getMyCourses(@Req() request: any) {
    return this.coursesService.getMyCourses(Number(request.user.id));
  }
}
