import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, catchError, of } from 'rxjs';
import { POI } from './interfaces/poi.interface.js';
import { WeatherForecast, DailyWeather } from './interfaces/weather.interface.js';

interface GooglePlacesResult {
  name: string;
  formatted_address: string;
  rating?: number;
  types: string[];
  price_level?: number;
  photos?: Array<{ photo_reference: string; width: number; height: number }>;
}

interface GooglePlacesResponse {
  results: GooglePlacesResult[];
  status: string;
}

interface OWMForecastItem {
  dt_txt: string;
  weather: Array<{ description: string }>;
  main: { temp_min: number; temp_max: number };
  pop: number;
}

interface OWMForecastResponse {
  list: OWMForecastItem[];
}

@Injectable()
export class TravelApiService {
  private readonly logger = new Logger(TravelApiService.name);
  private readonly placesApiKey: string;
  private readonly weatherApiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.placesApiKey = this.configService.get<string>('travelApi.googlePlacesKey') ?? '';
    this.weatherApiKey = this.configService.get<string>('travelApi.openWeatherKey') ?? '';
  }

  async getDestinationPhotoRef(destination: string): Promise<string | null> {
    if (!this.placesApiKey) return null;

    const response = await firstValueFrom(
      this.httpService
        .get<GooglePlacesResponse>(
          'https://maps.googleapis.com/maps/api/place/textsearch/json',
          { params: { query: destination, key: this.placesApiKey } },
        )
        .pipe(catchError(() => of(null))),
    );

    if (!response || response.data.status !== 'OK') return null;
    return response.data.results[0]?.photos?.[0]?.photo_reference ?? null;
  }

  async getPointsOfInterest(destination: string, interests: string[]): Promise<POI[]> {
    if (!this.placesApiKey) {
      this.logger.warn('Google Places API key not configured — skipping POI fetch');
      return [];
    }

    const queries = interests
      .slice(0, 4)
      .map((interest) => this.buildPlacesQuery(destination, interest));

    const results = await Promise.allSettled(
      queries.map((query) => this.fetchPlaces(query)),
    );

    const all: POI[] = [];
    const seen = new Set<string>();

    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const poi of result.value) {
          const key = poi.name.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            all.push(poi);
          }
        }
      }
    }

    return all.slice(0, 20);
  }

  async getWeatherForecast(destination: string, startDate: string): Promise<WeatherForecast> {
    if (!this.weatherApiKey) {
      this.logger.warn('OpenWeatherMap API key not configured — skipping weather fetch');
      return { available: false, daily: [] };
    }

    const start = new Date(startDate);
    const daysFromNow = Math.ceil((start.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (daysFromNow > 5) {
      this.logger.log(`Trip starts in ${daysFromNow} days — beyond 5-day forecast window`);
      return { available: false, daily: [] };
    }

    const response = await firstValueFrom(
      this.httpService
        .get<OWMForecastResponse>('https://api.openweathermap.org/data/2.5/forecast', {
          params: { q: destination, appid: this.weatherApiKey, units: 'metric', cnt: 40 },
        })
        .pipe(
          catchError((err) => {
            this.logger.error(`Weather fetch failed: ${err.message}`);
            return of(null);
          }),
        ),
    );

    if (!response) return { available: false, daily: [] };

    const dailyMap = new Map<string, DailyWeather>();
    for (const item of response.data.list) {
      const date = item.dt_txt.split(' ')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          description: item.weather[0]?.description ?? 'unknown',
          tempMin: item.main.temp_min,
          tempMax: item.main.temp_max,
          precipitation: item.pop > 0.4,
        });
      } else {
        const existing = dailyMap.get(date)!;
        existing.tempMin = Math.min(existing.tempMin, item.main.temp_min);
        existing.tempMax = Math.max(existing.tempMax, item.main.temp_max);
        if (item.pop > 0.4) existing.precipitation = true;
      }
    }

    return { available: true, daily: Array.from(dailyMap.values()) };
  }

  private async fetchPlaces(query: string): Promise<POI[]> {
    const response = await firstValueFrom(
      this.httpService
        .get<GooglePlacesResponse>(
          'https://maps.googleapis.com/maps/api/place/textsearch/json',
          { params: { query, key: this.placesApiKey } },
        )
        .pipe(
          catchError((err) => {
            this.logger.error(`Google Places fetch failed for "${query}": ${err.message}`);
            return of(null);
          }),
        ),
    );

    if (!response || response.data.status !== 'OK') return [];

    return response.data.results.slice(0, 5).map((r) => ({
      name: r.name,
      address: r.formatted_address,
      rating: r.rating,
      types: r.types,
      priceLevel: r.price_level,
    }));
  }

  private buildPlacesQuery(destination: string, interest: string): string {
    const queryMap: Record<string, string> = {
      culture: `cultural attractions in ${destination}`,
      food: `best local restaurants in ${destination}`,
      cuisine: `local cuisine restaurants in ${destination}`,
      art: `art galleries in ${destination}`,
      history: `historical sites in ${destination}`,
      nature: `nature parks in ${destination}`,
      technology: `technology museums in ${destination}`,
      shopping: `shopping areas in ${destination}`,
      beaches: `beaches near ${destination}`,
      wellness: `spa wellness in ${destination}`,
      anime: `anime shops in ${destination}`,
      architecture: `famous architecture in ${destination}`,
      museums: `museums in ${destination}`,
      nightlife: `nightlife bars in ${destination}`,
    };
    return queryMap[interest] ?? `${interest} in ${destination}`;
  }
}
