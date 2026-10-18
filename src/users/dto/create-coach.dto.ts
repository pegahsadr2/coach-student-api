import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateCoachDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  personnelCode: string;

  @IsString()
  @MinLength(8)
  password: string;
}
