import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsersService } from './users.service';
import { Role } from './enums/role.enum';
import { CreateCoachDto } from './dto/create-coach.dto';
import { UpdateCoachDto } from './dto/update-coach.dto';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary: 'Get my profile',
    description: 'Requires a valid Bearer access token. No request body is needed.',
  })
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() request: any) {
    return request.user;
  }

  @ApiOperation({
    summary: 'Head coach area',
    description: 'Head coach only. No request body is needed.',
  })
  @Get('head-coach-area')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HEAD_COACH)
  getHeadCoachArea() {
    return { message: 'Welcome Head Coach' };
  }

  @ApiOperation({
    summary: 'Create a coach',
    description:
      'Head coach only. personnelCode must be unique; the password is set here and used for login.',
  })
  @ApiBody({ type: CreateCoachDto })
  @Post('coaches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HEAD_COACH)
  async createCoach(@Body() dto: CreateCoachDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const coach = await this.usersService.createCoach({
      firstName: dto.firstName,
      lastName: dto.lastName,
      personnelCode: dto.personnelCode,
      passwordHash,
      role: Role.COACH,
    });

    return {
      message: 'Coach created successfully',
      coach: this.toPublicCoach(coach),
    };
  }

  @ApiOperation({
    summary: 'List coaches',
    description: 'Head coach only. Password hashes are never included in the response.',
  })
  @Get('coaches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HEAD_COACH)
  listCoaches() {
    return this.usersService.findAllCoaches();
  }

  @ApiOperation({
    summary: 'Get a coach by ID',
    description: 'Head coach only. Returns public coach details without the password hash.',
  })
  @ApiParam({ name: 'id', example: 2, description: 'Existing coach account ID.' })
  @Get('coaches/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HEAD_COACH)
  async getCoach(@Param('id', ParseIntPipe) id: number) {
    return this.toPublicCoach(await this.usersService.findCoachById(id));
  }

  @ApiOperation({
    summary: 'Update a coach',
    description:
      'Head coach only. Send only fields that need changing. Password changes are handled by the password-change endpoint; the personnel code must remain unique.',
  })
  @ApiParam({ name: 'id', example: 2, description: 'Existing coach account ID.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', example: 'Sara' },
        lastName: { type: 'string', example: 'Ahmadi' },
        personnelCode: { type: 'string', example: 'COACH002' },
      },
      example: {
        firstName: 'Sara',
        lastName: 'Ahmadi',
        personnelCode: 'COACH002',
      },
    },
  })
  @Patch('coaches/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HEAD_COACH)
  async updateCoach(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCoachDto,
  ) {
    const coach = await this.usersService.updateCoach(id, dto);
    return {
      message: 'Coach updated successfully',
      coach: this.toPublicCoach(coach),
    };
  }

  @ApiOperation({
    summary: 'Delete a coach',
    description:
      'Head coach only. Deletion is blocked while this coach has sessions or exams, to avoid accidental loss of training history. Assigned-course links are removed by the database relation.',
  })
  @ApiParam({ name: 'id', example: 2, description: 'Existing coach account ID.' })
  @Delete('coaches/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HEAD_COACH)
  deleteCoach(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.deleteCoach(id);
  }

  private toPublicCoach(coach: {
    id: number;
    firstName: string;
    lastName: string;
    personnelCode: string;
    role: Role;
    createdAt: Date;
  }) {
    return {
      id: coach.id,
      firstName: coach.firstName,
      lastName: coach.lastName,
      personnelCode: coach.personnelCode,
      role: coach.role,
      createdAt: coach.createdAt,
    };
  }
}
