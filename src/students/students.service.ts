import { Injectable, ConflictException, NotFoundException,} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Student } from './entities/student.entity';
import { CreateStudentDto } from './dto/create-student.dto';

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
}
