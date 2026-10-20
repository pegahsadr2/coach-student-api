import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class CreateExamActivityDto {
  @IsIn(['correct', 'error'])
  activityType: 'correct' | 'error';

  @IsOptional()
  @IsInt()
  @Min(1)
  errorTypeId?: number;
}
