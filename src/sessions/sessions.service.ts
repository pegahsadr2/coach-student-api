import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Session } from './entities/session.entity';
import { Course } from '../courses/entities/course.entity';
import { Coach } from '../users/entities/coach.entity';
import { Student } from '../students/entities/student.entity';

import { CreateSessionDto } from './dto/create-session.dto';
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

  // Create a session for a course
  async createSession(dto: CreateSessionDto, userId: number, userRole: Role) {
    const course = await this.courseRepository.findOne({
      where: { id: dto.courseId },
      relations: { coaches: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const coach = await this.coachRepository.findOne({
      where: { id: userId },
    });

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

    const session = this.sessionRepository.create({
      courseId: course.id,
      coachId: coach.id,
      name: dto.name,
      sessionDate: dto.sessionDate,
      sessionTime: dto.sessionTime ?? null,
      description: dto.description ?? null,
    });

    return this.sessionRepository.save(session);
  }

  // Get sessions visible to the current coach or head coach
  async getMySessions(userId: number, userRole: Role) {
    if (userRole === Role.COACH) {
      return this.sessionRepository.find({
        where: { coachId: userId },
        order: { sessionDate: 'ASC' },
      });
    }

    if (userRole === Role.HEAD_COACH) {
      return this.sessionRepository.find({
        order: { sessionDate: 'ASC' },
      });
    }

    throw new ForbiddenException('You are not allowed to view sessions');
  }

  // Add a student to a session
  async addStudentToSession(
    sessionId: number,
    studentId: number,
    userId: number,
    userRole: Role,
  ) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const student = await this.studentRepository.findOne({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (userRole === Role.COACH) {
      if (session.coachId !== userId) {
        throw new ForbiddenException(
          'You are not responsible for this session',
        );
      }
    } else if (userRole !== Role.HEAD_COACH) {
      throw new ForbiddenException(
        'You are not allowed to add students to sessions',
      );
    }

    const existingEnrollment = await this.sessionRepository.manager.query(
      `SELECT 1
         FROM session_students
         WHERE session_id = $1 AND student_id = $2`,
      [sessionId, studentId],
    );

    if (existingEnrollment.length > 0) {
      throw new ConflictException(
        'Student is already enrolled in this session',
      );
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
    // Get students enrolled in a session
  async getSessionStudents(
    sessionId: number,
    userId: number,
    userRole: Role,
  ) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (userRole === Role.COACH) {
      if (session.coachId !== userId) {
        throw new ForbiddenException(
          'You are not responsible for this session',
        );
      }
    } else if (userRole !== Role.HEAD_COACH) {
      throw new ForbiddenException(
        'You are not allowed to view students in this session',
      );
    }

    return this.sessionRepository.manager.query(
      `SELECT
         s.id,
         s.student_code AS "studentCode",
         s.first_name AS "firstName",
         s.last_name AS "lastName",
         s.father_name AS "fatherName",
         s.description
       FROM students s
       INNER JOIN session_students ss
         ON ss.student_id = s.id
       WHERE ss.session_id = $1
       ORDER BY s.last_name ASC, s.first_name ASC`,
      [sessionId],
    );
  }
}
