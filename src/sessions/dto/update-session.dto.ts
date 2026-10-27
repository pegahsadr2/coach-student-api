import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateSessionDto {
  @ApiPropertyOptional({
    example: 'Introduction Session - Updated',
    maxLength: 150,
    description: 'New session name. Omit it to keep the current name.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    example: '2026-11-12',
    format: 'date',
    description: 'New date in YYYY-MM-DD format; it must remain within the course date range.',
  })
  @IsOptional()
  @IsDateString()
  sessionDate?: string;

  @ApiPropertyOptional({
    example: '10:30',
    nullable: true,
    description: '24-hour time (HH:mm or HH:mm:ss). Send null to clear the current time.',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  sessionTime?: string | null;

  @ApiPropertyOptional({
    example: 'Updated session notes.',
    nullable: true,
    description: 'Optional description. Send null to clear it.',
  })
  @IsOptional()
  @IsString()
  description?: string | null;
}
