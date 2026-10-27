import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

/**
 * Only pending exams can be edited. Every field is optional so the caller can
 * change one setting at a time; the service rejects an empty object.
 */
export class UpdateExamDto {
  @ApiPropertyOptional({
    example: 2,
    minimum: 1,
    description: 'Existing session ID. The student must be enrolled in this session.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  sessionId?: number;

  @ApiPropertyOptional({
    example: 3,
    minimum: 1,
    description: 'Existing student ID enrolled in the selected session.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  studentId?: number;

  @ApiPropertyOptional({
    example: 2,
    minimum: 1,
    description: 'Existing exam area ID.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  examAreaId?: number;

  @ApiPropertyOptional({
    example: 'practice',
    enum: ['exam', 'practice'],
  })
  @IsOptional()
  @IsIn(['exam', 'practice'])
  mode?: 'exam' | 'practice';

  @ApiPropertyOptional({
    example: 'interactive',
    enum: ['real_hardware', 'interactive'],
  })
  @IsOptional()
  @IsIn(['real_hardware', 'interactive'])
  examType?: 'real_hardware' | 'interactive';
}
