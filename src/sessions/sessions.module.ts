
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Session } from './entities/session.entity';
import { Course } from '../courses/entities/course.entity';
import { Coach } from '../users/entities/coach.entity';
import { Student } from '../students/entities/student.entity';

import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Session, Course, Coach, Student])],
  controllers: [SessionsController],
  providers: [SessionsService, RolesGuard],
})
export class SessionsModule {}
