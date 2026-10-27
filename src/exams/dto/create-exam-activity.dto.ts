import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class CreateExamActivityDto {
  @ApiProperty({ enum: ['correct', 'error'], example: 'correct', description: 'Use correct for a successful step or error to report a predefined procedure error.' })
  @IsIn(['correct', 'error'])
  activityType: 'correct' | 'error';

  @ApiPropertyOptional({ example: 1, minimum: 1, description: 'Required only when activityType is error; ID of a predefined procedure error for this exam area. Omit for correct.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  errorTypeId?: number;
}
