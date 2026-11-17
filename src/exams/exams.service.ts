import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  BadGatewayException,
  ServiceUnavailableException,
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
import { ConfigService } from '@nestjs/config';
import { IntegrationResultDto } from './dto/integration-result.dto';
import { SubmitIdentifiedErrorsDto } from './dto/submit-identified-errors.dto';


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
    private readonly configService: ConfigService,
  ) {}

  async getMyExams(studentId: number) {
    return this.queryMyExams(studentId);
  }

  async getMyPendingExams(studentId: number) {
    return this.queryMyExams(studentId, 'PENDING');
  }

  async getStudentErrorOptions(
    examId: number,
    studentId: number,
  ) {
    const exam = await this.examRepository.findOne({
      where: { id: examId, studentId },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (exam.status !== 'AWAITING_STUDENT_REVIEW') {
      throw new BadRequestException(
        'Error options are available after the exam log has been received',
      );
    }

    if (exam.examAreaId === null) {
      throw new BadRequestException('Exam area is missing');
    }

    const errors = await this.examRepository.manager.query(
      `SELECT
        id,
        name,
        kind
      FROM error_types
      WHERE exam_area_id = $1
      ORDER BY id ASC`,
      [exam.examAreaId],
    );

    return {
      examId: exam.id,
      examAreaId: exam.examAreaId,
      errors,
    };
  }

  private async queryMyExams(studentId: number, status?: Exam['status']) {
    const statusClause = status ? 'AND e.status = $2' : '';
    const parameters = status ? [studentId, status] : [studentId];

    return this.examRepository.manager.query(
      `SELECT
         e.id AS "id",
         e.session_id AS "sessionId",
         e.student_id AS "studentId",
         e.coach_id AS "coachId",
         e.exam_area_id AS "examAreaId",
         e.mode AS "mode",
         e.exam_type AS "examType",
         e.status AS "status",
         e.started_at AS "startedAt",
         e.finished_at AS "finishedAt",
         st.student_code AS "studentCode",
         st.first_name AS "studentFirstName",
         st.last_name AS "studentLastName",
         se.name AS "sessionName",
         se.session_date AS "sessionDate",
         se.session_time AS "sessionTime",
         c.id AS "courseId",
         c.name AS "courseName",
         co.personnel_code AS "coachPersonnelCode",
         co.first_name AS "coachFirstName",
         co.last_name AS "coachLastName",
         ea.name AS "examAreaName",
         e.duration_minutes AS "durationMinutes",
         CASE
            WHEN e.status <> 'COMPLETED' THEN e.base_score
            ELSE NULL
         END AS "baseScore"
       FROM exams e
       LEFT JOIN students st ON st.id = e.student_id
       LEFT JOIN sessions se ON se.id = e.session_id
       LEFT JOIN courses c ON c.id = se.course_id
       LEFT JOIN coaches co ON co.id = e.coach_id
       LEFT JOIN exam_areas ea ON ea.id = e.exam_area_id
       WHERE e.student_id = $1
       ${statusClause}
       ORDER BY e.id DESC`,
      parameters,
    );
  }

  async getMyExamById(examId: number, studentId: number) {
    const rows = await this.examRepository.manager.query(
      `SELECT
         e.id AS "id",
         e.session_id AS "sessionId",
         e.student_id AS "studentId",
         e.coach_id AS "coachId",
         e.exam_area_id AS "examAreaId",
         e.mode AS "mode",
         e.exam_type AS "examType",
         e.status AS "status",
         e.started_at AS "startedAt",
         e.finished_at AS "finishedAt",
         st.student_code AS "studentCode",
         st.first_name AS "studentFirstName",
         st.last_name AS "studentLastName",
         se.name AS "sessionName",
         se.session_date AS "sessionDate",
         se.session_time AS "sessionTime",
         c.id AS "courseId",
         c.name AS "courseName",
         co.personnel_code AS "coachPersonnelCode",
         co.first_name AS "coachFirstName",
         co.last_name AS "coachLastName",
         ea.name AS "examAreaName",
         e.duration_minutes AS "durationMinutes",
         CASE
           WHEN e.status <> 'COMPLETED' THEN e.base_score
           ELSE NULL
          END AS "baseScore"
       FROM exams e
       LEFT JOIN students st ON st.id = e.student_id
       LEFT JOIN sessions se ON se.id = e.session_id
       LEFT JOIN courses c ON c.id = se.course_id
       LEFT JOIN coaches co ON co.id = e.coach_id
       LEFT JOIN exam_areas ea ON ea.id = e.exam_area_id
       WHERE e.id = $1 AND e.student_id = $2`,
      [examId, studentId],
    );

    if (rows.length === 0) {
      throw new NotFoundException('Exam not found');
    }

    return rows[0];
  }


async searchReportExams(
  filters: {
    studentCode?: string;
    studentName?: string;
    courseId?: string;
    sessionId?: string;
    examAreaId?: string;
    examType?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    coachId?: string;
  },
  userId: number,
  userRole: Role,
) {
  if (userRole !== Role.COACH && userRole !== Role.HEAD_COACH) {
    throw new ForbiddenException(
      'You are not allowed to search report cards',
    );
  }

  const conditions: string[] = [];
  const parameters: (string | number)[] = [];

  const addCondition = (sql: string, value: string | number) => {
    parameters.push(value);
    conditions.push(sql.replace('?', `$${parameters.length}`));
  };

  // A coach can only see exams assigned to themselves.
  if (userRole === Role.COACH) {
    addCondition('e.coach_id = ?', userId);
  }

  // Student code filter
  if (filters.studentCode?.trim()) {
    addCondition(
      'st.student_code ILIKE ?',
      `%${filters.studentCode.trim()}%`,
    );
  }

  // Student full name filter
  if (filters.studentName?.trim()) {
    addCondition(
      `CONCAT(st.first_name, ' ', st.last_name) ILIKE ?`,
      `%${filters.studentName.trim()}%`,
    );
  }

  // Numeric filters
  const addIdFilter = (
    value: string | undefined,
    column: string,
    label: string,
  ) => {
    if (!value?.trim()) return;

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException(
        `${label} must be a positive integer`,
      );
    }

    addCondition(`${column} = ?`, parsed);
  };

  addIdFilter(filters.courseId, 'se.course_id', 'courseId');
  addIdFilter(filters.sessionId, 'e.session_id', 'sessionId');
  addIdFilter(filters.examAreaId, 'e.exam_area_id', 'examAreaId');
  addIdFilter(filters.coachId, 'e.coach_id', 'coachId');

  // Exam type filter
  if (filters.examType?.trim()) {
    if (!['real_hardware', 'interactive'].includes(filters.examType)) {
      throw new BadRequestException('Invalid examType');
    }

    addCondition('e.exam_type = ?', filters.examType);
  }

  // Status filter
  if (filters.status?.trim()) {
    const allowedStatuses = [
      'PENDING',
      'IN_PROGRESS',
      'COMPLETED',
      'ABANDONED',
    ];

    if (!allowedStatuses.includes(filters.status)) {
      throw new BadRequestException('Invalid exam status');
    }

    addCondition('e.status = ?', filters.status);
  }

  // Validate and apply date filters
  const parseDate = (value: string | undefined, label: string) => {
    if (!value?.trim()) return undefined;

    const date = value.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException(
        `${label} must use YYYY-MM-DD format`,
      );
    }

    const parsed = new Date(`${date}T00:00:00.000Z`);

    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== date
    ) {
      throw new BadRequestException(`${label} is not a valid date`);
    }

    return date;
  };

  const fromDate = parseDate(filters.fromDate, 'fromDate');
  const toDate = parseDate(filters.toDate, 'toDate');

  if (fromDate && toDate && fromDate > toDate) {
    throw new BadRequestException(
      'fromDate cannot be later than toDate',
    );
  }

  if (fromDate) {
    addCondition(
      'COALESCE(e.started_at::date, se.session_date) >= ?::date',
      fromDate,
    );
  }

  if (toDate) {
    addCondition(
      'COALESCE(e.started_at::date, se.session_date) <= ?::date',
      toDate,
    );
  }

  const whereClause = conditions.length
    ? conditions.join(' AND ')
    : 'TRUE';

  return this.examRepository.manager.query(
    `
      SELECT
        e.id AS "examId",
        e.session_id AS "sessionId",
        e.student_id AS "studentId",
        e.coach_id AS "coachId",
        e.exam_area_id AS "examAreaId",
        e.mode AS "mode",
        e.exam_type AS "examType",
        e.status AS "status",
        e.started_at AS "startedAt",
        e.finished_at AS "finishedAt",

        COALESCE(
          e.started_at::date,
          se.session_date
        ) AS "examDate",

        st.student_code AS "studentCode",
        st.first_name AS "studentFirstName",
        st.last_name AS "studentLastName",

        se.name AS "sessionName",
        se.session_date AS "sessionDate",
        se.session_time AS "sessionTime",

        c.id AS "courseId",
        c.name AS "courseName",

        co.personnel_code AS "coachPersonnelCode",
        co.first_name AS "coachFirstName",
        co.last_name AS "coachLastName",

        ea.name AS "examAreaName",
        e.duration_minutes AS "durationMinutes",
        CASE
          WHEN e.status <> 'COMPLETED' THEN e.base_score
          ELSE NULL
        END AS "baseScore"
        ear.score AS "areaScore",
        ear.passed AS "passed"

      FROM exams e

      INNER JOIN students st
        ON st.id = e.student_id

      LEFT JOIN sessions se
        ON se.id = e.session_id

      LEFT JOIN courses c
        ON c.id = se.course_id

      LEFT JOIN coaches co
        ON co.id = e.coach_id

      LEFT JOIN exam_areas ea
        ON ea.id = e.exam_area_id

      LEFT JOIN exam_area_results ear
        ON ear.exam_id = e.id
        AND ear.exam_area_id = e.exam_area_id

      WHERE ${whereClause}

      ORDER BY
        COALESCE(e.started_at, se.session_date::timestamp) DESC,
        e.id DESC
    `,
    parameters,
  );
}


  async getReportCard(examId: number, userId: number, userRole: Role) {
    const exam = await this.examRepository.findOne({
      where: { id: examId },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Only coaches and head coaches can access report cards.
    if (
      userRole !== Role.COACH &&
      userRole !== Role.HEAD_COACH
    ) {
      throw new ForbiddenException(
        'Students are not allowed to view report cards',
      );
    }

    // Coaches can only view their own students' exams.
    if (userRole === Role.COACH && exam.coachId !== userId) {
      throw new ForbiddenException(
        'You are not responsible for this exam',
      );
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
         e.base_score AS "baseScore",
         e.duration_minutes AS "durationMinutes",
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
         AND a.exam_area_id = $2
         ORDER BY a.occurred_at ASC, a.id ASC`,
      [examId, exam.examAreaId],
    );

    const errorIdentification =
    await this.examRepository.manager.query(
      `SELECT
        error_type_id AS "errorTypeId",
        error_name AS "errorName",
        error_kind AS "errorKind",
        actual_occurrences AS "actualOccurrences",
        selected_by_student AS "selectedByStudent",
        classification,
        penalty
      FROM exam_error_reviews
      WHERE exam_id = $1
        AND exam_area_id = $2
      ORDER BY error_type_id ASC`,
      [examId, exam.examAreaId],
    );

    const details = detailsRows[0];
    const penaltySummary = await this.examRepository.manager.query(
      `SELECT
        COALESCE(
          SUM(penalty) FILTER (
            WHERE activity_type IN ('error', 'visual_error')
          ),
          0
        )::numeric AS "totalPenalty",

        COUNT(*) FILTER (
          WHERE activity_type IN ('error', 'visual_error')
        )::int AS "errorCount",

        COUNT(*) FILTER (
          WHERE activity_type = 'failure'
        )::int AS "coachAppliedErrorCount"

      FROM exam_activities
      WHERE exam_id = $1
        AND exam_area_id = $2`,
      [examId, exam.examAreaId],
    );

    const activityPenalty = Number(
      penaltySummary[0].totalPenalty ?? 0,
    );

    const identificationPenaltyRows =
      await this.examRepository.manager.query(
        `SELECT COALESCE(SUM(penalty), 0)::numeric AS total
        FROM exam_error_reviews
        WHERE exam_id = $1
          AND exam_area_id = $2`,
        [examId, exam.examAreaId],
      );

    const identificationPenalty = Number(
      identificationPenaltyRows[0].total ?? 0,
    );



    return {
      exam: details,
      scoring: {
        baseScore: details.baseScore,

        // Penalty caused by actual activities during the exam
        activityPenalty: activityPenalty.toFixed(2),

        // Penalty caused by incorrect student error identification
        identificationPenalty: identificationPenalty.toFixed(2),

        // Total of both penalties
        totalPenalty: (
          activityPenalty + identificationPenalty
        ).toFixed(2),

        errorCount: penaltySummary[0].errorCount,
        totalScore: details.totalScore,
        passed: details.passed,
        result: details.passed === true ? 'PASSED' : 'FAILED',

        coachAppliedErrorCount:
          penaltySummary[0].coachAppliedErrorCount,
      },
      activities,
      errorIdentification,

    };
  }

  async getExamActivities(examId: number, userId: number, userRole: Role) {
    const exam = await this.examRepository.findOne({
      where: { id: examId },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (
      userRole !== Role.COACH &&
      userRole !== Role.HEAD_COACH
    ) {
      throw new ForbiddenException(
        'Students are not allowed to view exam activities',
      );
    }

    if (userRole === Role.COACH && exam.coachId !== userId) {
      throw new ForbiddenException(
        'You are not responsible for this exam',
      );
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

      const areaRows: Array<{
        id: number;
        score_weight: string;
        duration_minutes: number | null;
      }> = await manager.query(
        `SELECT id, score_weight, duration_minutes
         FROM exam_areas
         WHERE id = $1`,
        [nextExamAreaId],
      );
      
      if (areaRows.length === 0) {
        throw new NotFoundException('Exam area not found');
      }
      
      const selectedArea = areaRows[0];
      
      if (
        selectedArea.duration_minutes === null ||
        selectedArea.duration_minutes <= 0
      ) {
        throw new BadRequestException(
          'The selected exam area must have a valid duration',
        );
      }
      
      const examAreaChanged = exam.examAreaId !== nextExamAreaId;
      exam.sessionId = session.id;
      exam.studentId = student.id;
      exam.coachId = session.coachId;
      exam.examAreaId = nextExamAreaId;
      
      // Update the snapshot only when the exam area changes
      // or when an old exam has no snapshot yet.
      if (
        examAreaChanged ||
        exam.baseScore === null ||
        exam.durationMinutes === null
      ) {
        exam.baseScore = String(selectedArea.score_weight);
        exam.durationMinutes = selectedArea.duration_minutes;
      }
      
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
      await this.examRepository.manager.transaction(async (manager) => {
        const examRepo = manager.getRepository(Exam);

        const exam = await examRepo.findOne({
          where: { id: examId, studentId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!exam) {
          throw new NotFoundException('Exam not found');
        }

        if (exam.status !== 'PENDING') {
          throw new BadRequestException(
            `Exam cannot be started. Current status: ${exam.status}`,
          );
        }

        const baseScore = Number(exam.baseScore);

        if (
          exam.examAreaId === null ||
          exam.baseScore === null ||
          exam.durationMinutes === null ||
          !Number.isFinite(baseScore) ||
          baseScore < 0 ||
          exam.durationMinutes <= 0
        ) {
          throw new BadRequestException(
            'Exam area, score, or duration configuration is invalid',
          );
        }

        const studentRows = await manager.query(
          `SELECT
            id,
            student_code AS "studentCode",
            first_name AS "firstName",
            last_name AS "lastName"
          FROM students
          WHERE id = $1`,
          [exam.studentId],
        );

        const areaRows = await manager.query(
          `SELECT id, name
          FROM exam_areas
          WHERE id = $1`,
          [exam.examAreaId],
        );

        if (!studentRows.length || !areaRows.length) {
          throw new BadRequestException(
            'Student or exam area information is missing',
          );
        }

        const allowedErrors = await manager.query(
          `SELECT id, name, kind
          FROM error_types
          WHERE exam_area_id = $1
            AND kind IN ('procedure', 'visual')
          ORDER BY id ASC`,
          [exam.examAreaId],
        );

        // These are the errors already recorded by the coach.
        // They are sent once to the external backend and must not
        // be returned again as new student activities.
        const preExamErrors = await manager.query(
          `SELECT
            a.id AS "activityId",
            a.error_type_id AS "errorTypeId",
            a.activity_type AS "activityType",
            a.title,
            a.occurred_at AS "occurredAt",
            et.kind AS "kind"
          FROM exam_activities a
          LEFT JOIN error_types et ON et.id = a.error_type_id
          WHERE a.exam_id = $1
            AND a.activity_type IN ('failure', 'visual_error')
          ORDER BY a.id ASC`,
          [exam.id],
        );

        const startedAt = new Date();

        exam.status = 'IN_PROGRESS';
        exam.startedAt = startedAt;

        await examRepo.save(exam);

        const payload = {
          protocolVersion: '1.0',
          examId: exam.id,

          student: studentRows[0],

          exam: {
            sessionId: exam.sessionId,
            examAreaId: exam.examAreaId,
            examAreaName: areaRows[0].name,
            mode: exam.mode,
            examType: exam.examType,
            baseScore,
            durationMinutes: exam.durationMinutes,
            startedAt: startedAt.toISOString(),
          },

          allowedErrors,

          preExamErrors: preExamErrors.map((activity: any) => ({
            activityId: activity.activityId,
            errorTypeId: activity.errorTypeId,
            activityType: activity.activityType,
            kind: activity.kind,
            title: activity.title,
            occurredAt: activity.occurredAt,
          })),
        };

        // The external request is made inside the transaction.
        // If the external backend rejects it, the local status change rolls back.
        await this.sendExamToSecondBackend(exam.id, payload);
      });

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

  async receiveIntegrationResult(
      examId: number,
      dto: IntegrationResultDto,
    ) {
      return this.examRepository.manager.transaction(async (manager) => {
        const examRepo = manager.getRepository(Exam);
        const activityRepo = manager.getRepository(ExamActivity);

        const exam = await examRepo.findOne({
          where: { id: examId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!exam) {
          throw new NotFoundException('Exam not found');
        }

        // A repeated callback must not insert activities again.
        if (
          exam.status === 'AWAITING_STUDENT_REVIEW' ||
          exam.status === 'COMPLETED'
        ) {
          return {
            message: 'Exam result was already received',
            duplicate: true,
            examId: exam.id,
            status: exam.status,
          };
        }

        if (exam.status !== 'IN_PROGRESS') {
          throw new BadRequestException(
            'Integration result can only be received for an in-progress exam',
          );
        }

        if (exam.examAreaId === null) {
          throw new BadRequestException('Exam area is missing');
        }

        const startedAt = new Date(dto.startedAt);
        const finishedAt = new Date(dto.finishedAt);

        if (
          !Number.isFinite(startedAt.getTime()) ||
          !Number.isFinite(finishedAt.getTime()) ||
          finishedAt <= startedAt
        ) {
          throw new BadRequestException('Invalid exam timestamps');
        }

        const sequences = dto.activities.map((item) => item.sequence);

        if (new Set(sequences).size !== sequences.length) {
          throw new BadRequestException(
            'Activity sequence numbers must be unique',
          );
        }

        const orderedActivities = [...dto.activities].sort(
          (a, b) => a.sequence - b.sequence,
        );

        const errorIds = [
          ...new Set(
            orderedActivities
              .filter((item) => item.activityType !== 'correct')
              .map((item) => item.errorTypeId)
              .filter((id): id is number => id !== undefined),
          ),
        ];

        const errorRows: Array<{
          id: number;
          name: string;
          kind: string;
          penalty: string;
        }> = errorIds.length
          ? await manager.query(
              `SELECT id, name, kind, penalty
              FROM error_types
              WHERE id = ANY($1::int[])
                AND exam_area_id = $2`,
              [errorIds, exam.examAreaId],
            )
          : [];

        const errorMap = new Map(
          errorRows.map((item) => [item.id, item]),
        );

        const activities: ExamActivity[] = [];

        for (const item of orderedActivities) {
          const occurredAt = new Date(item.occurredAt);

          if (!Number.isFinite(occurredAt.getTime())) {
            throw new BadRequestException(
              'An activity has an invalid occurredAt timestamp',
            );
          }

          if (item.activityType === 'correct') {
            if (item.errorTypeId !== undefined) {
              throw new BadRequestException(
                'Correct activities must not include errorTypeId',
              );
            }

            activities.push(
              activityRepo.create({
                examId: exam.id,
                examAreaId: exam.examAreaId,
                errorTypeId: null,
                activityType: 'correct',
                title: 'Correct step',
                penalty: '0',
                occurredAt,
              }),
            );

            continue;
          }

          if (item.errorTypeId === undefined) {
            throw new BadRequestException(
              'errorTypeId is required for error activities',
            );
          }

          const errorType = errorMap.get(item.errorTypeId);

          if (!errorType) {
            throw new BadRequestException(
              `Error type ${item.errorTypeId} does not belong to this exam area`,
            );
          }

          const expectedKind =
            item.activityType === 'error' ? 'procedure' : 'visual';

          if (errorType.kind !== expectedKind) {
            throw new BadRequestException(
              `Error type ${item.errorTypeId} is invalid for ${item.activityType}`,
            );
          }

          activities.push(
            activityRepo.create({
              examId: exam.id,
              examAreaId: exam.examAreaId,
              errorTypeId: errorType.id,
              activityType: item.activityType,
              title: errorType.name,
              penalty: errorType.penalty,
              occurredAt,
            }),
          );
        }

        // Coach's pre-exam activities already exist in the database.
        // Only activities received from the external backend are inserted here.
        if (activities.length > 0) {
          await activityRepo.save(activities);
        }

        exam.startedAt = startedAt;
        exam.finishedAt = finishedAt;
        exam.status = 'AWAITING_STUDENT_REVIEW';

        await examRepo.save(exam);

        return {
          message: 'Exam log received. Waiting for student error identification.',
          duplicate: false,
          examId: exam.id,
          status: exam.status,
          activityCount: activities.length,
        };
      });
    }


  async submitIdentifiedErrors(
    examId: number,
    studentId: number,
    dto: SubmitIdentifiedErrorsDto,
  ) {
    return this.examRepository.manager.transaction(async (manager) => {
      const examRepo = manager.getRepository(Exam);
      const resultRepo = manager.getRepository(ExamAreaResult);

      const exam = await examRepo.findOne({
        where: { id: examId, studentId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!exam) {
        throw new NotFoundException('Exam not found');
      }

      // Do not process an already completed exam again.
      if (exam.status === 'COMPLETED') {
        return {
          message: 'This exam has already been completed',
          duplicate: true,
          examId: exam.id,
          totalScore: exam.totalScore,
        };
      }

      if (exam.status !== 'AWAITING_STUDENT_REVIEW') {
        throw new BadRequestException(
          'The exam is not waiting for student error identification',
        );
      }

      if (
        exam.examAreaId === null ||
        exam.baseScore === null
      ) {
        throw new BadRequestException(
          'Exam area or base score is missing',
        );
      }

      const baseScore = Number(exam.baseScore);

      if (!Number.isFinite(baseScore) || baseScore < 0) {
        throw new BadRequestException('Invalid exam base score');
      }

      const examAreaId = exam.examAreaId;

      // Load every error option belonging to this exam area.
      const errorTypes: Array<{
        id: number;
        name: string;
        kind: string;
        penalty: string;
      }> = await manager.query(
        `SELECT id, name, kind, penalty
        FROM error_types
        WHERE exam_area_id = $1
        ORDER BY id ASC`,
        [examAreaId],
      );

      const errorMap = new Map(
        errorTypes.map((item) => [item.id, item]),
      );

      const selectedIds = new Set(dto.errorTypeIds);

      // The student cannot submit an error from another exam area.
      for (const id of selectedIds) {
        if (!errorMap.has(id)) {
          throw new BadRequestException(
            `Error type ${id} does not belong to this exam area`,
          );
        }
      }

      // Actual errors include:
      // 1. Errors already applied by the coach before the exam.
      // 2. Errors returned in the external exam log.
      const actualRows: Array<{
        error_type_id: number;
        actual_count: number;
      }> = await manager.query(
        `SELECT
          error_type_id,
          COUNT(*)::int AS actual_count
        FROM exam_activities
        WHERE exam_id = $1
          AND exam_area_id = $2
          AND error_type_id IS NOT NULL
          AND activity_type IN ('error', 'visual_error', 'failure')
        GROUP BY error_type_id`,
        [exam.id, examAreaId],
      );

      const actualCountMap = new Map(
        actualRows.map((item) => [
          Number(item.error_type_id),
          Number(item.actual_count),
        ]),
      );

      let identificationPenalty = 0;

      const comparisonResults: Array<{
        errorTypeId: number;
        errorName: string;
        actualOccurrences: number;
        selectedByStudent: boolean;
        classification: string;
        penalty: string;
      }> = [];

      for (const errorType of errorTypes) {
        const actualOccurrences =
          actualCountMap.get(errorType.id) ?? 0;

        const actuallyOccurred = actualOccurrences > 0;
        const selectedByStudent = selectedIds.has(errorType.id);

        let classification: string;

        if (actuallyOccurred && selectedByStudent) {
          classification = 'CORRECTLY_IDENTIFIED';
        } else if (actuallyOccurred && !selectedByStudent) {
          classification = 'MISSED';
        } else if (!actuallyOccurred && selectedByStudent) {
          classification = 'FALSE_POSITIVE';
        } else {
          classification = 'CORRECTLY_REJECTED';
        }

        const isWrong =
          classification === 'MISSED' ||
          classification === 'FALSE_POSITIVE';

        const errorPenalty = isWrong
          ? Number(errorType.penalty)
          : 0;

        if (!Number.isFinite(errorPenalty) || errorPenalty < 0) {
          throw new BadRequestException(
            `Invalid penalty for error type ${errorType.id}`,
          );
        }

        identificationPenalty += errorPenalty;

        comparisonResults.push({
          errorTypeId: errorType.id,
          errorName: errorType.name,
          actualOccurrences,
          selectedByStudent,
          classification,
          penalty: errorPenalty.toFixed(2),
        });

        // Save a snapshot of the comparison for the report card.
        await manager.query(
          `INSERT INTO exam_error_reviews (
            exam_id,
            exam_area_id,
            error_type_id,
            error_name,
            error_kind,
            actual_occurrences,
            selected_by_student,
            classification,
            penalty
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            exam.id,
            examAreaId,
            errorType.id,
            errorType.name,
            errorType.kind,
            actualOccurrences,
            selectedByStudent,
            classification,
            errorPenalty.toFixed(2),
          ],
        );
      }

      // Preserve the existing activity scoring rule.
      const stats: Array<{
        activity_penalty: string;
        error_count: string;
        coach_applied_error_count: string;
      }> = await manager.query(
        `SELECT
          COALESCE(
            SUM(penalty) FILTER (
              WHERE activity_type IN ('error', 'visual_error')
            ),
            0
          )::numeric AS activity_penalty,

          COUNT(*) FILTER (
            WHERE activity_type IN ('error', 'visual_error')
          )::int AS error_count,

          COUNT(*) FILTER (
            WHERE activity_type = 'failure'
          )::int AS coach_applied_error_count

        FROM exam_activities
        WHERE exam_id = $1
          AND exam_area_id = $2`,
        [exam.id, examAreaId],
      );

      const activityPenalty = Number(stats[0].activity_penalty);
      const errorCount = Number(stats[0].error_count);
      const coachAppliedErrorCount = Number(
        stats[0].coach_applied_error_count,
      );

      const totalPenalty =
        activityPenalty + identificationPenalty;

      const finalScore = Math.max(
        0,
        baseScore - totalPenalty,
      );

      // Keep the existing pass/fail rule unchanged.
      const passed = errorCount === 0;

      exam.status = 'COMPLETED';
      exam.totalScore = finalScore.toFixed(2);

      await examRepo.save(exam);

      let areaResult = await resultRepo.findOne({
        where: {
          examId: exam.id,
          examAreaId,
        },
      });

      if (!areaResult) {
        areaResult = resultRepo.create({
          examId: exam.id,
          examAreaId,
          passed,
          score: finalScore.toFixed(2),
        });
      } else {
        areaResult.passed = passed;
        areaResult.score = finalScore.toFixed(2);
      }

      await resultRepo.save(areaResult);

      return {
        message: 'Student error identification completed and report card created',
        duplicate: false,
        examId: exam.id,
        status: exam.status,
        baseScore,
        activityPenalty,
        identificationPenalty,
        totalPenalty,
        totalScore: finalScore.toFixed(2),
        errorCount,
        coachAppliedErrorCount,
        passed,
        result: passed ? 'PASSED' : 'FAILED',
        errorIdentification: comparisonResults,
      };
    });
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

      if (
        exam.baseScore === null ||
        exam.durationMinutes === null
      ) {
        throw new BadRequestException(
          'Exam score and duration snapshot are missing. Cancel this exam and create a new one.',
        );
      }
      
      const baseScore = Number(exam.baseScore);
      
      if (!Number.isFinite(baseScore) || baseScore < 0) {
        throw new BadRequestException(
          'The stored exam base score is invalid',
        );
      }

      const stats: Array<{
        total_penalty: string;
        error_count: string;
        coach_applied_error_count: string;
      }> = await manager.query(
        `SELECT
          COALESCE(
            SUM(penalty) FILTER (
              WHERE activity_type IN ('error', 'visual_error')
            ),
            0
          )::numeric AS total_penalty,

          COUNT(*) FILTER (
            WHERE activity_type IN ('error', 'visual_error')
          )::int AS error_count,

          COUNT(*) FILTER (
            WHERE activity_type = 'failure'
          )::int AS coach_applied_error_count

        FROM exam_activities
        WHERE exam_id = $1
          AND exam_area_id = $2`,
        [exam.id, exam.examAreaId],
      );

      const totalPenalty = Number(stats[0].total_penalty);
      const errorCount = Number(stats[0].error_count);
      const coachAppliedErrorCount = Number(
        stats[0].coach_applied_error_count,
      );

      const finalScore = Math.max(0, baseScore - totalPenalty);

      // Keep the existing passing rule for now:
      // an exam passes only when no student/visual errors were recorded.
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
        coachAppliedErrorCount,
      };
    });
  }

  private async sendExamToSecondBackend(
    examId: number,
    payload: Record<string, any>,
  ): Promise<void> {
    const baseUrl = this.configService
      .get<string>('SECOND_BACKEND_URL')
      ?.trim();

    const path = this.configService.get<string>(
      'SECOND_BACKEND_START_PATH',
      '/api/exams/start',
    );

    const apiKey = this.configService.get<string>(
      'SECOND_BACKEND_API_KEY',
    );

    if (!baseUrl || !apiKey) {
      throw new ServiceUnavailableException(
        'External exam backend is not configured',
      );
    }

    const url = `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

    let response: Response;

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-integration-key': apiKey,
          'Idempotency-Key': `exam-start-${examId}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new BadGatewayException(
        'Could not communicate with the external exam backend',
      );
    }

    if (!response.ok) {
      throw new BadGatewayException(
        `External exam backend rejected the request. HTTP ${response.status}`,
      );
    }
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

    const areaRows: Array<{
      id: number;
      score_weight: string;
      duration_minutes: number | null;
    }> = await this.examRepository.manager.query(
      `SELECT id, score_weight, duration_minutes
       FROM exam_areas
       WHERE id = $1`,
      [dto.examAreaId],
    );
    
    if (areaRows.length === 0) {
      throw new NotFoundException('Exam area not found');
    }
    
    const selectedArea = areaRows[0];
    
    if (
      selectedArea.duration_minutes === null ||
      selectedArea.duration_minutes <= 0
    ) {
      throw new BadRequestException(
        'The selected exam area must have a valid duration',
      );
    }

    const exam = this.examRepository.create({
      sessionId: session.id,
      studentId: student.id,
      coachId: session.coachId,
      examAreaId: selectedArea.id,
      baseScore: String(selectedArea.score_weight),
      durationMinutes: selectedArea.duration_minutes,
      mode: dto.mode,
      examType: dto.examType,
    });

    return this.examRepository.save(exam);
  }
}
