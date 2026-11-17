
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSessionStudentExamSettings1795000000000
  implements MigrationInterface
{
  name = 'AddSessionStudentExamSettings1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the maximum exam attempts to each student enrollment.
    await queryRunner.query(`
      ALTER TABLE public.session_students
      ADD COLUMN IF NOT EXISTS max_exam_attempts INTEGER NOT NULL DEFAULT 1
    `);

    // Ensure the maximum attempts constraint exists.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'session_students_max_exam_attempts_check'
            AND conrelid = 'public.session_students'::regclass
        ) THEN
          ALTER TABLE public.session_students
          ADD CONSTRAINT session_students_max_exam_attempts_check
          CHECK (max_exam_attempts >= 1);
        END IF;
      END $$;
    `);

    // Create the student-specific error assignments table.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.session_student_errors (
        session_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        error_type_id INTEGER NOT NULL,
        assigned_by_coach_id INTEGER,
        created_at TIMESTAMP WITHOUT TIME ZONE
          NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure the primary key exists.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'session_student_errors_pkey'
            AND conrelid = 'public.session_student_errors'::regclass
        ) THEN
          ALTER TABLE public.session_student_errors
          ADD CONSTRAINT session_student_errors_pkey
          PRIMARY KEY (session_id, student_id, error_type_id);
        END IF;
      END $$;
    `);

    // Ensure foreign keys exist.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'session_student_errors_enrollment_fkey'
            AND conrelid = 'public.session_student_errors'::regclass
        ) THEN
          ALTER TABLE public.session_student_errors
          ADD CONSTRAINT session_student_errors_enrollment_fkey
          FOREIGN KEY (session_id, student_id)
          REFERENCES public.session_students (session_id, student_id)
          ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'session_student_errors_error_type_fkey'
            AND conrelid = 'public.session_student_errors'::regclass
        ) THEN
          ALTER TABLE public.session_student_errors
          ADD CONSTRAINT session_student_errors_error_type_fkey
          FOREIGN KEY (error_type_id)
          REFERENCES public.error_types (id)
          ON DELETE RESTRICT;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'session_student_errors_assigned_by_fkey'
            AND conrelid = 'public.session_student_errors'::regclass
        ) THEN
          ALTER TABLE public.session_student_errors
          ADD CONSTRAINT session_student_errors_assigned_by_fkey
          FOREIGN KEY (assigned_by_coach_id)
          REFERENCES public.coaches (id)
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_session_student_errors_error_type
      ON public.session_student_errors (error_type_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // WARNING: reverting this migration deletes assigned error records
    // and removes the exam-attempt configuration.
    await queryRunner.query(`
      DROP TABLE IF EXISTS public.session_student_errors
    `);

    await queryRunner.query(`
      ALTER TABLE public.session_students
      DROP COLUMN IF EXISTS max_exam_attempts
    `);
  }
}


