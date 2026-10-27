import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamArea } from '../exam-areas/entities/exam-area.entity';
import { ErrorType } from '../error-types/entities/error-type.entity';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GuestPracticeController } from './guest-practice.controller';
import { GuestPracticeService } from './guest-practice.service';

@Module({
  imports: [TypeOrmModule.forFeature([ExamArea, ErrorType])],
  controllers: [GuestPracticeController],
  providers: [GuestPracticeService, RolesGuard],
})
export class GuestPracticeModule {}
