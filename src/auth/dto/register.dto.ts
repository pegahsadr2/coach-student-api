import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, MinLength } from 'class-validator';
import { Role } from '../../users/enums/role.enum';

export class RegisterDto {
  @ApiProperty({ example: 'COACH002', description: 'Example username. Public registration is currently disabled.' })
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'CoachPass@2026', minLength: 6, description: 'Example password; public registration is currently disabled.', writeOnly: true })
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: Role, example: Role.COACH, description: 'Allowed role values: student, coach, head_coach. Public registration is currently disabled.' })
  @IsEnum(Role)
  role: Role;
}
