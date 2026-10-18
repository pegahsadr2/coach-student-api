
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './entities/course.entity';
import { Coach } from '../users/entities/coach.entity';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Course, Coach])],
  controllers: [CoursesController],
  providers: [CoursesService, RolesGuard],
})
export class CoursesModule {}

