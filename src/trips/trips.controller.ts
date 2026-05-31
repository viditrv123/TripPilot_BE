import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { TripsService } from './trips.service.js';
import { CreateTripDto } from './dto/create-trip.dto.js';
import { UpdateTripDto } from './dto/update-trip.dto.js';

@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get()
  async findAll(@CurrentUser('uid') uid: string) {
    return {
      message: 'Trips retrieved successfully',
      trips: await this.tripsService.findAll(uid),
    };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('uid') uid: string,
  ) {
    return {
      message: 'Trip retrieved successfully',
      trip: await this.tripsService.findOne(id, uid),
    };
  }

  @Post()
  async create(
    @CurrentUser('uid') uid: string,
    @Body() createTripDto: CreateTripDto,
  ) {
    return {
      message: 'Trip created successfully',
      trip: await this.tripsService.create(uid, createTripDto),
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser('uid') uid: string,
    @Body() updateTripDto: UpdateTripDto,
  ) {
    return {
      message: 'Trip updated successfully',
      trip: await this.tripsService.update(id, uid, updateTripDto),
    };
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser('uid') uid: string,
  ) {
    const result = await this.tripsService.remove(id, uid);
    return {
      message: 'Trip deleted successfully',
      ...result,
    };
  }
}
