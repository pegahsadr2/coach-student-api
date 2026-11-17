import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exam } from './entities/exam.entity';
import { Session } from '../sessions/entities/session.entity';
import { Student } from '../students/entities/student.entity';
import { Coach } from '../users/entities/coach.entity';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ExamAreaResult } from './entities/exam-area-result.entity';
import { ExamActivity } from './entities/exam-activity.entity';
import { ExamIntegrationController } from './exam-integration.controller';
import { ExamIntegrationGuard } from './guards/exam-integration.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Exam,
      ExamActivity,
      ExamAreaResult,
      Session,
      Student,
      Coach,
    ]),
  ],
  controllers: [ExamsController, ExamIntegrationController],
  providers: [ExamsService, RolesGuard, ExamIntegrationGuard],
})
export class ExamsModule {}
