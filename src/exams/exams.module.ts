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

@Module({
  imports: [
    TypeOrmModule.forFeature([Exam, ExamAreaResult, Session, Student, Coach]),
  ],
  controllers: [ExamsController],
  providers: [ExamsService, RolesGuard],
})
export class ExamsModule {}
