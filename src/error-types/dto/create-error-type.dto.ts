import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateErrorTypeDto {
  @ApiProperty({ example: 'Incorrect wire color', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    enum: ['procedure', 'coach_applied', 'visual'],
    example: 'visual',
  })
  @IsIn(['procedure', 'coach_applied', 'visual'])
  kind: 'procedure' | 'coach_applied' | 'visual';

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  examAreaId: number;

  @ApiProperty({ example: 2.5, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  penalty: number;
}
