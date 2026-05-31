import { Module } from '@nestjs/common';
import { TravelApiModule } from '../travel-api/travel-api.module.js';
import { AiModule } from '../ai/ai.module.js';
import { ItineraryService } from './itinerary.service.js';
import { ItineraryController } from './itinerary.controller.js';

@Module({
  imports: [TravelApiModule, AiModule],
  controllers: [ItineraryController],
  providers: [ItineraryService],
})
export class ItineraryModule {}
