import { IsInt, IsIn, Min } from 'class-validator';

export class CreateExamDto {
  @IsInt()
  @Min(1)
  sessionId: number;

  @IsInt()
  @Min(1)
  studentId: number;

  @IsInt()
  @Min(1)
  examAreaId: number;

  @IsIn(['exam', 'practice'])
  mode: 'exam' | 'practice';

  @IsIn(['real_hardware', 'interactive'])
  examType: 'real_hardware' | 'interactive';
}

