import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TravelApiService } from './travel-api.service.js';
import { TravelApiController } from './travel-api.controller.js';

@Module({
  imports: [HttpModule],
  controllers: [TravelApiController],
  providers: [TravelApiService],
  exports: [TravelApiService],
})
export class TravelApiModule {}
