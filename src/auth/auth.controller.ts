import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { GoogleAuthDto } from './dto/google-auth.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const { user, token } = await this.authService.register(dto);
    return { message: 'Account created successfully', user, token };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const { user, token } = await this.authService.login(dto);
    return { message: 'Login successful', user, token };
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() dto: GoogleAuthDto) {
    const { user, token } = await this.authService.loginWithGoogle(dto.idToken);
    return { message: 'Google login successful', user, token };
  }

  @Get('profile')
  async getProfile(@CurrentUser('uid') uid: string) {
    return {
      message: 'Profile retrieved successfully',
      user: await this.authService.getProfile(uid),
    };
  }
}
