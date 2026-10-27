import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateErrorTypeDto {
  @ApiPropertyOptional({ example: 'Incorrect wire color', maxLength: 255 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1, description: 'ID of an existing exam area.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  examAreaId?: number;

  @ApiPropertyOptional({ example: 2.5, minimum: 0, description: 'Penalty points.' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  penalty?: number;
}
