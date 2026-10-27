import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './entities/session.entity';
import { Course } from '../courses/entities/course.entity';
import { Coach } from '../users/entities/coach.entity';
import { Student } from '../students/entities/student.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { Role } from '../users/enums/role.enum';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Coach)
    private readonly coachRepository: Repository<Coach>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}

  async createSession(dto: CreateSessionDto, userId: number, userRole: Role) {
    const course = await this.courseRepository.findOne({
      where: { id: dto.courseId },
      relations: { coaches: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const coach = await this.coachRepository.findOne({ where: { id: userId } });
    if (!coach) {
      throw new NotFoundException('Coach account not found');
    }

    if (userRole === Role.COACH) {
      const assigned = course.coaches.some(
        (assignedCoach) => assignedCoach.id === coach.id,
      );
      if (!assigned) {
        throw new ForbiddenException('You are not assigned to this course');
      }
    } else if (userRole !== Role.HEAD_COACH) {
      throw new ForbiddenException('You are not allowed to create sessions');
    }

    this.assertDateWithinCourse(dto.sessionDate, course.startDate, course.endDate);

    const session = this.sessionRepository.create({
      courseId: course.id,
      coachId: coach.id,
      name: dto.name,
      sessionDate: dto.sessionDate.slice(0, 10),
      sessionTime: dto.sessionTime ?? null,
      description: dto.description ?? null,
    });

    return this.sessionRepository.save(session);
  }

  async getMySessions(userId: number, userRole: Role) {
    if (userRole === Role.COACH) {
      return this.sessionRepository.find({
        where: { coachId: userId },
        order: { sessionDate: 'ASC' },
      });
    }

    if (userRole === Role.HEAD_COACH) {
      return this.sessionRepository.find({ order: { sessionDate: 'ASC' } });
    }

    throw new ForbiddenException('You are not allowed to view sessions');
  }

  async updateSession(
    sessionId: number,
    dto: UpdateSessionDto,
    userId: number,
    userRole: Role,
  ) {
    const session = await this.findSessionOrFail(sessionId);
    this.assertCanManageSession(session, userId, userRole);

    const changes = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    ) as UpdateSessionDto;

    if (Object.keys(changes).length === 0) {
      throw new BadRequestException('Provide at least one field to update');
    }

    const course = await this.courseRepository.findOne({
      where: { id: session.courseId },
    });
    if (!course) {
      throw new NotFoundException('Course for this session was not found');
    }

    const effectiveDate = changes.sessionDate ?? session.sessionDate;
    this.assertDateWithinCourse(effectiveDate, course.startDate, course.endDate);

    if (changes.name !== undefined) session.name = changes.name;
    if (changes.sessionDate !== undefined) {
      session.sessionDate = changes.sessionDate.slice(0, 10);
    }
    if (changes.sessionTime !== undefined) session.sessionTime = changes.sessionTime;
    if (changes.description !== undefined) session.description = changes.description;

    return this.sessionRepository.save(session);
  }

  async deleteSession(sessionId: number, userId: number, userRole: Role) {
    const session = await this.findSessionOrFail(sessionId);
    this.assertCanManageSession(session, userId, userRole);

    try {
      await this.sessionRepository.remove(session);
    } catch (error) {
      const databaseError = error as {
        code?: string;
        driverError?: { code?: string; detail?: string };
      };
      const databaseCode = databaseError?.code ?? databaseError?.driverError?.code;
      if (databaseCode === '23503') {
        throw new ConflictException(
          'Cannot delete this session because related records prevent deletion. Check the database foreign-key cascade rules or remove dependent records first.',
        );
      }
      throw error;
    }

    return { message: 'Session deleted successfully', sessionId };
  }

  async addStudentToSession(
    sessionId: number,
    studentId: number,
    userId: number,
    userRole: Role,
  ) {
    const session = await this.findSessionOrFail(sessionId);
    this.assertCanManageSession(session, userId, userRole);

    const student = await this.studentRepository.findOne({
      where: { id: studentId },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const existingEnrollment = await this.sessionRepository.manager.query(
      `SELECT 1 FROM session_students WHERE session_id = $1 AND student_id = $2`,
      [sessionId, studentId],
    );
    if (existingEnrollment.length > 0) {
      throw new ConflictException('Student is already enrolled in this session');
    }

    await this.sessionRepository.manager.query(
      `INSERT INTO session_students (session_id, student_id)
       VALUES ($1, $2)
       ON CONFLICT (session_id, student_id) DO NOTHING`,
      [sessionId, studentId],
    );

    return {
      message: 'Student added to session successfully',
      sessionId,
      studentId,
    };
  }

  async getSessionStudents(sessionId: number, userId: number, userRole: Role) {
    const session = await this.findSessionOrFail(sessionId);
    this.assertCanManageSession(session, userId, userRole);

    return this.sessionRepository.manager.query(
      `SELECT
         s.id,
         s.student_code AS "studentCode",
         s.first_name AS "firstName",
         s.last_name AS "lastName",
         s.father_name AS "fatherName",
         s.description
       FROM students s
       INNER JOIN session_students ss ON ss.student_id = s.id
       WHERE ss.session_id = $1
       ORDER BY s.last_name ASC, s.first_name ASC`,
      [sessionId],
    );
  }

  async removeStudentFromSession(
    sessionId: number,
    studentId: number,
    userId: number,
    userRole: Role,
  ) {
    const session = await this.findSessionOrFail(sessionId);
    this.assertCanManageSession(session, userId, userRole);

    const deletedRows = await this.sessionRepository.manager.query(
      `DELETE FROM session_students
       WHERE session_id = $1 AND student_id = $2
       RETURNING student_id AS "studentId"`,
      [sessionId, studentId],
    );

    if (deletedRows.length === 0) {
      throw new NotFoundException('Student is not enrolled in this session');
    }

    return {
      message: 'Student removed from session successfully',
      sessionId,
      studentId,
    };
  }

  private async findSessionOrFail(sessionId: number): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  private assertCanManageSession(
    session: Session,
    userId: number,
    userRole: Role,
  ): void {
    if (userRole === Role.COACH) {
      if (session.coachId !== userId) {
        throw new ForbiddenException('You are not responsible for this session');
      }
      return;
    }

    if (userRole !== Role.HEAD_COACH) {
      throw new ForbiddenException('You are not allowed to manage this session');
    }
  }

  private assertDateWithinCourse(
    date: string,
    startDateValue: string | Date,
    endDateValue: string | Date,
  ): void {
    const sessionDate = String(date).slice(0, 10);
    const courseStartDate = String(startDateValue).slice(0, 10);
    const courseEndDate = String(endDateValue).slice(0, 10);

    if (
      sessionDate < courseStartDate ||
      sessionDate > courseEndDate ||
      courseEndDate < courseStartDate
    ) {
      throw new BadRequestException(
        `Session date must be between ${courseStartDate} and ${courseEndDate}`,
      );
    }
  }
}
