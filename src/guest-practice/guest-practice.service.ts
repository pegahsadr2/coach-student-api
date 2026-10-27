import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { ExamArea } from '../exam-areas/entities/exam-area.entity';
import { ErrorType } from '../error-types/entities/error-type.entity';
import { CreateGuestPracticeActivityDto } from './dto/create-guest-practice-activity.dto';
import { StartGuestPracticeDto } from './dto/start-guest-practice.dto';

type GuestPracticeActivity = {
  id: number;
  activityType: 'correct' | 'error';
  errorTypeId: number | null;
  title: string;
  penalty: number;
  occurredAt: Date;
};

type GuestPracticeResult = {
  baseScore: number;
  totalPenalty: number;
  errorCount: number;
  totalScore: string;
  passed: boolean;
  result: 'PASSED' | 'FAILED';
};

type GuestPracticeAttempt = {
  id: string;
  guestId: string;
  examAreaId: number;
  examAreaName: string;
  durationMinutes: number | null;
  baseScore: number;
  status: 'IN_PROGRESS' | 'COMPLETED';
  startedAt: Date;
  finishedAt: Date | null;
  activities: GuestPracticeActivity[];
  result: GuestPracticeResult | null;
};

@Injectable()
export class GuestPracticeService {
  // These are temporary practice attempts, not official exams or academic records.
  // They are intentionally kept in memory and disappear when the API process restarts.
  private readonly attempts = new Map<string, GuestPracticeAttempt>();

  constructor(
    @InjectRepository(ExamArea)
    private readonly examAreasRepository: Repository<ExamArea>,
    @InjectRepository(ErrorType)
    private readonly errorTypesRepository: Repository<ErrorType>,
  ) {}

  async getExamAreas() {
    this.cleanupExpiredAttempts();
    return this.examAreasRepository.find({ order: { id: 'ASC' } });
  }

  async getProcedureErrors(examAreaId: number) {
    this.cleanupExpiredAttempts();
    const area = await this.examAreasRepository.findOne({
      where: { id: examAreaId },
    });
    if (!area) {
      throw new NotFoundException('Exam area not found');
    }

    return this.errorTypesRepository.find({
      where: { examAreaId, kind: 'procedure' },
      select: { id: true, name: true, examAreaId: true, penalty: true },
      order: { id: 'ASC' },
    });
  }

  async startAttempt(guestId: string, dto: StartGuestPracticeDto) {
    this.cleanupExpiredAttempts();
    this.assertGuestId(guestId);

    const area = await this.examAreasRepository.findOne({
      where: { id: dto.examAreaId },
    });
    if (!area) {
      throw new NotFoundException('Exam area not found');
    }

    const attempt: GuestPracticeAttempt = {
      id: randomUUID(),
      guestId,
      examAreaId: area.id,
      examAreaName: area.name,
      durationMinutes: area.durationMinutes,
      baseScore: Number(area.scoreWeight),
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      finishedAt: null,
      activities: [],
      result: null,
    };
    this.attempts.set(attempt.id, attempt);
    return this.toPublicAttempt(attempt);
  }

  getAttempt(guestId: string, attemptId: string) {
    this.cleanupExpiredAttempts();
    return this.toPublicAttempt(this.getOwnedAttempt(guestId, attemptId));
  }

  async addActivity(
    guestId: string,
    attemptId: string,
    dto: CreateGuestPracticeActivityDto,
  ) {
    this.cleanupExpiredAttempts();
    const attempt = this.getOwnedAttempt(guestId, attemptId);
    this.assertInProgress(attempt);

    if (
      attempt.durationMinutes !== null &&
      Date.now() >
        attempt.startedAt.getTime() + attempt.durationMinutes * 60_000
    ) {
      throw new BadRequestException(
        'Practice time limit has expired. Finish the attempt to calculate the result.',
      );
    }

    let activity: GuestPracticeActivity;
    if (dto.activityType === 'correct') {
      if (dto.errorTypeId !== undefined) {
        throw new BadRequestException(
          'A correct activity must not include errorTypeId',
        );
      }
      activity = {
        id: attempt.activities.length + 1,
        activityType: 'correct',
        errorTypeId: null,
        title: 'Correct step',
        penalty: 0,
        occurredAt: new Date(),
      };
    } else {
      if (dto.errorTypeId === undefined) {
        throw new BadRequestException(
          'errorTypeId is required for an error activity',
        );
      }
      const errorType = await this.errorTypesRepository.findOne({
        where: {
          id: dto.errorTypeId,
          examAreaId: attempt.examAreaId,
          kind: 'procedure',
        },
      });
      if (!errorType) {
        throw new BadRequestException(
          'Only predefined procedure errors for the selected exam area can be used',
        );
      }
      activity = {
        id: attempt.activities.length + 1,
        activityType: 'error',
        errorTypeId: errorType.id,
        title: errorType.name,
        penalty: Number(errorType.penalty),
        occurredAt: new Date(),
      };
    }

    attempt.activities.push(activity);
    return this.toPublicAttempt(attempt);
  }

  finishAttempt(guestId: string, attemptId: string) {
    this.cleanupExpiredAttempts();
    const attempt = this.getOwnedAttempt(guestId, attemptId);
    this.assertInProgress(attempt);

    const errors = attempt.activities.filter(
      (activity) => activity.activityType === 'error',
    );
    const totalPenalty = errors.reduce(
      (sum, activity) => sum + activity.penalty,
      0,
    );
    const totalScore = Math.max(0, attempt.baseScore - totalPenalty);
    const passed = errors.length === 0;

    attempt.status = 'COMPLETED';
    attempt.finishedAt = new Date();
    attempt.result = {
      baseScore: attempt.baseScore,
      totalPenalty: Number(totalPenalty.toFixed(2)),
      errorCount: errors.length,
      totalScore: totalScore.toFixed(2),
      passed,
      result: passed ? 'PASSED' : 'FAILED',
    };

    return this.toPublicAttempt(attempt);
  }

  private assertGuestId(guestId: string) {
    if (!guestId || typeof guestId !== 'string') {
      throw new UnauthorizedException('Invalid guest identity');
    }
  }

  private getOwnedAttempt(guestId: string, attemptId: string) {
    this.assertGuestId(guestId);
    const attempt = this.attempts.get(attemptId);
    if (!attempt || attempt.guestId !== guestId) {
      throw new NotFoundException('Practice attempt not found');
    }
    return attempt;
  }

  private assertInProgress(attempt: GuestPracticeAttempt) {
    if (attempt.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Practice attempt is already completed');
    }
  }

  private cleanupExpiredAttempts() {
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    for (const [id, attempt] of this.attempts.entries()) {
      if (attempt.startedAt.getTime() < cutoff) {
        this.attempts.delete(id);
      }
    }
  }

  private toPublicAttempt(attempt: GuestPracticeAttempt) {
    return {
      id: attempt.id,
      examAreaId: attempt.examAreaId,
      examAreaName: attempt.examAreaName,
      durationMinutes: attempt.durationMinutes,
      baseScore: attempt.baseScore,
      status: attempt.status,
      startedAt: attempt.startedAt,
      finishedAt: attempt.finishedAt,
      activities: attempt.activities,
      result: attempt.result,
      note: 'Temporary guest practice only; this attempt is not saved to a student academic record.',
    };
  }
}
