import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../sessions/entities/session.entity';
import { Role } from '../users/enums/role.enum';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  private get manager() {
    return this.sessionRepository.manager;
  }

  async getSummary(userId: number, role: Role) {
    if (role === Role.HEAD_COACH) {
      const [summary] = await this.manager.query(
        `
        SELECT
          (SELECT COUNT(*)::int FROM coaches WHERE role = $1) AS "headCoachCount",
          (SELECT COUNT(*)::int FROM coaches WHERE role = $2) AS "coachCount",
          (SELECT COUNT(*)::int FROM students) AS "studentCount",
          (SELECT COUNT(*)::int FROM courses) AS "courseCount",
          (SELECT COUNT(*)::int FROM sessions) AS "sessionCount",
          (SELECT COUNT(*)::int FROM sessions WHERE session_date = CURRENT_DATE) AS "todaySessionCount",
          (SELECT COUNT(*)::int FROM exams) AS "examCount"
        `,
        [Role.HEAD_COACH, Role.COACH],
      );

      return { role, ...summary };
    }

    if (role === Role.COACH) {
      const [summary] = await this.manager.query(
        `
        SELECT
          (SELECT COUNT(*)::int FROM course_coaches WHERE coach_id = $1) AS "assignedCourseCount",
          (SELECT COUNT(*)::int FROM sessions WHERE coach_id = $1) AS "sessionCount",
          (SELECT COUNT(DISTINCT ss.student_id)::int
             FROM sessions se
             INNER JOIN session_students ss ON ss.session_id = se.id
            WHERE se.coach_id = $1) AS "studentCount",
          (SELECT COUNT(*)::int FROM sessions WHERE coach_id = $1 AND session_date = CURRENT_DATE) AS "todaySessionCount",
          (SELECT COUNT(*)::int FROM exams WHERE coach_id = $1) AS "examCount"
        `,
        [userId],
      );

      return { role, ...summary };
    }

    throw new ForbiddenException('Only coaches and head coaches can view this dashboard');
  }

  async getTodaySessions(userId: number, role: Role) {
    const coachFilter = role === Role.COACH ? 'AND se.coach_id = $1' : '';
    const parameters = role === Role.COACH ? [userId] : [];

    if (role !== Role.COACH && role !== Role.HEAD_COACH) {
      throw new ForbiddenException('Only coaches and head coaches can view today\'s sessions');
    }

    return this.manager.query(
      `
      SELECT
        se.id AS "sessionId",
        se.name AS "sessionName",
        se.session_date AS "sessionDate",
        se.session_time AS "sessionTime",
        se.description AS "description",
        c.id AS "courseId",
        c.name AS "courseName",
        co.id AS "coachId",
        co.first_name AS "coachFirstName",
        co.last_name AS "coachLastName",
        COUNT(DISTINCT st.id)::int AS "studentCount",
        COALESCE(
          jsonb_agg(DISTINCT jsonb_build_object(
            'id', st.id,
            'studentCode', st.student_code,
            'firstName', st.first_name,
            'lastName', st.last_name
          )) FILTER (WHERE st.id IS NOT NULL),
          '[]'::jsonb
        ) AS students
      FROM sessions se
      INNER JOIN courses c ON c.id = se.course_id
      INNER JOIN coaches co ON co.id = se.coach_id
      LEFT JOIN session_students ss ON ss.session_id = se.id
      LEFT JOIN students st ON st.id = ss.student_id
      WHERE se.session_date = CURRENT_DATE
      ${coachFilter}
      GROUP BY se.id, c.id, co.id
      ORDER BY se.session_time ASC NULLS LAST, se.id ASC
      `,
      parameters,
    );
  }

  async getCourseStats(userId: number, role: Role) {
    if (role !== Role.HEAD_COACH && role !== Role.COACH) {
      throw new ForbiddenException('Only coaches and head coaches can view course statistics');
    }

    const coachFilter =
      role === Role.COACH
        ? 'WHERE EXISTS (SELECT 1 FROM course_coaches assigned WHERE assigned.course_id = c.id AND assigned.coach_id = $1)'
        : '';
    const parameters = role === Role.COACH ? [userId] : [];

    return this.manager.query(
      `
      SELECT
        c.id AS "courseId",
        c.name AS "courseName",
        c.start_date AS "startDate",
        c.end_date AS "endDate",
        (SELECT COUNT(*)::int FROM course_coaches cc WHERE cc.course_id = c.id) AS "coachCount",
        (SELECT COUNT(*)::int FROM sessions se WHERE se.course_id = c.id) AS "sessionCount",
        (SELECT COUNT(DISTINCT ss.student_id)::int
           FROM sessions se
           INNER JOIN session_students ss ON ss.session_id = se.id
          WHERE se.course_id = c.id) AS "studentCount",
        (SELECT COUNT(*)::int
           FROM exams e
           INNER JOIN sessions se ON se.id = e.session_id
          WHERE se.course_id = c.id) AS "examCount"
      FROM courses c
      ${coachFilter}
      ORDER BY c.start_date DESC, c.id DESC
      `,
      parameters,
    );
  }

  async getCoachStats() {
    return this.manager.query(
      `
      SELECT
        co.id AS "coachId",
        co.first_name AS "firstName",
        co.last_name AS "lastName",
        co.personnel_code AS "personnelCode",
        (SELECT COUNT(*)::int FROM course_coaches cc WHERE cc.coach_id = co.id) AS "assignedCourseCount",
        (SELECT COUNT(*)::int FROM sessions se WHERE se.coach_id = co.id) AS "sessionCount",
        (SELECT COUNT(DISTINCT ss.student_id)::int
           FROM sessions se
           INNER JOIN session_students ss ON ss.session_id = se.id
          WHERE se.coach_id = co.id) AS "studentCount",
        (SELECT COUNT(*)::int FROM exams e WHERE e.coach_id = co.id) AS "examCount"
      FROM coaches co
      WHERE co.role = $1
      ORDER BY co.last_name ASC, co.first_name ASC, co.id ASC
      `,
      [Role.COACH],
    );
  }
}
