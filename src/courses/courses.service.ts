
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
import { Role } from '../users/enums/role.enum';
import { CreateCourseDto } from './dto/create-course.dto';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,

    @InjectRepository(Coach)
    private readonly coachRepository: Repository<Coach>,
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

