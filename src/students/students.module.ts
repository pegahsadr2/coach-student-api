
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Student } from './entities/student.entity';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Student])],
  controllers: [StudentsController],
  providers: [StudentsService, RolesGuard],
  exports: [StudentsService],
})
export class StudentsModule {}
