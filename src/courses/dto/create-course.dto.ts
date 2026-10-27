import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({ example: 'Autumn 2026', maxLength: 150, description: 'Course/term name.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiProperty({ example: '2026-11-01', format: 'date', description: 'Start date in YYYY-MM-DD format.' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2027-03-31', format: 'date', description: 'End date in YYYY-MM-DD format; must be on or after startDate.' })
  @IsDateString()
  endDate: string;
}
