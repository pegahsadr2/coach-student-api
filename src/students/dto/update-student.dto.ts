import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Updates editable student profile fields.
 * Password changes are intentionally handled by the authenticated change-password endpoint.
 */
export class UpdateStudentDto {
  @ApiPropertyOptional({
    example: 'ST003',
    maxLength: 50,
    description: 'Unique student code used to log in.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  studentCode?: string;

  @ApiPropertyOptional({ example: 'Ali', maxLength: 100 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Ahmadi', maxLength: 100 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: 'Reza', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fatherName?: string;

  @ApiPropertyOptional({ example: '1234567890', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  idCardNumber?: string;

  @ApiPropertyOptional({
    example: '2010-05-12',
    format: 'date',
    description: 'Date in YYYY-MM-DD format.',
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ example: 'Updated student profile.' })
  @IsOptional()
  @IsString()
  description?: string;
}
