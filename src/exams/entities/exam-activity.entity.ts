import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'exam_activities' })
export class ExamActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'exam_id', type: 'integer' })
  examId: number;

  @Column({
    name: 'exam_area_id',
    type: 'integer',
    nullable: true,
  })
  examAreaId: number | null;

  @Column({
    name: 'error_type_id',
    type: 'integer',
    nullable: true,
  })
  errorTypeId: number | null;

  @Column({
    name: 'activity_type',
    type: 'varchar',
    default: 'correct',
  })
  activityType: 'correct' | 'error' | 'visual_error' | 'failure';

  @Column({ type: 'varchar' })
  title: string;

  @Column({
    type: 'numeric',
    precision: 8,
    scale: 2,
    default: 0,
  })
  penalty: string;

  @Column({
    name: 'occurred_at',
    type: 'timestamp without time zone',
    default: () => 'now()',
  })
  occurredAt: Date;
}
