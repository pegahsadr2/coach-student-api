import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { ExamsService } from './exams.service';
import { IntegrationResultDto } from './dto/integration-result.dto';
import { ExamIntegrationGuard } from './guards/exam-integration.guard';

@ApiTags('Exam Integration')
@Controller('exams')
export class ExamIntegrationController {
  constructor(private readonly examsService: ExamsService) {}

  @Post(':id/integration-result')
  @UseGuards(ExamIntegrationGuard)
  @ApiHeader({
    name: 'x-integration-key',
    required: true,
    description: 'Private server-to-server integration key',
  })
  @ApiOperation({
    summary: 'Receive completed exam activities from external exam backend',
  })
  receiveResult(
    @Param('id', ParseIntPipe) examId: number,
    @Body() dto: IntegrationResultDto,
  ) {
    return this.examsService.receiveIntegrationResult(examId, dto);
  }
}