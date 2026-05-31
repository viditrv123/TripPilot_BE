import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserRecord } from '../auth/interfaces/user-record.interface.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUser(uid: string): Promise<UserRecord> {
    const user = await this.prisma.user.findUnique({ where: { uid } });
    if (!user) {
      throw new NotFoundException(`User not found with uid: ${uid}`);
    }
    return user as unknown as UserRecord;
  }

  async updateUser(uid: string, updateUserDto: UpdateUserDto): Promise<UserRecord> {
    const user = await this.prisma.user.findUnique({ where: { uid } });
    if (!user) {
      throw new NotFoundException(`User not found with uid: ${uid}`);
    }

    const currentPrefs = user.preferences as {
      currency: string;
      language: string;
      travelStyle: string;
    };

    const updated = await this.prisma.user.update({
      where: { uid },
      data: {
        displayName: updateUserDto.displayName ?? user.displayName,
        preferences: updateUserDto.preferences
          ? {
              currency: updateUserDto.preferences.currency ?? currentPrefs.currency,
              language: updateUserDto.preferences.language ?? currentPrefs.language,
              travelStyle:
                updateUserDto.preferences.travelStyle ?? currentPrefs.travelStyle,
            }
          : currentPrefs,
      },
    });

    return updated as unknown as UserRecord;
  }
}
