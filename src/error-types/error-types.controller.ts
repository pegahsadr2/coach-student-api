import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ErrorTypesService } from './error-types.service';
import { CreateVisualErrorDto } from './dto/create-visual-error.dto';
import { UpdateErrorTypeDto } from './dto/update-error-type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';

@ApiTags('Error Types')
@ApiBearerAuth('access-token')
@Controller('error-types')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ErrorTypesController {
  constructor(private readonly errorTypesService: ErrorTypesService) {}

  @ApiOperation({ summary: 'List/filter error types', description: 'All query filters are optional.' })
  @ApiQuery({ name: 'name', required: false, example: 'wire', description: 'Filter by a name fragment.' })
  @ApiQuery({ name: 'kind', required: false, enum: ['procedure', 'coach_applied', 'visual'], example: 'procedure' })
  @ApiQuery({ name: 'examAreaId', required: false, example: '1', description: 'Filter by an existing exam area ID.' })
  @Get()
  @Roles(Role.HEAD_COACH, Role.COACH)
  findAll(
    @Query('name') name?: string,
    @Query('kind') kind?: string,
    @Query('examAreaId') examAreaId?: string,
  ) {
    return this.errorTypesService.findAll({ name, kind, examAreaId });
  }

  @ApiOperation({ summary: 'Create a visual error', description: 'Head coach only. examAreaId must identify an existing exam area.' })
  @ApiBody({ type: CreateVisualErrorDto })
  @Post('visual')
  @Roles(Role.HEAD_COACH)
  createVisualError(@Body() dto: CreateVisualErrorDto) {
    return this.errorTypesService.createVisualError(dto);
  }

  @ApiOperation({ summary: 'Update an error type', description: 'Send only the fields that should change.' })
  @ApiParam({ name: 'id', example: 1, description: 'Existing error type ID.' })
  @ApiBody({ type: UpdateErrorTypeDto })
  @Patch(':id')
  @Roles(Role.HEAD_COACH)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateErrorTypeDto,
  ) {
    return this.errorTypesService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete an error type', description: 'Head coach only. The service applies the project rules for deleting error types.' })
  @ApiParam({ name: 'id', example: 1, description: 'Existing error type ID.' })
  @Delete(':id')
  @Roles(Role.HEAD_COACH)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.errorTypesService.remove(id);
  }
}
