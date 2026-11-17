import { MigrationInterface, QueryRunner } from 'typeorm';

/** Upgrades the original database snapshot to the pending/in-progress exam flow. */
export class AddExamLifecycle1761560100000 implements MigrationInterface {
  name = 'AddExamLifecycle1761560100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE exams
       ADD COLUMN IF NOT EXISTS exam_area_id integer`,
    );
    await queryRunner.query(
      `ALTER TABLE exams
       ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `ALTER TABLE exams
       ALTER COLUMN started_at DROP NOT NULL,
       ALTER COLUMN started_at DROP DEFAULT`,
    );
    await queryRunner.query(
      `DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_constraint WHERE conname = 'exams_exam_area_id_fkey'
         ) THEN
           ALTER TABLE exams
           ADD CONSTRAINT exams_exam_area_id_fkey
           FOREIGN KEY (exam_area_id) REFERENCES exam_areas(id) ON DELETE RESTRICT;
         END IF;
       END $$`,
    );
  }

  async down(): Promise<void> {
    // Intentionally non-destructive because existing exam records may use these fields.
  }
}
