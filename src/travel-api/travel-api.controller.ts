import { Controller, Get, Query, Res, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator.js';

@Controller('travel')
export class TravelApiController {
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('travelApi.googlePlacesKey') ?? '';
  }

  @Get('photo')
  @Public()
  async proxyPhoto(
    @Query('ref') ref: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!ref) throw new BadRequestException('ref query param is required');

    const url = 'https://maps.googleapis.com/maps/api/place/photo';
    const response = await firstValueFrom(
      this.httpService.get<Buffer>(url, {
        params: { maxwidth: 1600, photoreference: ref, key: this.apiKey },
        responseType: 'arraybuffer',
      }),
    );

    res.set('Content-Type', (response.headers['content-type'] as string) || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(response.data);
  }
}
