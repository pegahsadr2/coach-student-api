import { Injectable, ConflictException, NotFoundException, BadRequestException,} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Student } from './entities/student.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
  ) {}

  async findByStudentCode(studentCode: string): Promise<Student | null> {
    return this.studentsRepository.findOne({
      where: { studentCode },
    });
  }

  async create(dto: CreateStudentDto, coachId: number): Promise<Student> {
    const existingStudent = await this.studentsRepository.findOne({
      where: { studentCode: dto.studentCode },
    });

    if (existingStudent) {
      throw new ConflictException(
        'A student with this student code already exists',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const student = this.studentsRepository.create({
      studentCode: dto.studentCode,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      fatherName: dto.fatherName,
      idCardNumber: dto.idCardNumber,
      birthDate: dto.birthDate,
      description: dto.description,
      createdBy: coachId,
    });

    return this.studentsRepository.save(student);
  }
  async findByStudentCodeForLogin(
    studentCode: string,
  ): Promise<Student | null> {
    return this.studentsRepository
      .createQueryBuilder('student')
      .addSelect('student.passwordHash')
      .where('student.studentCode = :studentCode', { studentCode })
      .getOne();
  }
  async findAll(): Promise<Student[]> {
    return this.studentsRepository.find({
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Student | null> {
    return this.studentsRepository.findOne({
      where: { id },
    });
  }

  async update(id: number, dto: UpdateStudentDto): Promise<Student> {
    const student = await this.findOne(id);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const changes = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    ) as UpdateStudentDto;

    if (Object.keys(changes).length === 0) {
      throw new BadRequestException('Provide at least one field to update');
    }

    if (changes.studentCode && changes.studentCode !== student.studentCode) {
      const existingStudent = await this.studentsRepository.findOne({
        where: { studentCode: changes.studentCode },
      });

      if (existingStudent && existingStudent.id !== id) {
        throw new ConflictException(
          'A student with this student code already exists',
        );
      }
    }

    Object.assign(student, changes);
    return this.studentsRepository.save(student);
  }

  async remove(id: number): Promise<{ message: string; id: number }> {
    const student = await this.findOne(id);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    try {
      await this.studentsRepository.remove(student);
    } catch (error) {
      const databaseError = error as {
        code?: string;
        driverError?: { code?: string };
      };
      const databaseCode = databaseError?.code ?? databaseError?.driverError?.code;
      if (databaseCode === '23503') {
        throw new ConflictException(
          'Cannot delete this student because related records prevent deletion.',
        );
      }
      throw error;
    }

    return { message: 'Student deleted successfully', id };
  }

  async getAcademicRecord(studentId: number) {
    const student = await this.studentsRepository.findOne({
      where: { id: studentId },
      select: {
        id: true,
        studentCode: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const results = await this.studentsRepository.manager
      .createQueryBuilder()
      .select('e.id', 'examId')
      .addSelect('ea.name', 'examArea')
      .addSelect('ear.score', 'score')
      .addSelect('ear.passed', 'passed')
      .addSelect('e.status', 'status')
      .addSelect('e.finished_at', 'finishedAt')
      .from('exam_area_results', 'ear')
      .innerJoin('exams', 'e', 'e.id = ear.exam_id')
      .innerJoin('exam_areas', 'ea', 'ea.id = ear.exam_area_id')
      .where('e.student_id = :studentId', { studentId })
      .andWhere('e.status = :status', { status: 'COMPLETED' })
      .orderBy('e.finished_at', 'DESC', 'NULLS LAST')
      .addOrderBy('e.id', 'DESC')
      .getRawMany();

    return {
      student: {
        id: student.id,
        studentCode: student.studentCode,
        firstName: student.firstName,
        lastName: student.lastName,
      },
      results,
    };
  }

  async getCourseAcademicRecords(coachId: number) {
    return this.studentsRepository.manager
      .createQueryBuilder()
      .select('s.id', 'studentId')
      .addSelect('s.student_code', 'studentCode')
      .addSelect('s.first_name', 'firstName')
      .addSelect('s.last_name', 'lastName')
      .addSelect('c.id', 'courseId')
      .addSelect('c.name', 'courseName')
      .addSelect('e.id', 'examId')
      .addSelect('ea.name', 'examArea')
      .addSelect('ear.score', 'score')
      .addSelect('ear.passed', 'passed')
      .addSelect('e.status', 'status')
      .addSelect('e.finished_at', 'finishedAt')
      .from('exam_area_results', 'ear')
      .innerJoin('exams', 'e', 'e.id = ear.exam_id')
      .innerJoin('students', 's', 's.id = e.student_id')
      .innerJoin('exam_areas', 'ea', 'ea.id = ear.exam_area_id')
      .innerJoin('sessions', 'se', 'se.id = e.session_id')
      .innerJoin('courses', 'c', 'c.id = se.course_id')
      .innerJoin('course_coaches', 'cc', 'cc.course_id = c.id')
      .where('cc.coach_id = :coachId', { coachId })
      .andWhere('e.status = :status', { status: 'COMPLETED' })
      .orderBy('c.id', 'ASC')
      .addOrderBy('s.last_name', 'ASC')
      .addOrderBy('e.finished_at', 'DESC', 'NULLS LAST')
      .getRawMany();
  }

  async findByIdForPasswordChange(id: number) {
    return this.studentsRepository
      .createQueryBuilder('student')
      .addSelect('student.passwordHash')
      .where('student.id = :id', { id })
      .getOne();
  }

  async updatePasswordHash(id: number, passwordHash: string): Promise<void> {
    const result = await this.studentsRepository.update(
      { id },
      { passwordHash },
    );

    if (!result.affected) {
      throw new NotFoundException('Student not found');
    }
  }
}
