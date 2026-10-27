import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'COACH001', description: 'Coach personnel code or student code.' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'CoachPass@2026', description: 'Password assigned to this account.', writeOnly: true })
  @IsString()
  @IsNotEmpty()
  password: string;
}
