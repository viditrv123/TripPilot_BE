import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { GeneratedItinerary } from './interfaces/generated-itinerary.interface.js';
import { POI } from '../travel-api/interfaces/poi.interface.js';
import { WeatherForecast } from '../travel-api/interfaces/weather.interface.js';

export interface GenerateItineraryParams {
  destination: string;
  startDate: string;
  endDate: string;
  budget: { total: number; currency: string };
  preferences: { pace: string; interests: string[]; travelStyle: string };
  constraints: { dietary: string[]; accessibility: string[]; other: string[] };
  travelers: number;
  pois: POI[];
  weather: WeatherForecast;
}

const SYSTEM_PROMPT = `You are an expert travel planner with deep knowledge of destinations worldwide. Your task is to create detailed, realistic, and personalized day-by-day travel itineraries.

When planning itineraries:
- Structure activities logically to minimize unnecessary travel between locations — cluster nearby sights together
- Schedule 3-5 activities per day adjusted to the pace: relaxed (3), moderate (4), fast (5)
- Always include meal breaks (breakfast, lunch, dinner) at appropriate times with realistic restaurant suggestions
- Estimate costs accurately for the destination's price level and the user's travel style
- Account for all dietary restrictions and accessibility requirements
- When POI data is provided, prefer those real places; supplement with your own knowledge
- If rain is forecasted for a day, prioritize indoor activities for that day
- Distribute the total budget across the breakdown categories realistically
- Return a trip name that is catchy and reflects the destination and travel style`;

const ITINERARY_SCHEMA = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: 'A catchy trip name, e.g. "Tokyo Tech & Ramen Adventure"',
    },
    days: {
      type: 'array',
      description: 'One object per day of the trip',
      items: {
        type: 'object',
        properties: {
          day: { type: 'number', description: 'Day number starting at 1' },
          date: { type: 'string', description: 'ISO date YYYY-MM-DD' },
          title: { type: 'string', description: 'Theme title for this day' },
          activities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                time: { type: 'string', description: 'Start time, e.g. "09:00"' },
                title: { type: 'string' },
                description: { type: 'string', description: 'Short 1–2 sentence description' },
                type: {
                  type: 'string',
                  enum: ['sightseeing', 'food', 'transport', 'accommodation', 'activity', 'free'],
                },
                estimatedCost: { type: 'number', description: 'Cost per person in trip currency' },
                duration: { type: 'string', description: 'e.g. "2h" or "1.5h"' },
                location: { type: 'string' },
              },
              required: ['time', 'title', 'description', 'type', 'estimatedCost', 'duration', 'location'],
            },
          },
        },
        required: ['day', 'date', 'title', 'activities'],
      },
    },
    budgetBreakdown: {
      type: 'object',
      description: 'Total budget split across categories (sum should ≈ total budget)',
      properties: {
        accommodation: { type: 'number' },
        transport: { type: 'number' },
        food: { type: 'number' },
        activities: { type: 'number' },
        misc: { type: 'number' },
      },
      required: ['accommodation', 'transport', 'food', 'activities', 'misc'],
    },
    travelTips: {
      type: 'array',
      description: '4-6 practical travel tips specific to this destination and trip',
      items: { type: 'string' },
    },
  },
  required: ['name', 'days', 'budgetBreakdown', 'travelTips'],
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly ai: GoogleGenAI;

  constructor(private readonly configService: ConfigService) {
    this.ai = new GoogleGenAI({
      apiKey: this.configService.get<string>('ai.geminiApiKey') ?? '',
    });
  }

  async generateItinerary(params: GenerateItineraryParams): Promise<GeneratedItinerary> {
    const userMessage = this.buildUserMessage(params);

    this.logger.log(
      `Generating itinerary for ${params.destination} (${params.startDate} → ${params.endDate})`,
    );

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userMessage,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: ITINERARY_SCHEMA,
        temperature: 0.7,
      },
    });

    const text = response.text;

    if (!text) {
      throw new InternalServerErrorException('AI returned an empty response');
    }

    try {
      const itinerary = JSON.parse(text) as GeneratedItinerary;
      this.logger.log(`Itinerary generated for ${params.destination}`);
      return itinerary;
    } catch {
      this.logger.error(`Failed to parse AI response: ${text.slice(0, 200)}`);
      throw new InternalServerErrorException('AI returned malformed JSON');
    }
  }

  private buildUserMessage(params: GenerateItineraryParams): string {
    const {
      destination,
      startDate,
      endDate,
      budget,
      preferences,
      constraints,
      travelers,
      pois,
      weather,
    } = params;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const lines: string[] = [
      '## Trip Request',
      `- **Destination:** ${destination}`,
      `- **Dates:** ${startDate} → ${endDate} (${days} days)`,
      `- **Travelers:** ${travelers}`,
      `- **Total budget:** ${budget.total} ${budget.currency}`,
      `- **Travel pace:** ${preferences.pace}`,
      `- **Travel style:** ${preferences.travelStyle}`,
      `- **Interests:** ${preferences.interests.join(', ') || 'general tourism'}`,
    ];

    if (constraints.dietary.length > 0) {
      lines.push(`- **Dietary restrictions:** ${constraints.dietary.join(', ')}`);
    }
    if (constraints.accessibility.length > 0) {
      lines.push(`- **Accessibility needs:** ${constraints.accessibility.join(', ')}`);
    }
    if (constraints.other.length > 0) {
      lines.push(`- **Other constraints:** ${constraints.other.join(', ')}`);
    }

    if (pois.length > 0) {
      lines.push('', '## Available Points of Interest');
      for (const poi of pois) {
        const rating = poi.rating ? ` — ⭐ ${poi.rating}` : '';
        const price = poi.priceLevel !== undefined ? ` (price level: ${poi.priceLevel}/4)` : '';
        lines.push(`- **${poi.name}**${rating}${price}: ${poi.address}`);
      }
    }

    if (weather.available && weather.daily.length > 0) {
      lines.push('', '## Weather Forecast');
      for (const day of weather.daily) {
        const rain = day.precipitation ? ' — 🌧 Rain likely' : '';
        lines.push(
          `- **${day.date}:** ${day.description}, ${Math.round(day.tempMin)}–${Math.round(day.tempMax)}°C${rain}`,
        );
      }
    }

    lines.push('', `Please generate a complete ${days}-day itinerary for this trip.`);

    return lines.join('\n');
  }
}
