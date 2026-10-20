import { IsInt, Min } from 'class-validator';

export class ApplyExamErrorDto {
  @IsInt()
  @Min(1)
  errorTypeId: number;
}
