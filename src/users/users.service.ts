import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Coach } from './entities/coach.entity';
import { Role } from './enums/role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Coach)
    private readonly coachRepository: Repository<Coach>,
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

  async findByPersonnelCode(personnelCode: string): Promise<Coach | null> {
    return this.coachRepository.findOne({
      where: { personnelCode },
    });
  }
}
