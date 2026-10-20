import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity({ name: 'students' })
export class Student {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'student_code',
    type: 'varchar',
    length: 50,
    unique: true,
  })
  studentCode: string;
  @Column({
   name: 'password_hash',
   type: 'varchar',
   length: 255,
   nullable: true,
   select: false,
  })
  passwordHash: string | null;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({
    name: 'father_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  fatherName: string | null;

  @Column({
    name: 'id_card_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  idCardNumber: string | null;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'created_by', type: 'integer', nullable: true })
  createdBy: number | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp without time zone',
  })
  createdAt: Date;
}

