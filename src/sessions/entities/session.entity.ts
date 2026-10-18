
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Course } from '../../courses/entities/course.entity';
import { Coach } from '../../users/entities/coach.entity';

@Entity({ name: 'sessions' })
export class Session {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'course_id', type: 'integer' })
  courseId: number;

  @Column({ name: 'coach_id', type: 'integer' })
  coachId: number;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ name: 'session_date', type: 'date' })
  sessionDate: string;

  @Column({
    name: 'session_time',
    type: 'time without time zone',
    nullable: true,
  })
  sessionTime: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @ManyToOne(() => Coach, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'coach_id' })
  coach: Coach;
}


