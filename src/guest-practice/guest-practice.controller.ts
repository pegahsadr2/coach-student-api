import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { CreateGuestPracticeActivityDto } from './dto/create-guest-practice-activity.dto';
import { StartGuestPracticeDto } from './dto/start-guest-practice.dto';
import { GuestPracticeService } from './guest-practice.service';

@ApiTags('Guest Practice')
@ApiBearerAuth('access-token')
@Controller('guest-practice')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.GUEST)
export class GuestPracticeController {
  constructor(private readonly guestPracticeService: GuestPracticeService) {}

  @Get('exam-areas')
  @ApiOperation({ summary: 'List exam areas available for guest practice' })
  getExamAreas() {
    return this.guestPracticeService.getExamAreas();
  }

  @Get('exam-areas/:examAreaId/errors')
  @ApiOperation({ summary: 'List predefined procedure errors for an exam area' })
  getProcedureErrors(@Param('examAreaId', ParseIntPipe) examAreaId: number) {
    return this.guestPracticeService.getProcedureErrors(examAreaId);
  }

  @Post('attempts')
  @ApiOperation({ summary: 'Start a temporary guest practice attempt' })
  startAttempt(@Body() dto: StartGuestPracticeDto, @Req() request: any) {
    return this.guestPracticeService.startAttempt(String(request.user.id), dto);
  }

  @Get('attempts/:attemptId')
  @ApiOperation({ summary: 'Get a guest practice attempt owned by this guest' })
  getAttempt(@Param('attemptId') attemptId: string, @Req() request: any) {
    return this.guestPracticeService.getAttempt(
      String(request.user.id),
      attemptId,
    );
  }

  @Post('attempts/:attemptId/activities')
  @ApiOperation({ summary: 'Record a correct step or a predefined procedure error' })
  @ApiBody({
    type: CreateGuestPracticeActivityDto,
    examples: {
      correctStep: {
        summary: 'Record a correct step',
        value: { activityType: 'correct' },
      },
      procedureError: {
        summary: 'Record a procedure error',
        value: { activityType: 'error', errorTypeId: 1 },
      },
    },
  })
  addActivity(
    @Param('attemptId') attemptId: string,
    @Body() dto: CreateGuestPracticeActivityDto,
    @Req() request: any,
  ) {
    return this.guestPracticeService.addActivity(
      String(request.user.id),
      attemptId,
      dto,
    );
  }

  @Post('attempts/:attemptId/finish')
  @ApiOperation({ summary: 'Finish guest practice and calculate a temporary score' })
  finishAttempt(@Param('attemptId') attemptId: string, @Req() request: any) {
    return this.guestPracticeService.finishAttempt(
      String(request.user.id),
      attemptId,
    );
  }
}
