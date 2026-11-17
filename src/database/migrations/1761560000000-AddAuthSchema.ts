import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Brings older project backups up to the schema required by student login and
 * JWT logout. The statements are idempotent because this project has database
 * snapshots from both before and after authentication was added.
 */
export class AddAuthSchema1761560000000 implements MigrationInterface {
  name = 'AddAuthSchema1761560000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE students
       ADD COLUMN IF NOT EXISTS password_hash varchar(255)`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS revoked_tokens (
         id SERIAL PRIMARY KEY,
         jti varchar(100) NOT NULL UNIQUE,
         expires_at timestamp without time zone NOT NULL,
         created_at timestamp without time zone NOT NULL DEFAULT now()
       )`,
    );
  }

  async down(): Promise<void> {
    // Intentionally non-destructive: both fields can contain live credentials.
  }
}
