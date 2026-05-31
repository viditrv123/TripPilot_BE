import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { Trip } from './interfaces/trip.interface.js';
import { CreateTripDto } from './dto/create-trip.dto.js';
import { UpdateTripDto } from './dto/update-trip.dto.js';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string): Promise<Trip[]> {
    const trips = await this.prisma.trip.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return trips as unknown as Trip[];
  }

  async findOne(id: string, userId: string): Promise<Trip> {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) {
      throw new NotFoundException(`Trip with id "${id}" not found`);
    }
    if (trip.userId !== userId) {
      throw new ForbiddenException('You do not have access to this trip');
    }
    return trip as unknown as Trip;
  }

  async create(userId: string, createTripDto: CreateTripDto): Promise<Trip> {
    const budget = createTripDto.budget
      ? {
          total: createTripDto.budget.total,
          currency: createTripDto.budget.currency ?? 'USD',
          breakdown: createTripDto.budget.breakdown ?? {
            accommodation: 0,
            transport: 0,
            food: 0,
            activities: 0,
            misc: 0,
          },
        }
      : {
          total: 0,
          currency: 'USD',
          breakdown: {
            accommodation: 0,
            transport: 0,
            food: 0,
            activities: 0,
            misc: 0,
          },
        };

    const preferences = createTripDto.preferences
      ? {
          pace: createTripDto.preferences.pace ?? 'moderate',
          interests: createTripDto.preferences.interests ?? [],
          travelStyle: createTripDto.preferences.travelStyle ?? 'balanced',
        }
      : { pace: 'moderate', interests: [], travelStyle: 'balanced' };

    const constraints = createTripDto.constraints
      ? {
          dietary: createTripDto.constraints.dietary ?? [],
          accessibility: createTripDto.constraints.accessibility ?? [],
          other: createTripDto.constraints.other ?? [],
        }
      : { dietary: [], accessibility: [], other: [] };

    const itinerary = createTripDto.itinerary
      ? createTripDto.itinerary.map((day) => ({
          day: day.day,
          date: day.date,
          title: day.title,
          activities: (day.activities ?? []).map((act) => ({
            id: act.id ?? randomUUID(),
            time: act.time,
            title: act.title,
            description: act.description ?? '',
            type: act.type,
            estimatedCost: act.estimatedCost ?? 0,
            duration: act.duration ?? '1h',
            location: act.location ?? '',
          })),
        }))
      : [];

    const trip = await this.prisma.trip.create({
      data: {
        userId,
        name: createTripDto.name,
        destination: createTripDto.destination,
        startDate: createTripDto.startDate,
        endDate: createTripDto.endDate,
        status: (createTripDto.status ?? 'planning') as any,
        budget: budget as any,
        preferences: preferences as any,
        constraints: constraints as any,
        itinerary: itinerary as any,
        travelers: createTripDto.travelers ?? 1,
      },
    });

    this.logger.log(`Trip created: ${trip.id} for user ${userId}`);
    return trip as unknown as Trip;
  }

  async update(id: string, userId: string, updateTripDto: UpdateTripDto): Promise<Trip> {
    const existing = await this.findOne(id, userId);

    const budget = updateTripDto.budget
      ? {
          total: updateTripDto.budget.total ?? existing.budget.total,
          currency: updateTripDto.budget.currency ?? existing.budget.currency,
          breakdown: updateTripDto.budget.breakdown
            ? {
                accommodation:
                  updateTripDto.budget.breakdown.accommodation ??
                  existing.budget.breakdown.accommodation,
                transport:
                  updateTripDto.budget.breakdown.transport ??
                  existing.budget.breakdown.transport,
                food:
                  updateTripDto.budget.breakdown.food ??
                  existing.budget.breakdown.food,
                activities:
                  updateTripDto.budget.breakdown.activities ??
                  existing.budget.breakdown.activities,
                misc:
                  updateTripDto.budget.breakdown.misc ??
                  existing.budget.breakdown.misc,
              }
            : existing.budget.breakdown,
        }
      : existing.budget;

    const preferences = updateTripDto.preferences
      ? {
          pace: updateTripDto.preferences.pace ?? existing.preferences.pace,
          interests:
            updateTripDto.preferences.interests ?? existing.preferences.interests,
          travelStyle:
            updateTripDto.preferences.travelStyle ??
            existing.preferences.travelStyle,
        }
      : existing.preferences;

    const constraints = updateTripDto.constraints
      ? {
          dietary:
            updateTripDto.constraints.dietary ?? existing.constraints.dietary,
          accessibility:
            updateTripDto.constraints.accessibility ??
            existing.constraints.accessibility,
          other: updateTripDto.constraints.other ?? existing.constraints.other,
        }
      : existing.constraints;

    const itinerary = updateTripDto.itinerary
      ? updateTripDto.itinerary.map((day) => ({
          day: day.day,
          date: day.date,
          title: day.title,
          activities: (day.activities ?? []).map((act) => ({
            id: act.id ?? randomUUID(),
            time: act.time,
            title: act.title,
            description: act.description ?? '',
            type: act.type,
            estimatedCost: act.estimatedCost ?? 0,
            duration: act.duration ?? '1h',
            location: act.location ?? '',
          })),
        }))
      : existing.itinerary;

    const trip = await this.prisma.trip.update({
      where: { id },
      data: {
        name: updateTripDto.name ?? existing.name,
        destination: updateTripDto.destination ?? existing.destination,
        startDate: updateTripDto.startDate ?? existing.startDate,
        endDate: updateTripDto.endDate ?? existing.endDate,
        status: (updateTripDto.status ?? existing.status) as any,
        travelers: updateTripDto.travelers ?? existing.travelers,
        budget: budget as any,
        preferences: preferences as any,
        constraints: constraints as any,
        itinerary: itinerary as any,
      },
    });

    this.logger.log(`Trip updated: ${id}`);
    return trip as unknown as Trip;
  }

  async remove(id: string, userId: string): Promise<{ deleted: boolean; id: string }> {
    await this.findOne(id, userId);
    await this.prisma.trip.delete({ where: { id } });
    this.logger.log(`Trip deleted: ${id}`);
    return { deleted: true, id };
  }
}
