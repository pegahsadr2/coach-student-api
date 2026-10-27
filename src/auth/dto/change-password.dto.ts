import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'MatchPassword', async: false })
class MatchPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const object = args.object as Record<string, unknown>;
    return value === object.newPassword;
  }

  defaultMessage(): string {
    return 'confirmNewPassword must match newPassword';
  }
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'CoachPass@2026', description: 'Current account password.', writeOnly: true })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: 'CoachPass@2027', minLength: 8, maxLength: 72, description: 'New password; 8 to 72 characters.', writeOnly: true })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(72)
  newPassword: string;

  @ApiProperty({ example: 'CoachPass@2027', description: 'Must exactly match newPassword.', writeOnly: true })
  @IsString()
  @IsNotEmpty()
  @Validate(MatchPasswordConstraint)
  confirmNewPassword: string;
}
