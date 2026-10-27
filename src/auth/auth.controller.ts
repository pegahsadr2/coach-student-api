import { Body, Controller, Post, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Role } from '../users/enums/role.enum';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @ApiOperation({
    summary: 'Enter guest practice mode',
    description:
      'Creates a temporary guest token without username or password. The guest can use only the dedicated guest-practice endpoints.',
  })
  @ApiResponse({
    status: 201,
    description: 'Temporary guest access token created. Token lifetime is 30 minutes.',
  })
  @Post('guest')
  guestLogin() {
    return this.authService.guestLogin();
  }

  @ApiOperation({
    summary: 'Login',
    description: 'Authenticate a coach or student and return an access token.',
  })
  @ApiBody({
  schema: {
      type: 'object',
      required: ['username', 'password'],
      properties: {
        username: {
          type: 'string',
          example: 'COACH001',
        },
        password: {
          type: 'string',
          example: 'CoachPass@2026',
        },
      },
      example: {
        username: 'COACH001',
        password: 'CoachPass@2026',
      },
    },
  })
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.username, loginDto.password);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Req() req: { user: { id: string; role: Role } },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      Number(req.user.id),
      req.user.role,
      dto,
    );
  }

  @ApiBearerAuth('access-token')
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(
    @Req()
    req: {
      user: {
        jti: string;
        tokenExpiresAt: number;
      };
    },
  ) {
    return this.authService.logout(req.user.jti, req.user.tokenExpiresAt);
  }
}
