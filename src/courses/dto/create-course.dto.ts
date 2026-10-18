import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
