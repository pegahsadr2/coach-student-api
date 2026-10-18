import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from 'typeorm';

import { Coach } from '../../users/entities/coach.entity';

@Entity({ name: 'courses' })
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @ManyToMany(() => Coach)
  @JoinTable({
    name: 'course_coaches',
    joinColumn: {
      name: 'course_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'coach_id',
      referencedColumnName: 'id',
    },
  })
  coaches: Coach[];
}
