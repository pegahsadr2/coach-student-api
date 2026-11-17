import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
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
    summary: 'List/search all courses',
    description: 'Head coach only. Includes assigned coaches. Date filters are optional; name search is case-insensitive and partial.',
  })
  @ApiQuery({ name: 'name', required: false, example: 'Autumn', description: 'Filter by a course-name fragment.' })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-10-01', description: 'Exact course start date (YYYY-MM-DD).' })
  @ApiQuery({ name: 'endDate', required: false, example: '2027-03-31', description: 'Exact course end date (YYYY-MM-DD).' })
  @ApiQuery({ name: 'startDateFrom', required: false, example: '2026-10-01', description: 'Minimum course start date (inclusive).' })
  @ApiQuery({ name: 'startDateTo', required: false, example: '2026-12-31', description: 'Maximum course start date (inclusive).' })
  @ApiQuery({ name: 'endDateFrom', required: false, example: '2027-01-01', description: 'Minimum course end date (inclusive).' })
  @ApiQuery({ name: 'endDateTo', required: false, example: '2027-03-31', description: 'Maximum course end date (inclusive).' })
  @Get()
  @Roles(Role.HEAD_COACH)
  findAll(
    @Query('name') name?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('startDateFrom') startDateFrom?: string,
    @Query('startDateTo') startDateTo?: string,
    @Query('endDateFrom') endDateFrom?: string,
    @Query('endDateTo') endDateTo?: string,
  ) {
    return this.coursesService.findAll({
      name,
      startDate,
      endDate,
      startDateFrom,
      startDateTo,
      endDateFrom,
      endDateTo,
    });
  }

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
    summary: 'List coaches already assigned to a course',
    description: 'Head coach only. Optional filters search by first name, last name, or personnel code.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'Existing course ID.' })
  @ApiQuery({ name: 'firstName', required: false, example: 'Sara' })
  @ApiQuery({ name: 'lastName', required: false, example: 'Ahmadi' })
  @ApiQuery({ name: 'personnelCode', required: false, example: 'COACH00' })
  @Get(':id/coaches')
  @Roles(Role.HEAD_COACH)
  listAssignedCoaches(
    @Param('id', ParseIntPipe) courseId: number,
    @Query('firstName') firstName?: string,
    @Query('lastName') lastName?: string,
    @Query('personnelCode') personnelCode?: string,
  ) {
    return this.coursesService.findAssignedCoaches(courseId, {
      firstName,
      lastName,
      personnelCode,
    });
  }

  @ApiOperation({
    summary: 'List coaches not yet assigned to a course',
    description: 'Head coach only. Optional filters search by first name, last name, or personnel code.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'Existing course ID.' })
  @ApiQuery({ name: 'firstName', required: false, example: 'Sara' })
  @ApiQuery({ name: 'lastName', required: false, example: 'Ahmadi' })
  @ApiQuery({ name: 'personnelCode', required: false, example: 'COACH00' })
  @Get(':id/coaches/available')
  @Roles(Role.HEAD_COACH)
  listAvailableCoaches(
    @Param('id', ParseIntPipe) courseId: number,
    @Query('firstName') firstName?: string,
    @Query('lastName') lastName?: string,
    @Query('personnelCode') personnelCode?: string,
  ) {
    return this.coursesService.findAvailableCoaches(courseId, {
      firstName,
      lastName,
      personnelCode,
    });
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

  @ApiOperation({ summary: 'Remove a coach from a course' })
  @ApiParam({ name: 'id', example: 1, description: 'Existing course ID.' })
  @ApiParam({ name: 'coachId', example: 2, description: 'Assigned coach ID.' })
  @Delete(':id/coaches/:coachId')
  @Roles(Role.HEAD_COACH)
  removeCoach(
    @Param('id', ParseIntPipe) courseId: number,
    @Param('coachId', ParseIntPipe) coachId: number,
  ) {
    return this.coursesService.removeCoach(courseId, coachId);
  }

  @ApiOperation({
    summary: 'Get my courses',
    description: 'Coaches receive courses assigned to them. Head coaches receive all courses. No request body is needed.',
  })
  @Get('my')
  @Roles(Role.COACH, Role.HEAD_COACH)
  getMyCourses(@Req() request: any) {
    return this.coursesService.getMyCourses(
      Number(request.user.id),
      request.user.role,
    );
  }
}
