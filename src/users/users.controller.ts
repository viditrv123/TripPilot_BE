import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UsersService } from './users.service.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser('uid') uid: string) {
    return {
      message: 'User profile retrieved successfully',
      user: await this.usersService.getUser(uid),
    };
  }

  @Patch('me')
  async updateMe(
    @CurrentUser('uid') uid: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return {
      message: 'User profile updated successfully',
      user: await this.usersService.updateUser(uid, updateUserDto),
    };
  }
}
