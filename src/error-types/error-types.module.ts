import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ErrorType } from './entities/error-type.entity';
import { ErrorTypesController } from './error-types.controller';
import { ErrorTypesService } from './error-types.service';
import { ExamArea } from '../exam-areas/entities/exam-area.entity';
import { ExamActivity } from '../exams/entities/exam-activity.entity';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([ErrorType, ExamArea, ExamActivity]),
  ],
  controllers: [ErrorTypesController],
  providers: [ErrorTypesService, RolesGuard],
})
export class ErrorTypesModule {}
