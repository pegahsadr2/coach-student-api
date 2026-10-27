import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsIn, Min } from 'class-validator';

export class CreateExamDto {
  @ApiProperty({ example: 1, minimum: 1, description: 'ID of an existing session (replace with a real session ID).' })
  @IsInt()
  @Min(1)
  sessionId: number;

  @ApiProperty({ example: 1, minimum: 1, description: 'ID of an existing student enrolled in the session.' })
  @IsInt()
  @Min(1)
  studentId: number;

  @ApiProperty({ example: 1, minimum: 1, description: 'ID of an existing exam area.' })
  @IsInt()
  @Min(1)
  examAreaId: number;

  @ApiProperty({ enum: ['exam', 'practice'], example: 'exam' })
  @IsIn(['exam', 'practice'])
  mode: 'exam' | 'practice';

  @ApiProperty({ enum: ['real_hardware', 'interactive'], example: 'real_hardware' })
  @IsIn(['real_hardware', 'interactive'])
  examType: 'real_hardware' | 'interactive';
}
