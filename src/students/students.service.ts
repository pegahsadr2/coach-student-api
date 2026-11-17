import { Injectable, ConflictException, NotFoundException, BadRequestException,  ForbiddenException,} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Student } from './entities/student.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { Role } from '../users/enums/role.enum';

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

  async searchStudents(filters: {
    studentCode?: string;
    firstName?: string;
    lastName?: string;
    idCardNumber?: string;
  }): Promise<Partial<Student>[]> {
    const normalizedFilters = {
      studentCode: filters.studentCode?.trim(),
      firstName: filters.firstName?.trim(),
      lastName: filters.lastName?.trim(),
      idCardNumber: filters.idCardNumber?.trim(),
    };

    const activeFilters = Object.entries(normalizedFilters).filter(
      ([, value]) => Boolean(value),
    );
    if (activeFilters.length === 0) {
      throw new BadRequestException(
        'Provide at least one search field: studentCode, firstName, lastName, or idCardNumber',
      );
    }

    const query = this.studentsRepository
      .createQueryBuilder('student')
      .select([
        'student.id',
        'student.studentCode',
        'student.firstName',
        'student.lastName',
        'student.fatherName',
        'student.idCardNumber',
        'student.birthDate',
        'student.description',
      ]);

    if (normalizedFilters.studentCode) {
      query.andWhere('student.studentCode ILIKE :studentCode', {
        studentCode: `%${normalizedFilters.studentCode}%`,
      });
    }
    if (normalizedFilters.firstName) {
      query.andWhere('student.firstName ILIKE :firstName', {
        firstName: `%${normalizedFilters.firstName}%`,
      });
    }
    if (normalizedFilters.lastName) {
      query.andWhere('student.lastName ILIKE :lastName', {
        lastName: `%${normalizedFilters.lastName}%`,
      });
    }
    if (normalizedFilters.idCardNumber) {
      query.andWhere('student.idCardNumber ILIKE :idCardNumber', {
        idCardNumber: `%${normalizedFilters.idCardNumber}%`,
      });
    }

    return query
      .orderBy('student.lastName', 'ASC')
      .addOrderBy('student.firstName', 'ASC')
      .addOrderBy('student.id', 'ASC')
      .getMany();
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

    async getStudentActivityRecords(
    studentId: number,
    coachId: number,
    role: Role,
  ) {
    if (role !== Role.COACH && role !== Role.HEAD_COACH) {
      throw new ForbiddenException(
        'Only coaches and head coaches can view student activity records',
      );
    }

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

    // Coaches can only access students who have exams assigned to them.
    if (role === Role.COACH) {
      const accessRows = await this.studentsRepository.manager.query(
        `SELECT 1
        FROM exams
        WHERE student_id = $1
          AND coach_id = $2
        LIMIT 1`,
        [studentId, coachId],
      );

      if (accessRows.length === 0) {
        throw new ForbiddenException(
          'You are not responsible for this student',
        );
      }
    }

    const coachFilter =
      role === Role.COACH ? 'AND e.coach_id = $2' : '';

    const parameters =
      role === Role.COACH ? [studentId, coachId] : [studentId];

    const activities = await this.studentsRepository.manager.query(
      `SELECT
        a.id AS "activityId",
        a.activity_type AS "activityType",
        a.title AS "title",
        a.penalty AS "penalty",
        a.occurred_at AS "occurredAt",

        a.exam_area_id AS "examAreaId",
        ea.name AS "examAreaName",

        e.id AS "examId",
        e.mode AS "examMode",
        e.exam_type AS "examType",
        e.status AS "examStatus",
        e.started_at AS "examStartedAt",
        e.finished_at AS "examFinishedAt",

        se.id AS "sessionId",
        se.name AS "sessionName",

        c.id AS "courseId",
        c.name AS "courseName"

      FROM exam_activities a
      INNER JOIN exams e ON e.id = a.exam_id
      LEFT JOIN exam_areas ea ON ea.id = a.exam_area_id
      LEFT JOIN sessions se ON se.id = e.session_id
      LEFT JOIN courses c ON c.id = se.course_id

      WHERE e.student_id = $1
        ${coachFilter}

      ORDER BY a.occurred_at DESC NULLS LAST, a.id DESC`,
      parameters,
    );

    return {
      student: {
        id: student.id,
        studentCode: student.studentCode,
        firstName: student.firstName,
        lastName: student.lastName,
      },
      totalActivities: activities.length,
      activities,
    };
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

    const results = await this.studentsRepository.manager.query(
      `SELECT
         e.id AS "examId",
         e.mode AS "mode",
         e.exam_type AS "examType",
         e.status AS "status",
         e.started_at AS "startedAt",
         e.finished_at AS "finishedAt",
         e.total_score AS "totalScore",
         se.id AS "sessionId",
         se.name AS "sessionName",
         se.session_date AS "sessionDate",
         c.id AS "courseId",
         c.name AS "courseName",
         co.id AS "coachId",
         co.personnel_code AS "coachPersonnelCode",
         co.first_name AS "coachFirstName",
         co.last_name AS "coachLastName",
         ea.id AS "examAreaId",
         ea.name AS "examArea",
         COALESCE(ear.score, e.total_score) AS "score",
         CASE
           WHEN ear.passed IS NOT NULL THEN ear.passed
           ELSE NOT EXISTS (
             SELECT 1
             FROM exam_activities a
             WHERE a.exam_id = e.id
               AND a.activity_type IN ('error', 'visual_error', 'failure')
           )
         END AS "passed",
         (ear.id IS NOT NULL) AS "hasStoredAreaResult"
       FROM exams e
       LEFT JOIN sessions se ON se.id = e.session_id
       LEFT JOIN courses c ON c.id = se.course_id
       LEFT JOIN coaches co ON co.id = e.coach_id
       LEFT JOIN exam_areas ea ON ea.id = e.exam_area_id
       LEFT JOIN exam_area_results ear
         ON ear.exam_id = e.id AND ear.exam_area_id = e.exam_area_id
       WHERE e.student_id = $1
         AND e.status = 'COMPLETED'
       ORDER BY e.finished_at DESC NULLS LAST, e.id DESC`,
      [studentId],
    );

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

  async getCourseAcademicRecords(coachId: number, role: Role) {
    const query = this.studentsRepository.manager
      .createQueryBuilder()
      .select('s.id', 'studentId')
      .addSelect('s.student_code', 'studentCode')
      .addSelect('s.first_name', 'firstName')
      .addSelect('s.last_name', 'lastName')
      .addSelect('c.id', 'courseId')
      .addSelect('c.name', 'courseName')
      .addSelect('se.id', 'sessionId')
      .addSelect('se.name', 'sessionName')
      .addSelect('co.id', 'coachId')
      .addSelect('co.personnel_code', 'coachPersonnelCode')
      .addSelect('co.first_name', 'coachFirstName')
      .addSelect('co.last_name', 'coachLastName')
      .addSelect('e.id', 'examId')
      .addSelect('ea.id', 'examAreaId')
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
      .innerJoin('coaches', 'co', 'co.id = e.coach_id')
      .where('e.status = :status', { status: 'COMPLETED' })
      .orderBy('c.id', 'ASC')
      .addOrderBy('s.last_name', 'ASC')
      .addOrderBy('e.finished_at', 'DESC', 'NULLS LAST');

    if (role === Role.COACH) {
      query.andWhere('e.coach_id = :coachId', { coachId });
    }

    return query.getRawMany();
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
