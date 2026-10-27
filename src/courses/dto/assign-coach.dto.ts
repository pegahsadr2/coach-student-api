import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class AssignCoachDto {
  @ApiProperty({ example: 2, minimum: 1, description: 'ID of an existing coach account (replace with the real coach ID).' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  coachId: number;
}
