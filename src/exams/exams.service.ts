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
import { ExamActivity } from './entities/exam-activity.entity';
import { CreateExamActivityDto } from './dto/create-exam-activity.dto';
import { ExamAreaResult } from './entities/exam-area-result.entity';
import { ApplyExamErrorDto } from './dto/apply-exam-error.dto';

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,

    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,

    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,

    @InjectRepository(ExamActivity)
    private readonly examActivityRepository: Repository<ExamActivity>,
  ) {}

  async getMyExams(studentId: number) {
    return this.examRepository.find({
      where: { studentId },
      order: { id: 'DESC' },
    });
  }

  async getMyExamById(examId: number, studentId: number) {
    const exam = await this.examRepository.findOne({
      where: {
        id: examId,
        studentId,
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    return exam;
  }

  async startExam(examId: number, studentId: number) {
    // Start only an exam owned by this student and still PENDING.
    const result = await this.examRepository
      .createQueryBuilder()
      .update(Exam)
      .set({
        status: 'IN_PROGRESS',
        startedAt: () => 'CURRENT_TIMESTAMP',
      })
      .where('id = :examId', { examId })
      .andWhere('student_id = :studentId', { studentId })
      .andWhere('status = :status', { status: 'PENDING' })
      .execute();

    if (result.affected === 0) {
      const exam = await this.examRepository.findOne({
        where: {
          id: examId,
          studentId,
        },
      });

      if (!exam) {
        throw new NotFoundException('Exam not found');
      }

      throw new BadRequestException(
        `Exam cannot be started. Current status: ${exam.status}`,
      );
    }

    return this.getMyExamById(examId, studentId);
  }

  async createActivity(
    examId: number,
    studentId: number,
    dto: CreateExamActivityDto,
  ) {
    const exam = await this.examRepository.findOne({
      where: { id: examId, studentId },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (exam.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'Activities can only be recorded while the exam is in progress',
      );
    }

    let errorType: {
      id: number;
      name: string;
      kind: string;
      exam_area_id: number | null;
      penalty: string;
    } | null = null;

    if (dto.activityType === 'correct') {
      if (dto.errorTypeId !== undefined) {
        throw new BadRequestException(
          'A correct activity must not include errorTypeId',
        );
      }
    } else {
      if (dto.errorTypeId === undefined) {
        throw new BadRequestException(
          'errorTypeId is required for an error activity',
        );
      }

      if (exam.examAreaId === null) {
        throw new BadRequestException('This exam has no assigned exam area');
      }

      const rows = await this.examRepository.manager.query(
        `SELECT id, name, kind, exam_area_id, penalty
         FROM error_types
         WHERE id = $1
           AND exam_area_id = $2
           AND kind = 'procedure'`,
        [dto.errorTypeId, exam.examAreaId],
      );

      if (rows.length === 0) {
        throw new BadRequestException(
          'Students can only report predefined procedure errors',
        );
      }

      errorType = rows[0];
    }

    const activity = this.examActivityRepository.create({
      examId: exam.id,
      examAreaId: exam.examAreaId,
      errorTypeId: errorType?.id ?? null,
      activityType: dto.activityType,
      title: errorType?.name ?? 'Correct step',
      penalty: errorType?.penalty ?? '0',
    });

    return this.examActivityRepository.save(activity);
  }

  async applyError(
    examId: number,
    dto: ApplyExamErrorDto,
    userId: number,
    userRole: Role,
  ) {
    const exam = await this.examRepository.findOne({
      where: { id: examId },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (userRole === Role.COACH && exam.coachId !== userId) {
      throw new ForbiddenException('You are not responsible for this exam');
    }

    if (userRole !== Role.COACH && userRole !== Role.HEAD_COACH) {
      throw new ForbiddenException('You are not allowed to apply exam errors');
    }

    if (exam.status !== 'PENDING') {
      throw new BadRequestException(
        'Pre-exam errors can only be applied before the exam starts',
      );
    }

    if (exam.examAreaId === null) {
      throw new BadRequestException('This exam has no assigned exam area');
    }

    const rows: Array<{
      id: number;
      name: string;
      kind: 'coach_applied' | 'visual';
      penalty: string;
    }> = await this.examRepository.manager.query(
      `SELECT id, name, kind, penalty
       FROM error_types
       WHERE id = $1
         AND exam_area_id = $2
         AND kind IN ('coach_applied', 'visual')`,
      [dto.errorTypeId, exam.examAreaId],
    );

    if (rows.length === 0) {
      throw new BadRequestException(
        'Only predefined coach_applied or visual errors can be applied before the exam',
      );
    }

    const errorType = rows[0];

    const activity = this.examActivityRepository.create({
      examId: exam.id,
      examAreaId: exam.examAreaId,
      errorTypeId: errorType.id,
      activityType: errorType.kind === 'visual' ? 'visual_error' : 'failure',
      title: errorType.name,
      penalty: errorType.penalty,
    });

    return this.examActivityRepository.save(activity);
  }

  async createVisualError(
    examId: number,
    dto: ApplyExamErrorDto,
    userId: number,
    userRole: Role,
  ) {
    const exam = await this.examRepository.findOne({
      where: { id: examId },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (userRole === Role.COACH && exam.coachId !== userId) {
      throw new ForbiddenException('You are not responsible for this exam');
    }

    if (userRole !== Role.COACH && userRole !== Role.HEAD_COACH) {
      throw new ForbiddenException(
        'You are not allowed to record visual errors',
      );
    }

    if (exam.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'Visual errors during the exam can only be recorded while the exam is in progress',
      );
    }

    if (exam.examAreaId === null) {
      throw new BadRequestException('This exam has no assigned exam area');
    }

    const rows: Array<{
      id: number;
      name: string;
      penalty: string;
    }> = await this.examRepository.manager.query(
      `SELECT id, name, penalty
       FROM error_types
       WHERE id = $1
         AND exam_area_id = $2
         AND kind = 'visual'`,
      [dto.errorTypeId, exam.examAreaId],
    );

    if (rows.length === 0) {
      throw new BadRequestException(
        'Only predefined visual errors can be recorded during the exam',
      );
    }

    const errorType = rows[0];

    const activity = this.examActivityRepository.create({
      examId: exam.id,
      examAreaId: exam.examAreaId,
      errorTypeId: errorType.id,
      activityType: 'visual_error',
      title: errorType.name,
      penalty: errorType.penalty,
    });

    return this.examActivityRepository.save(activity);
  }


  async finishExam(examId: number, studentId: number) {
    return this.examRepository.manager.transaction(async (manager) => {
      const examRepo = manager.getRepository(Exam);
      const activityRepo = manager.getRepository(ExamActivity);
      const resultRepo = manager.getRepository(ExamAreaResult);

      // Lock the exam row while calculating and saving the result.
      const exam = await examRepo.findOne({
        where: { id: examId, studentId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!exam) {
        throw new NotFoundException('Exam not found');
      }

      if (exam.status !== 'IN_PROGRESS') {
        throw new BadRequestException(
          `Exam cannot be finished. Current status: ${exam.status}`,
        );
      }

      if (exam.examAreaId === null) {
        throw new BadRequestException('This exam has no assigned exam area');
      }

      const areas: Array<{ score_weight: string }> = await manager.query(
        `SELECT score_weight
          FROM exam_areas
          WHERE id = $1`,
        [exam.examAreaId],
      );

      if (areas.length === 0) {
        throw new NotFoundException('Exam area not found');
      }

      const stats: Array<{
        total_penalty: string;
        error_count: string;
      }> = await manager.query(
        `SELECT
     COALESCE(SUM(penalty), 0)::numeric AS total_penalty,
     COUNT(*) FILTER (
       WHERE activity_type IN ('error', 'visual_error', 'failure')
     )::int AS error_count
   FROM exam_activities
   WHERE exam_id = $1`,
        [exam.id],
      );

      const baseScore = Number(areas[0].score_weight);
      const totalPenalty = Number(stats[0].total_penalty);
      const errorCount = Number(stats[0].error_count);

      const finalScore = Math.max(0, baseScore - totalPenalty);
      const passed = errorCount === 0;

      exam.status = 'COMPLETED';
      exam.finishedAt = new Date();
      exam.totalScore = finalScore.toFixed(2);

      await examRepo.save(exam);

      let areaResult = await resultRepo.findOne({
        where: {
          examId: exam.id,
          examAreaId: exam.examAreaId,
        },
      });

      if (!areaResult) {
        areaResult = resultRepo.create({
          examId: exam.id,
          examAreaId: exam.examAreaId,
          passed,
          score: finalScore.toFixed(2),
        });
      } else {
        areaResult.passed = passed;
        areaResult.score = finalScore.toFixed(2);
      }

      await resultRepo.save(areaResult);

      return {
        examId: exam.id,
        status: exam.status,
        startedAt: exam.startedAt,
        finishedAt: exam.finishedAt,
        baseScore,
        totalPenalty,
        errorCount,
        totalScore: finalScore.toFixed(2),
        passed,
        result: passed ? 'PASSED' : 'FAILED',
      };
    });
  }

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
