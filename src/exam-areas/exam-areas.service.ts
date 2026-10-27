import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ExamArea } from './entities/exam-area.entity';
import { UpdateExamAreaDto } from './dto/update-exam-area.dto';

@Injectable()
export class ExamAreasService {
  constructor(
    @InjectRepository(ExamArea)
    private readonly examAreasRepository: Repository<ExamArea>,
  ) {}

  findAll() {
    return this.examAreasRepository.find({
      order: { id: 'ASC' },
    });
  }

  async update(id: number, dto: UpdateExamAreaDto) {
    if (dto.scoreWeight === undefined && dto.durationMinutes === undefined) {
      throw new BadRequestException('Provide scoreWeight or durationMinutes');
    }

    const area = await this.examAreasRepository.findOne({
      where: { id },
    });

    if (!area) {
      throw new NotFoundException('Exam area not found');
    }

    if (dto.scoreWeight !== undefined) {
      area.scoreWeight = String(dto.scoreWeight);
    }

    if (dto.durationMinutes !== undefined) {
      area.durationMinutes = dto.durationMinutes;
    }

    return this.examAreasRepository.save(area);
  }
}
