import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ExamArea } from './entities/exam-area.entity';
import { ExamAreasController } from './exam-areas.controller';
import { ExamAreasService } from './exam-areas.service';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([ExamArea])],
  controllers: [ExamAreasController],
  providers: [ExamAreasService, RolesGuard],
})
export class ExamAreasModule {}
