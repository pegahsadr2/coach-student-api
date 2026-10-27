import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class CreateGuestPracticeActivityDto {
  @ApiProperty({ enum: ['correct', 'error'], example: 'correct' })
  @IsIn(['correct', 'error'])
  activityType: 'correct' | 'error';

  @ApiPropertyOptional({
    description: 'Required for activityType=error; omit for activityType=correct',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  errorTypeId?: number;
}
