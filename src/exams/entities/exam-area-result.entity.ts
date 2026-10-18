
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
} from 'typeorm';

@Entity({ name: 'exam_area_results' })
@Unique(['examId', 'examAreaId'])
export class ExamAreaResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'exam_id', type: 'integer' })
  examId: number;

  @Column({ name: 'exam_area_id', type: 'integer' })
  examAreaId: number;

  @Column({ type: 'boolean', default: false })
  passed: boolean;

  @Column({
    type: 'numeric',
    precision: 8,
    scale: 2,
    default: 0,
  })
  score: string;
}

