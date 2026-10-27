import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Coach } from './entities/coach.entity';
import { Role } from './enums/role.enum';
import { UpdateCoachDto } from './dto/update-coach.dto';
import { Session } from '../sessions/entities/session.entity';
import { Exam } from '../exams/entities/exam.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Coach)
    private readonly coachRepository: Repository<Coach>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
  ) {}

  async createCoach(data: {
    firstName: string;
    lastName: string;
    personnelCode: string;
    passwordHash: string;
    role: Role;
  }): Promise<Coach> {
    const existingCoach = await this.findByPersonnelCode(data.personnelCode);

    if (existingCoach) {
      throw new ConflictException('Personnel code already exists');
    }

    const coach = this.coachRepository.create({
      firstName: data.firstName,
      lastName: data.lastName,
      personnelCode: data.personnelCode,
      passwordHash: data.passwordHash,
      role: data.role,
    });

    return this.coachRepository.save(coach);
  }

  async findAllCoaches() {
    // Explicitly select public fields so password hashes are not loaded or returned.
    return this.coachRepository
      .createQueryBuilder('coach')
      .select([
        'coach.id',
        'coach.firstName',
        'coach.lastName',
        'coach.personnelCode',
        'coach.role',
        'coach.createdAt',
      ])
      .where('coach.role = :role', { role: Role.COACH })
      .orderBy('coach.createdAt', 'DESC')
      .getMany();
  }

  async findCoachById(id: number): Promise<Coach> {
    const coach = await this.coachRepository.findOne({
      where: { id, role: Role.COACH },
    });

    if (!coach) {
      throw new NotFoundException('Coach not found');
    }

    return coach;
  }

  async updateCoach(id: number, dto: UpdateCoachDto): Promise<Coach> {
    if (
      dto.firstName === undefined &&
      dto.lastName === undefined &&
      dto.personnelCode === undefined
    ) {
      throw new BadRequestException(
        'Provide at least one field to update: firstName, lastName, or personnelCode',
      );
    }

    const coach = await this.findCoachById(id);

    if (dto.personnelCode !== undefined) {
      const existingCoach = await this.findByPersonnelCode(dto.personnelCode);
      if (existingCoach && existingCoach.id !== id) {
        throw new ConflictException('Personnel code already exists');
      }
      coach.personnelCode = dto.personnelCode;
    }

    if (dto.firstName !== undefined) coach.firstName = dto.firstName;
    if (dto.lastName !== undefined) coach.lastName = dto.lastName;

    return this.coachRepository.save(coach);
  }

  async deleteCoach(id: number) {
    const coach = await this.findCoachById(id);

    const [sessionsCount, examsCount] = await Promise.all([
      this.sessionRepository.count({ where: { coachId: id } }),
      this.examRepository.count({ where: { coachId: id } }),
    ]);

    if (sessionsCount > 0 || examsCount > 0) {
      throw new ConflictException(
        'This coach cannot be deleted because they have sessions or exams. Preserve the training history and reassign or resolve those records first.',
      );
    }

    await this.coachRepository.remove(coach);

    return {
      message: 'Coach deleted successfully',
      coachId: id,
    };
  }

  async findByPersonnelCode(personnelCode: string): Promise<Coach | null> {
    return this.coachRepository.findOne({
      where: { personnelCode },
    });
  }

  async findByIdForPasswordChange(id: number) {
    return this.coachRepository
      .createQueryBuilder('coach')
      .addSelect('coach.passwordHash')
      .where('coach.id = :id', { id })
      .getOne();
  }

  async updatePasswordHash(id: number, passwordHash: string): Promise<void> {
    const result = await this.coachRepository.update({ id }, { passwordHash });

    if (!result.affected) {
      throw new NotFoundException('Coach not found');
    }
  }
}
