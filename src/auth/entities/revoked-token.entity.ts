import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'revoked_tokens' })
export class RevokedToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'jti',
    type: 'varchar',
    length: 100,
    unique: true,
  })
  jti: string;

  @Column({
    name: 'expires_at',
    type: 'timestamp without time zone',
  })
  expiresAt: Date;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp without time zone',
  })
  createdAt: Date;
}
