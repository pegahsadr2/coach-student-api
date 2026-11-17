import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExamReportCardSnapshot1793520000000
  implements MigrationInterface
{
  name = 'AddExamReportCardSnapshot1793520000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE exams
      ADD COLUMN IF NOT EXISTS base_score numeric(8,2),
      ADD COLUMN IF NOT EXISTS duration_minutes integer
    `);

    await queryRunner.query(`
      UPDATE exams e
      SET
        base_score = ea.score_weight,
        duration_minutes = ea.duration_minutes
      FROM exam_areas ea
      WHERE e.exam_area_id = ea.id
        AND (
          e.base_score IS NULL
          OR e.duration_minutes IS NULL
        )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE exams
      DROP COLUMN IF EXISTS duration_minutes,
      DROP COLUMN IF EXISTS base_score
    `);
  }
}
