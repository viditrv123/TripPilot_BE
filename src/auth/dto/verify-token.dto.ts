import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Token is required' })
  token!: string;
}
