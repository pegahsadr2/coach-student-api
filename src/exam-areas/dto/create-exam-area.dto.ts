import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateExamAreaDto {
  @ApiProperty({ example: 'Electrical installation', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiProperty({ example: 20, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  scoreWeight: number;

  @ApiProperty({ example: 60, minimum: 1 })
  @IsInt()
  @Min(1)
  durationMinutes: number;
}
