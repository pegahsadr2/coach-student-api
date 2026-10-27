import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class ApplyExamErrorDto {
  @ApiProperty({ example: 1, minimum: 1, description: 'ID of an existing predefined error type applicable to this exam area.' })
  @IsInt()
  @Min(1)
  errorTypeId: number;
}
