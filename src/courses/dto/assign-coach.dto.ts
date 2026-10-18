
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class AssignCoachDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  coachId: number;
}

