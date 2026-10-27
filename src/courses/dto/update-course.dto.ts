import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateCourseDto {
  @ApiPropertyOptional({
    example: 'Autumn 2026 Updated',
    maxLength: 150,
    description: 'New course/term name.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    example: '2026-11-01',
    format: 'date',
    description: 'New start date in YYYY-MM-DD format.',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2027-03-31',
    format: 'date',
    description: 'New end date in YYYY-MM-DD format; must be on or after startDate.',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
