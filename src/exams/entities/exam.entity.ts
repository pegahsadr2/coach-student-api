import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'exams' })
export class Exam {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'session_id', type: 'integer' })
  sessionId: number;

  @Column({ name: 'student_id', type: 'integer' })
  studentId: number;

  @Column({ name: 'coach_id', type: 'integer' })
  coachId: number;

  @Column({ name: 'exam_area_id', type: 'integer', nullable: true })
  examAreaId: number | null;

  @Column({
    type: 'varchar',
    length: 10,
    default: 'exam',
  })
  mode: 'exam' | 'practice';

  @Column({
    name: 'exam_type',
    type: 'varchar',
    length: 20,
    default: 'real_hardware',
  })
  examType: 'real_hardware' | 'interactive';

  @Column({
    name: 'started_at',
    type: 'timestamp without time zone',
    nullable: true,
  })
  startedAt: Date | null;

  @Column({
    name: 'finished_at',
    type: 'timestamp without time zone',
    nullable: true,
  })
  finishedAt: Date | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'PENDING',
  })
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';

  @Column({
    name: 'total_score',
    type: 'numeric',
    precision: 8,
    scale: 2,
    nullable: true,
  })
  totalScore: string | null;
}