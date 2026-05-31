import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { TravelApiService } from '../travel-api/travel-api.service.js';
import { AiService } from '../ai/ai.service.js';
import { GenerateItineraryDto } from './dto/generate-itinerary.dto.js';
import { Trip } from '../trips/interfaces/trip.interface.js';

@Injectable()
export class ItineraryService {
  private readonly logger = new Logger(ItineraryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly travelApiService: TravelApiService,
    private readonly aiService: AiService,
  ) {}

  async generate(
    userId: string,
    dto: GenerateItineraryDto,
  ): Promise<{ trip: Trip; travelTips: string[] }> {
    const budget = {
      total: dto.budget?.total ?? 0,
      currency: dto.budget?.currency ?? 'USD',
    };

    const preferences = {
      pace: dto.preferences?.pace ?? 'moderate',
      interests: dto.preferences?.interests ?? [],
      travelStyle: dto.preferences?.travelStyle ?? 'balanced',
    };

    const constraints = {
      dietary: dto.constraints?.dietary ?? [],
      accessibility: dto.constraints?.accessibility ?? [],
      other: dto.constraints?.other ?? [],
    };

    // 1. Fetch real-world data in parallel — failures are non-fatal
    this.logger.log(`Fetching travel data for ${dto.destination}…`);
    const [poisResult, weatherResult, photoRefResult] = await Promise.allSettled([
      this.travelApiService.getPointsOfInterest(dto.destination, preferences.interests),
      this.travelApiService.getWeatherForecast(dto.destination, dto.startDate),
      this.travelApiService.getDestinationPhotoRef(dto.destination),
    ]);

    const pois = poisResult.status === 'fulfilled' ? poisResult.value : [];
    const weather =
      weatherResult.status === 'fulfilled'
        ? weatherResult.value
        : { available: false, daily: [] };
    const coverPhotoRef =
      photoRefResult.status === 'fulfilled' ? photoRefResult.value : null;

    if (poisResult.status === 'rejected') {
      this.logger.warn(`POI fetch failed: ${poisResult.reason}`);
    }

    // 2. Generate itinerary with AI
    this.logger.log(`Generating AI itinerary with ${pois.length} POIs…`);
    const generated = await this.aiService.generateItinerary({
      destination: dto.destination,
      startDate: dto.startDate,
      endDate: dto.endDate,
      budget,
      preferences,
      constraints,
      travelers: dto.travelers ?? 1,
      pois,
      weather,
    });

    // 3. Normalise activities (assign IDs, fill defaults)
    const itinerary = generated.days.map((day) => ({
      day: day.day,
      date: day.date,
      title: day.title,
      activities: day.activities.map((act) => ({
        id: randomUUID(),
        time: act.time,
        title: act.title,
        description: act.description,
        type: act.type,
        estimatedCost: act.estimatedCost,
        duration: act.duration,
        location: act.location,
      })),
    }));

    // 4. Persist to DB
    const record = await this.prisma.trip.create({
      data: {
        userId,
        name: dto.name ?? generated.name,
        destination: dto.destination,
        startDate: dto.startDate,
        endDate: dto.endDate,
        status: 'planning',
        budget: {
          total: budget.total,
          currency: budget.currency,
          breakdown: generated.budgetBreakdown,
        } as any,
        preferences: preferences as any,
        constraints: constraints as any,
        itinerary: itinerary as any,
        travelers: dto.travelers ?? 1,
        coverPhotoUrl: coverPhotoRef,
      },
    });

    this.logger.log(`AI trip saved: ${record.id}`);
    return { trip: record as unknown as Trip, travelTips: generated.travelTips };
  }
}
