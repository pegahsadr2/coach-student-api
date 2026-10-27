import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async getMyCourses(coachId: number) {
    return this.courseRepository
      .createQueryBuilder('course')
      .innerJoin(
        'course.coaches',
        'coach',
        'coach.id = :coachId',
        { coachId },
      )
      .orderBy('course.startDate', 'DESC')
      .getMany();
  }
}
