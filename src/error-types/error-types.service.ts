import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ErrorType } from './entities/error-type.entity';
import { CreateVisualErrorDto } from './dto/create-visual-error.dto';
import { UpdateErrorTypeDto } from './dto/update-error-type.dto';
import { ExamArea } from '../exam-areas/entities/exam-area.entity';
import { ExamActivity } from '../exams/entities/exam-activity.entity';

const ERROR_KINDS = ['procedure', 'coach_applied', 'visual'] as const;

@Injectable()
export class ErrorTypesService {
  constructor(
    @InjectRepository(ErrorType)
    private readonly errorTypesRepository: Repository<ErrorType>,

    @InjectRepository(ExamArea)
    private readonly examAreasRepository: Repository<ExamArea>,

    @InjectRepository(ExamActivity)
    private readonly examActivitiesRepository: Repository<ExamActivity>,
  ) {}

  async findAll(filters: {
    name?: string;
    kind?: string;
    examAreaId?: string;
  }) {
    const query = this.errorTypesRepository
      .createQueryBuilder('errorType')
      .orderBy('errorType.id', 'ASC');

    if (filters.name?.trim()) {
      query.andWhere('LOWER(errorType.name) LIKE LOWER(:name)', {
        name: `%${filters.name.trim()}%`,
      });
    }

    if (filters.kind) {
      if (!ERROR_KINDS.includes(filters.kind as (typeof ERROR_KINDS)[number])) {
        throw new BadRequestException(
          'kind must be procedure, coach_applied, or visual',
        );
      }

      query.andWhere('errorType.kind = :kind', {
        kind: filters.kind,
      });
    }

    if (filters.examAreaId) {
      const examAreaId = Number(filters.examAreaId);

      if (!Number.isInteger(examAreaId) || examAreaId < 1) {
        throw new BadRequestException('examAreaId must be a positive integer');
      }

      query.andWhere('errorType.examAreaId = :examAreaId', {
        examAreaId,
      });
    }

    return query.getMany();
  }

  async createVisualError(dto: CreateVisualErrorDto) {
    const area = await this.examAreasRepository.findOne({
      where: { id: dto.examAreaId },
    });

    if (!area) {
      throw new NotFoundException('Exam area not found');
    }

    const errorType = this.errorTypesRepository.create({
      name: dto.name.trim(),
      kind: 'visual',
      examAreaId: area.id,
      penalty: String(dto.penalty),
    });

    return this.errorTypesRepository.save(errorType);
  }

  async update(id: number, dto: UpdateErrorTypeDto) {
    const errorType = await this.errorTypesRepository.findOne({
      where: { id },
    });

    if (!errorType) {
      throw new NotFoundException('Error type not found');
    }

    if (
      errorType.kind !== 'visual' &&
      (dto.name !== undefined || dto.examAreaId !== undefined)
    ) {
      throw new BadRequestException(
        'Only visual errors can have their name or exam area changed',
      );
    }

    if (
      dto.name === undefined &&
      dto.examAreaId === undefined &&
      dto.penalty === undefined
    ) {
      throw new BadRequestException(
        'Provide at least one allowed field to update',
      );
    }

    if (dto.name !== undefined) {
      errorType.name = dto.name.trim();
    }

    if (dto.examAreaId !== undefined) {
      const area = await this.examAreasRepository.findOne({
        where: { id: dto.examAreaId },
      });

      if (!area) {
        throw new NotFoundException('Exam area not found');
      }

      errorType.examAreaId = area.id;
    }

    if (dto.penalty !== undefined) {
      errorType.penalty = String(dto.penalty);
    }

    return this.errorTypesRepository.save(errorType);
  }

  async remove(id: number) {
    const errorType = await this.errorTypesRepository.findOne({
      where: { id },
    });

    if (!errorType) {
      throw new NotFoundException('Error type not found');
    }

    if (errorType.kind !== 'visual') {
      throw new BadRequestException('Only visual errors can be deleted');
    }

    // Preserve historical exam activities that refer to this error type.
    const usageCount = await this.examActivitiesRepository.count({
      where: { errorTypeId: id },
    });

    if (usageCount > 0) {
      throw new ConflictException(
        'This visual error has been used in an exam and cannot be deleted',
      );
    }

    await this.errorTypesRepository.remove(errorType);

    return { message: 'Visual error deleted successfully' };
  }
}
