import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateExamAreaDto {
  @ApiPropertyOptional({ example: 10, minimum: 0, description: 'Score weight for this exam area.' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  scoreWeight?: number;

  @ApiPropertyOptional({ example: 60, minimum: 1, nullable: true, description: 'Duration in minutes; null can be used if clearing a configured duration is supported by the service.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number | null;
}
