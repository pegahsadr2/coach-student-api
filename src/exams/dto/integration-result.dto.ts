import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

export class IntegrationActivityDto {
  @IsInt()
  @Min(1)
  sequence: number;

  @IsIn(['correct', 'error', 'visual_error'])
  activityType: 'correct' | 'error' | 'visual_error';

  @IsOptional()
  @IsInt()
  @Min(1)
  errorTypeId?: number;

  @IsDateString()
  occurredAt: string;
}

export class IntegrationResultDto {
  @IsDateString()
  startedAt: string;

  @IsDateString()
  finishedAt: string;

  @IsArray()
  @ArrayMaxSize(3000)
  @ValidateNested({ each: true })
  @Type(() => IntegrationActivityDto)
  activities: IntegrationActivityDto[];
}