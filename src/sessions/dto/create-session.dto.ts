
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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  courseId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsDateString()
  sessionDate: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  sessionTime?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

