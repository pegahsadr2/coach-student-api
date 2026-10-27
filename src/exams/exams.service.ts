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
import { UpdateExamDto } from './dto/update-exam.dto';
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

  async getReportCard(examId: number, userId: number, userRole: Role) {
    const exam = await this.examRepository.findOne({
      where: { id: examId },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (userRole === Role.STUDENT && exam.studentId !== userId) {
      // Do not disclose whether another student's exam exists.
      throw new NotFoundException('Exam not found');
    }

    if (userRole === Role.COACH && exam.coachId !== userId) {
      throw new ForbiddenException('You are not responsible for this exam');
    }

    if (![Role.STUDENT, Role.COACH, Role.HEAD_COACH].includes(userRole)) {
      throw new ForbiddenException('You are not allowed to view this report card');
    }

    if (exam.status !== 'COMPLETED') {
      throw new BadRequestException(
        'The report card is available after the exam has been completed',
      );
    }

    const detailsRows = await this.examRepository.manager.query(
      `SELECT
         e.id AS "examId",
         e.mode AS "mode",
         e.exam_type AS "examType",
         e.status AS "status",
         e.started_at AS "startedAt",
         e.finished_at AS "finishedAt",
         e.total_score AS "totalScore",
         st.id AS "studentId",
         st.student_code AS "studentCode",
         st.first_name AS "studentFirstName",
         st.last_name AS "studentLastName",
         se.id AS "sessionId",
         se.name AS "sessionName",
         se.session_date AS "sessionDate",
         se.session_time AS "sessionTime",
         c.id AS "courseId",
         c.name AS "courseName",
         co.id AS "coachId",
         co.personnel_code AS "coachPersonnelCode",
         co.first_name AS "coachFirstName",
         co.last_name AS "coachLastName",
         ea.id AS "examAreaId",
         ea.name AS "examAreaName",
         ea.score_weight AS "baseScore",
         ea.duration_minutes AS "durationMinutes",
         ear.passed AS "passed",
         ear.score AS "areaScore"
       FROM exams e
       INNER JOIN students st ON st.id = e.student_id
       LEFT JOIN sessions se ON se.id = e.session_id
       LEFT JOIN courses c ON c.id = se.course_id
       LEFT JOIN coaches co ON co.id = e.coach_id
       LEFT JOIN exam_areas ea ON ea.id = e.exam_area_id
       LEFT JOIN exam_area_results ear
         ON ear.exam_id = e.id AND ear.exam_area_id = e.exam_area_id
       WHERE e.id = $1`,
      [examId],
    );

    if (detailsRows.length === 0) {
      throw new NotFoundException('Report card details not found');
    }

    const activities = await this.examRepository.manager.query(
      `SELECT
         a.id AS "id",
         a.exam_area_id AS "examAreaId",
         ea.name AS "examAreaName",
         a.error_type_id AS "errorTypeId",
         a.activity_type AS "activityType",
         a.title AS "title",
         a.penalty AS "penalty",
         a.occurred_at AS "occurredAt"
       FROM exam_activities a
       LEFT JOIN exam_areas ea ON ea.id = a.exam_area_id
       WHERE a.exam_id = $1
       ORDER BY a.occurred_at ASC, a.id ASC`,
      [examId],
    );

    const details = detailsRows[0];
    const penaltySummary = await this.examRepository.manager.query(
      `SELECT
         COALESCE(SUM(penalty) FILTER (
           WHERE activity_type IN ('error', 'visual_error', 'failure')
         ), 0)::numeric AS "totalPenalty",
         COUNT(*) FILTER (
           WHERE activity_type IN ('error', 'visual_error', 'failure')
         )::int AS "errorCount"
       FROM exam_activities
       WHERE exam_id = $1`,
      [examId],
    );

    return {
      exam: details,
      scoring: {
        baseScore: details.baseScore,
        totalPenalty: penaltySummary[0].totalPenalty,
        errorCount: penaltySummary[0].errorCount,
        totalScore: details.totalScore,
        passed: details.passed,
        result: details.passed === true ? 'PASSED' : 'FAILED',
      },
      activities,
    };
  }

  async getExamActivities(examId: number, userId: number, userRole: Role) {
    const exam = await this.examRepository.findOne({
      where: { id: examId },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // A student can only view their own exam.
    if (userRole === Role.STUDENT && exam.studentId !== userId) {
      throw new NotFoundException('Exam not found');
    }

    // A coach can only view exams they are responsible for.
    if (userRole === Role.COACH && exam.coachId !== userId) {
      throw new ForbiddenException('You are not responsible for this exam');
    }

    return this.examActivityRepository.find({
      where: { examId: exam.id },
      order: {
        occurredAt: 'ASC',
        id: 'ASC',
      },
    });
  }

  async updatePendingExam(
    examId: number,
    dto: UpdateExamDto,
    userId: number,
    userRole: Role,
  ) {
    const hasChanges = Object.values(dto).some((value) => value !== undefined);
    if (!hasChanges) {
      throw new BadRequestException('At least one field must be provided');
    }

    if (userRole !== Role.COACH && userRole !== Role.HEAD_COACH) {
      throw new ForbiddenException('You are not allowed to update exams');
    }

    return this.examRepository.manager.transaction(async (manager) => {
      const examRepo = manager.getRepository(Exam);
      const sessionRepo = manager.getRepository(Session);
      const studentRepo = manager.getRepository(Student);

      // Locking serializes edits against the student's start request.
      const exam = await examRepo.findOne({
        where: { id: examId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!exam) {
        throw new NotFoundException('Exam not found');
      }

      if (userRole === Role.COACH && exam.coachId !== userId) {
        throw new ForbiddenException('You are not responsible for this exam');
      }

      if (exam.status !== 'PENDING') {
        throw new BadRequestException(
          `Only pending exams can be updated. Current status: ${exam.status}`,
        );
      }

      // Do not silently leave pre-exam error records attached to changed settings.
      const activityCounts: Array<{ count: number }> = await manager.query(
        'SELECT COUNT(*)::int AS count FROM exam_activities WHERE exam_id = $1',
        [exam.id],
      );
      if (Number(activityCounts[0]?.count ?? 0) > 0) {
        throw new BadRequestException(
          'This exam already has activities/errors. Cancel it and create a new exam instead of editing it.',
        );
      }

      const nextSessionId = dto.sessionId ?? exam.sessionId;
      const nextStudentId = dto.studentId ?? exam.studentId;
      const nextExamAreaId = dto.examAreaId ?? exam.examAreaId;

      if (nextExamAreaId === null) {
        throw new BadRequestException('An exam area must be assigned');
      }

      const session = await sessionRepo.findOne({
        where: { id: nextSessionId },
      });
      if (!session) {
        throw new NotFoundException('Session not found');
      }

      if (userRole === Role.COACH && session.coachId !== userId) {
        throw new ForbiddenException(
          'You can only assign this exam to one of your own sessions',
        );
      }

      const student = await studentRepo.findOne({
        where: { id: nextStudentId },
      });
      if (!student) {
        throw new NotFoundException('Student not found');
      }

      const enrollment = await manager.query(
        `SELECT 1
         FROM session_students
         WHERE session_id = $1 AND student_id = $2`,
        [nextSessionId, nextStudentId],
      );
      if (enrollment.length === 0) {
        throw new BadRequestException(
          'Student is not enrolled in the selected session',
        );
      }

      const areaRows = await manager.query(
        'SELECT id FROM exam_areas WHERE id = $1',
        [nextExamAreaId],
      );
      if (areaRows.length === 0) {
        throw new NotFoundException('Exam area not found');
      }

      exam.sessionId = session.id;
      exam.studentId = student.id;
      exam.coachId = session.coachId;
      exam.examAreaId = nextExamAreaId;
      exam.mode = dto.mode ?? exam.mode;
      exam.examType = dto.examType ?? exam.examType;

      return examRepo.save(exam);
    });
  }

  async cancelPendingExam(examId: number, userId: number, userRole: Role) {
    if (userRole !== Role.COACH && userRole !== Role.HEAD_COACH) {
      throw new ForbiddenException('You are not allowed to cancel exams');
    }

    return this.examRepository.manager.transaction(async (manager) => {
      const examRepo = manager.getRepository(Exam);
      const exam = await examRepo.findOne({
        where: { id: examId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!exam) {
        throw new NotFoundException('Exam not found');
      }

      if (userRole === Role.COACH && exam.coachId !== userId) {
        throw new ForbiddenException('You are not responsible for this exam');
      }

      if (exam.status !== 'PENDING') {
        throw new BadRequestException(
          `Only pending exams can be canceled. Current status: ${exam.status}`,
        );
      }

      exam.status = 'ABANDONED';
      await examRepo.save(exam);

      return {
        message: 'Exam canceled successfully',
        examId: exam.id,
        status: exam.status,
      };
    });
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
          COALESCE(
            SUM(penalty) FILTER (
              WHERE activity_type IN ('error', 'visual_error', 'failure')
            ),
            0
          )::numeric AS total_penalty,
          COUNT(*) FILTER (
            WHERE activity_type IN ('error', 'visual_error', 'failure')
          )::int AS error_count
        FROM exam_activities
        WHERE exam_id = $1
          AND exam_area_id = $2`,
        [exam.id, exam.examAreaId],
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
