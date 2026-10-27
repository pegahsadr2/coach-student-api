import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ExamAreasService } from './exam-areas.service';
import { UpdateExamAreaDto } from './dto/update-exam-area.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';

@ApiTags('Exam Areas')
@ApiBearerAuth('access-token')
@Controller('exam-areas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamAreasController {
  constructor(private readonly examAreasService: ExamAreasService) {}

  @ApiOperation({ summary: 'List exam areas', description: 'Returns configured exam areas. No request body is needed.' })
  @Get()
  @Roles(Role.HEAD_COACH, Role.COACH)
  findAll() {
    return this.examAreasService.findAll();
  }

  @ApiOperation({ summary: 'Update an exam area', description: 'Head coach only. Send one or both configurable fields.' })
  @ApiParam({ name: 'id', example: 1, description: 'Existing exam area ID.' })
  @ApiBody({ type: UpdateExamAreaDto })
  @Patch(':id')
  @Roles(Role.HEAD_COACH)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExamAreaDto,
  ) {
    return this.examAreasService.update(id, dto);
  }
}
