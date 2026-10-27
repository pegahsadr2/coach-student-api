import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class AddStudentToSessionDto {
  @ApiProperty({ example: 1, minimum: 1, description: 'ID of an existing student (replace with the real student ID).' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  studentId: number;
}
