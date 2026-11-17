import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Course } from './entities/course.entity';
import { Coach } from '../users/entities/coach.entity';
import { Session } from '../sessions/entities/session.entity';
import { Role } from '../users/enums/role.enum';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,

    @InjectRepository(Coach)
    private readonly coachRepository: Repository<Coach>,

    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  findAll(filters: {
    name?: string;
    startDate?: string;
    endDate?: string;
    startDateFrom?: string;
    startDateTo?: string;
    endDateFrom?: string;
    endDateTo?: string;
  } = {}) {
    const query = this.courseRepository
      .createQueryBuilder('course')
      .leftJoin('course.coaches', 'coach')
      .addSelect([
        'coach.id',
        'coach.firstName',
        'coach.lastName',
        'coach.personnelCode',
        'coach.role',
        'coach.createdAt',
      ]);

    if (filters.name?.trim()) {
      query.andWhere('LOWER(course.name) LIKE LOWER(:name)', {
        name: `%${filters.name.trim()}%`,
      });
    }

    const dateFields: Array<[keyof typeof filters, string]> = [
      ['startDate', 'course.startDate'],
      ['endDate', 'course.endDate'],
      ['startDateFrom', 'course.startDate'],
      ['startDateTo', 'course.startDate'],
      ['endDateFrom', 'course.endDate'],
      ['endDateTo', 'course.endDate'],
    ];

    for (const [filterName, columnName] of dateFields) {
      const value = filters[filterName];
      if (!value) continue;
      this.assertValidDateFilter(value, String(filterName));

      const operator = filterName.endsWith('From')
        ? '>='
        : filterName.endsWith('To')
          ? '<='
          : '=';
      query.andWhere(`${columnName} ${operator} :${String(filterName)}`, {
        [String(filterName)]: value,
      });
    }

    if (
      filters.startDateFrom &&
      filters.startDateTo &&
      filters.startDateFrom > filters.startDateTo
    ) {
      throw new BadRequestException('startDateFrom must be on or before startDateTo');
    }
    if (
      filters.endDateFrom &&
      filters.endDateTo &&
      filters.endDateFrom > filters.endDateTo
    ) {
      throw new BadRequestException('endDateFrom must be on or before endDateTo');
    }
    if (
      filters.startDate &&
      filters.endDate &&
      filters.startDate > filters.endDate
    ) {
      throw new BadRequestException('startDate must be on or before endDate');
    }

    return query.orderBy('course.startDate', 'DESC').getMany();
  }

  private assertValidDateFilter(value: string, fieldName: string) {
    const validFormat = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const parsed = validFormat ? new Date(`${value}T00:00:00.000Z`) : new Date('invalid');
    if (
      !validFormat ||
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException(`${fieldName} must be a valid date in YYYY-MM-DD format`);
    }
  }

  async createCourse(dto: CreateCourseDto) {
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException(
        'End date must be on or after start date',
      );
    }

    const course = this.courseRepository.create({
      name: dto.name,
      startDate: dto.startDate,
      endDate: dto.endDate,
    });

    return this.courseRepository.save(course);
  }

  async updateCourse(courseId: number, dto: UpdateCourseDto) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const startDate = dto.startDate ?? course.startDate;
    const endDate = dto.endDate ?? course.endDate;

    if (endDate < startDate) {
      throw new BadRequestException(
        'End date must be on or after start date',
      );
    }

    // A course's new date range must continue to contain its existing sessions.
    if (dto.startDate !== undefined || dto.endDate !== undefined) {
      const sessions = await this.sessionRepository.find({
        where: { courseId },
      });
      const outOfRangeSession = sessions.find(
        (session) =>
          session.sessionDate < startDate || session.sessionDate > endDate,
      );

      if (outOfRangeSession) {
        throw new BadRequestException(
          'Course dates cannot be changed because at least one existing session would fall outside the new date range. Update or remove that session first.',
        );
      }
    }

    if (dto.name !== undefined) course.name = dto.name;
    course.startDate = startDate;
    course.endDate = endDate;

    return this.courseRepository.save(course);
  }

  async deleteCourse(courseId: number) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Database foreign keys must define the intended ON DELETE CASCADE rules.
    await this.courseRepository.remove(course);

    return {
      message: 'Course deleted successfully',
      courseId,
    };
  }

  async assignCoach(courseId: number, coachId: number) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: { coaches: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const coach = await this.coachRepository.findOne({
      where: { id: coachId },
    });

    if (!coach) {
      throw new NotFoundException('Coach not found');
    }

    if (coach.role !== Role.COACH) {
      throw new BadRequestException(
        'Only a coach account can be assigned to a course',
      );
    }

    const alreadyAssigned = course.coaches.some(
      (assignedCoach) => assignedCoach.id === coach.id,
    );

    if (alreadyAssigned) {
      throw new ConflictException(
        'This coach is already assigned to this course',
      );
    }

    course.coaches.push(coach);

    await this.courseRepository.save(course);

    return {
      message: 'Coach assigned to course successfully',
      courseId: course.id,
      coachId: coach.id,
    };
  }

  async getMyCourses(userId: number, userRole: Role) {
    if (userRole === Role.HEAD_COACH) {
      return this.findAll();
    }

    if (userRole !== Role.COACH) {
      throw new BadRequestException('Only coaches and head coaches can view courses here');
    }

    return this.courseRepository
      .createQueryBuilder('course')
      .innerJoin(
        'course.coaches',
        'coach',
        'coach.id = :coachId',
        { coachId: userId },
      )
      .orderBy('course.startDate', 'DESC')
      .getMany();
  }

  async findAssignedCoaches(courseId: number, filters: {
    firstName?: string;
    lastName?: string;
    personnelCode?: string;
  } = {}) {
    const exists = await this.courseRepository.findOne({ where: { id: courseId }, select: { id: true } });
    if (!exists) throw new NotFoundException('Course not found');

    const query = this.courseRepository
      .createQueryBuilder('course')
      .leftJoin('course.coaches', 'coach')
      .addSelect(['coach.id', 'coach.firstName', 'coach.lastName', 'coach.personnelCode', 'coach.role', 'coach.createdAt'])
      .where('course.id = :courseId', { courseId });

    this.applyCoachFilters(query, filters);
    const course = await query.getOne();
    return course?.coaches ?? [];
  }

  async findAvailableCoaches(courseId: number, filters: {
    firstName?: string;
    lastName?: string;
    personnelCode?: string;
  } = {}) {
    const exists = await this.courseRepository.findOne({ where: { id: courseId }, select: { id: true } });
    if (!exists) throw new NotFoundException('Course not found');

    const query = this.coachRepository
      .createQueryBuilder('coach')
      .select(['coach.id', 'coach.firstName', 'coach.lastName', 'coach.personnelCode', 'coach.role', 'coach.createdAt'])
      .where('coach.role = :role', { role: Role.COACH })
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM course_coaches cc WHERE cc.coach_id = coach.id AND cc.course_id = :courseId)',
        { courseId },
      );
    this.applyCoachFilters(query, filters);

    return query.orderBy('coach.lastName', 'ASC').addOrderBy('coach.firstName', 'ASC').getMany();
  }

  private applyCoachFilters(
    query: SelectQueryBuilder<any>,
    filters: { firstName?: string; lastName?: string; personnelCode?: string },
  ) {
    if (filters.firstName?.trim()) {
      query.andWhere('LOWER(coach.firstName) LIKE LOWER(:firstName)', {
        firstName: `%${filters.firstName.trim()}%`,
      });
    }
    if (filters.lastName?.trim()) {
      query.andWhere('LOWER(coach.lastName) LIKE LOWER(:lastName)', {
        lastName: `%${filters.lastName.trim()}%`,
      });
    }
    if (filters.personnelCode?.trim()) {
      query.andWhere('LOWER(coach.personnelCode) LIKE LOWER(:personnelCode)', {
        personnelCode: `%${filters.personnelCode.trim()}%`,
      });
    }
  }

  async removeCoach(courseId: number, coachId: number) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: { coaches: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const assigned = course.coaches.some((coach) => coach.id === coachId);
    if (!assigned) {
      throw new NotFoundException('Coach is not assigned to this course');
    }

    course.coaches = course.coaches.filter((coach) => coach.id !== coachId);
    await this.courseRepository.save(course);

    return { message: 'Coach removed from course successfully', courseId, coachId };
  }
}
