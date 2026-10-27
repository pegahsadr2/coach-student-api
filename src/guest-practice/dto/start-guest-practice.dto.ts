import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class StartGuestPracticeDto {
  @ApiProperty({
    example: 1,
    description: 'ID of an existing exam area available for practice',
  })
  @IsInt()
  @Min(1)
  examAreaId: number;
}
