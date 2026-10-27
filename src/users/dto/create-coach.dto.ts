import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateCoachDto {
  @ApiProperty({ example: 'Sara', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Ahmadi', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'COACH002', maxLength: 50, description: 'Unique personnel code used to log in.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  personnelCode: string;

  @ApiProperty({ example: 'CoachPass@2026', minLength: 8, description: 'Initial password for the coach account.', writeOnly: true })
  @IsString()
  @MinLength(8)
  password: string;
}
