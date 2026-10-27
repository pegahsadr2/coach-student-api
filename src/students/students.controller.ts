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

@ApiTags('Students')
@ApiBearerAuth('access-token')
@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.COACH, Role.HEAD_COACH)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @ApiOperation({ summary: 'Create a student', description: 'Coach or head coach only. The creator sets the student initial password; students do not self-register.' })
  @ApiBody({ type: CreateStudentDto })
  @Post()
  create(@Body() dto: CreateStudentDto, @Request() req: any) {
    return this.studentsService.create(dto, Number(req.user.id));
  }

  @ApiOperation({ summary: 'List students', description: 'Returns students available to the current permissions. No request body is needed.' })
  @Get()
  findAll() {
    return this.studentsService.findAll();
  }

  @ApiOperation({ summary: 'Get my academic record', description: 'Student-only. Returns the academic record of the authenticated student. No request body is needed.' })
  @Get('me/academic-record')
  @Roles(Role.STUDENT)
  getMyAcademicRecord(@Request() req: any) {
    return this.studentsService.getAcademicRecord(Number(req.user.id));
  }

  @ApiOperation({ summary: 'Get academic records for my course', description: 'Coach-only. Returns records for the authenticated coach courses. No request body is needed.' })
  @Get('course-academic-records')
  @Roles(Role.COACH)
  getCourseAcademicRecords(@Request() req: any) {
    return this.studentsService.getCourseAcademicRecords(Number(req.user.id));
  }

  @ApiOperation({ summary: 'Find student by code', description: 'Provide the student code as a query parameter. No request body is needed.' })
  @ApiQuery({ name: 'studentCode', required: true, example: 'ST003', description: 'Exact student code to search for.' })
  @Get('search')
  findByStudentCode(@Query('studentCode') studentCode: string) {
    return this.studentsService.findByStudentCode(studentCode);
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
