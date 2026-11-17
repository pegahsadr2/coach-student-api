import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExamErrorReview1793560000000
  implements MigrationInterface
{
  name = 'AddExamErrorReview1793560000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE exams
      ALTER COLUMN status TYPE varchar(30)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS exam_error_reviews (
        id SERIAL PRIMARY KEY,
        exam_id integer NOT NULL
          REFERENCES exams(id) ON DELETE CASCADE,
        exam_area_id integer NOT NULL
          REFERENCES exam_areas(id) ON DELETE RESTRICT,
        error_type_id integer NOT NULL,
        error_name varchar(200) NOT NULL,
        error_kind varchar(20) NOT NULL,
        actual_occurrences integer NOT NULL DEFAULT 0,
        selected_by_student boolean NOT NULL DEFAULT false,
        classification varchar(30) NOT NULL CHECK (
          classification IN (
            'CORRECTLY_IDENTIFIED',
            'MISSED',
            'FALSE_POSITIVE',
            'CORRECTLY_REJECTED'
          )
        ),
        penalty numeric(8,2) NOT NULL DEFAULT 0,
        created_at timestamp without time zone NOT NULL DEFAULT now(),

        CONSTRAINT uq_exam_error_reviews_exam_error
          UNIQUE (exam_id, error_type_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_exam_error_reviews_exam
      ON exam_error_reviews(exam_id)
    `);
  }

  async down(): Promise<void> {
    // Intentionally non-destructive to preserve historical reviews.
  }
}