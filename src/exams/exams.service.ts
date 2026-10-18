import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Exam } from './entities/exam.entity';
import { Session } from '../sessions/entities/session.entity';
import { Student } from '../students/entities/student.entity';
import { Role } from '../users/enums/role.enum';
import { CreateExamDto } from './dto/create-exam.dto';

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,

    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,

    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}

  async createExam(dto: CreateExamDto, userId: number, userRole: Role) {
    const session = await this.sessionRepository.findOne({
      where: { id: dto.sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const student = await this.studentRepository.findOne({
      where: { id: dto.studentId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (userRole === Role.COACH && session.coachId !== userId) {
      throw new ForbiddenException('You are not responsible for this session');
    }

    if (userRole !== Role.COACH && userRole !== Role.HEAD_COACH) {
      throw new ForbiddenException('You are not allowed to create exams');
    }

    const enrollment = await this.examRepository.manager.query(
      `SELECT 1
       FROM session_students
       WHERE session_id = $1 AND student_id = $2`,
      [dto.sessionId, dto.studentId],
    );

    if (enrollment.length === 0) {
      throw new BadRequestException('Student is not enrolled in this session');
    }

    const areaRows = await this.examRepository.manager.query(
      'SELECT id FROM exam_areas WHERE id = $1',
      [dto.examAreaId],
    );

    if (areaRows.length === 0) {
      throw new NotFoundException('Exam area not found');
    }

    const exam = this.examRepository.create({
      sessionId: session.id,
      studentId: student.id,
      coachId: session.coachId,
      examAreaId: dto.examAreaId,
      mode: dto.mode,
      examType: dto.examType,
    });

    return this.examRepository.save(exam);
  }
}
