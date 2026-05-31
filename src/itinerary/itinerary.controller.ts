import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ItineraryService } from './itinerary.service.js';
import { GenerateItineraryDto } from './dto/generate-itinerary.dto.js';

@Controller('itinerary')
export class ItineraryController {
  constructor(private readonly itineraryService: ItineraryService) {}

  @Post('generate')
  async generate(
    @CurrentUser('uid') uid: string,
    @Body() dto: GenerateItineraryDto,
  ) {
    const { trip, travelTips } = await this.itineraryService.generate(uid, dto);
    return {
      message: 'Itinerary generated successfully',
      trip,
      travelTips,
    };
  }
}
