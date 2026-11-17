import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  NotFoundException,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import * as bcrypt from 'bcrypt';
import { ResetPasswordDto } from '../users/dto/reset-password.dto';

@ApiTags('Students')
@ApiBearerAuth('access-token')
@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.COACH, Role.HEAD_COACH)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @ApiOperation({ summary: 'Create a student', description: 'Coach or head coach only. The creator sets the student initial password; students do not self-register.' })
@ApiBody({
  type: CreateStudentDto,
  examples: {
    studentExample: {
      summary: 'Create a student',
      value: {
        studentCode: 'ST_TEST_001',
        password: 'StudentPass@2026',
        firstName: 'Ali',
        lastName: 'Ahmadi',
        fatherName: 'Reza',
        idCardNumber: '1234567890',
        birthDate: '2010-05-12',
        description: 'Student created by a coach',
      },
    },
  },
})
  @Post()
  create(@Body() dto: CreateStudentDto, @Request() req: any) {
    return this.studentsService.create(dto, Number(req.user.id));
  }

  @ApiOperation({ summary: 'List students', description: 'Returns students available to the current permissions. No request body is needed.' })
  @Get()
  findAll() {
    return this.studentsService.findAll();
  }

  @ApiOperation({ summary: 'Get academic records for my course', description: 'Coach-only. Returns records for the authenticated coach courses. No request body is needed.' })
  @Get('course-academic-records')
  @Roles(Role.COACH, Role.HEAD_COACH)
  getCourseAcademicRecords(@Request() req: any) {
    return this.studentsService.getCourseAcademicRecords(
      Number(req.user.id),
      req.user.role,
    );
  }

  @ApiOperation({
    summary: 'Find student by exact student code (legacy endpoint)',
    description:
      'Returns one student matching the exact student code, or null when not found. For multi-field, partial search use GET /students/search/filters. No request body is needed.',
  })
  @ApiQuery({ name: 'studentCode', required: true, example: 'ST003', description: 'Exact student code.' })
  @Get('search')
  findByStudentCode(@Query('studentCode') studentCode: string) {
    return this.studentsService.findByStudentCode(studentCode);
  }

  @ApiOperation({
    summary: 'Search students by multiple fields',
    description:
      'Coach or head coach only. Search by any combination of student code, first name, last name, and ID-card number. Each supplied filter is a case-insensitive partial match; all supplied filters are combined with AND. At least one filter is required. No request body is needed.',
  })
  @ApiQuery({ name: 'studentCode', required: false, example: 'ST003', description: 'Partial student code.' })
  @ApiQuery({ name: 'firstName', required: false, example: 'Ali', description: 'Partial first name.' })
  @ApiQuery({ name: 'lastName', required: false, example: 'Ahmadi', description: 'Partial last name.' })
  @ApiQuery({ name: 'idCardNumber', required: false, example: '123456', description: 'Partial ID-card number.' })
  @ApiResponse({ status: 200, description: 'Matching students, without password hashes.' })
  @ApiResponse({ status: 400, description: 'At least one search field is required.' })
  @Get('search/filters')
  searchStudents(
    @Query('studentCode') studentCode?: string,
    @Query('firstName') firstName?: string,
    @Query('lastName') lastName?: string,
    @Query('idCardNumber') idCardNumber?: string,
  ) {
    return this.studentsService.searchStudents({
      studentCode,
      firstName,
      lastName,
      idCardNumber,
    });
  }

  @ApiOperation({
    summary: 'Get student activity records',
    description:
      'Coach can only view activity records of students whose exams are assigned to them. Head coach can view all students.',
  })
  @ApiParam({
    name: 'id',
    example: 1,
    description: 'Student ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Student activity records retrieved successfully.',
  })
  @ApiResponse({
    status: 403,
    description: 'You are not responsible for this student.',
  })
  @Get(':id/activity-records')
  @Roles(Role.COACH, Role.HEAD_COACH)
  getStudentActivityRecords(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.studentsService.getStudentActivityRecords(
      id,
      Number(req.user.id),
      req.user.role,
    );
  }

  @ApiOperation({ summary: 'Get student by ID', description: 'Use an existing student ID. No request body is needed.' })
  @ApiParam({ name: 'id', example: 1, description: 'Existing student ID.' })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const student = await this.studentsService.findOne(id);

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  @ApiOperation({
    summary: 'Update a student',
    description: 'Coach or head coach only. Send only the fields you want to change. Password changes use PATCH /auth/change-password.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'Existing student ID.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        studentCode: { type: 'string', example: 'ST003' },
        firstName: { type: 'string', example: 'Ali' },
        lastName: { type: 'string', example: 'Ahmadi' },
        fatherName: { type: 'string', example: 'Reza' },
        idCardNumber: { type: 'string', example: '1234567890' },
        birthDate: { type: 'string', format: 'date', example: '2010-05-12' },
        description: { type: 'string', example: 'Updated student profile.' },
      },
      example: {
        firstName: 'Ali',
        lastName: 'Ahmadi',
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Student updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input or empty update body.' })
  @ApiResponse({ status: 404, description: 'Student not found.' })
  @ApiResponse({ status: 409, description: 'Student code is already in use.' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentsService.update(id, dto);
  }

  @ApiOperation({
    summary: 'Reset a student password',
    description: 'Head coach only. Sets a new password for an existing student.',
  })
  @ApiParam({
    name: 'id',
    example: 1,
    description: 'Existing student ID.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @Patch(':id/reset-password')
  @Roles(Role.HEAD_COACH)
  async resetStudentPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetPasswordDto,
  ) {
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.studentsService.updatePasswordHash(id, passwordHash);

    return {
      message: 'Student password reset successfully',
      studentId: id,
    };
  }


  @ApiOperation({
    summary: 'Delete a student',
    description: 'Coach or head coach only. Permanently deletes the student. Use a test student first because related registrations and exams may be affected by database cascade rules.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'ID of the student to delete.' })
  @ApiResponse({ status: 200, description: 'Student deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Student not found.' })
  @ApiResponse({ status: 409, description: 'Student cannot be deleted because related records prevent deletion.' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.remove(id);
  }
}
