import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSessionDto {
  @ApiProperty({ example: 1, minimum: 1, description: 'ID of an existing course/term assigned to the logged-in coach (replace with a real ID).' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  courseId: number;

  @ApiProperty({ example: 'Introduction Session', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiProperty({ example: '2026-11-05', format: 'date', description: 'Session date in YYYY-MM-DD format; use a date within the course term.' })
  @IsDateString()
  sessionDate: string;

  @ApiPropertyOptional({ example: '10:00', pattern: '^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$', description: '24-hour time, HH:mm or HH:mm:ss.' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  sessionTime?: string;

  @ApiPropertyOptional({ example: 'Introduction to basic concepts.' })
  @IsOptional()
  @IsString()
  description?: string;
}
