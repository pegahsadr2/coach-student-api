import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'error_types' })
export class ErrorType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  kind: 'procedure' | 'coach_applied' | 'visual';

  @Column({ name: 'exam_area_id', type: 'integer', nullable: true })
  examAreaId: number | null;

  @Column({ type: 'numeric' })
  penalty: string;
}
