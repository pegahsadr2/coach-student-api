import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateVisualErrorDto {
  @ApiProperty({ example: 'Incorrect wire color', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 1, minimum: 1, description: 'ID of an existing exam area.' })
  @IsInt()
  @Min(1)
  examAreaId: number;

  @ApiProperty({ example: 2.5, minimum: 0, maximum: 100, description: 'Penalty points to subtract from the score.' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  penalty: number;
}
