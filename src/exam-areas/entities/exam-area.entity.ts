import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'exam_areas' })
export class ExamArea {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ name: 'score_weight', type: 'numeric' })
  scoreWeight: string;

  @Column({
    name: 'duration_minutes',
    type: 'integer',
    nullable: true,
  })
  durationMinutes: number | null;
}
