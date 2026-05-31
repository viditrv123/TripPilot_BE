import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class BudgetBreakdownDto {
  @IsNumber()
  @Min(0)
  accommodation: number = 0;

  @IsNumber()
  @Min(0)
  transport: number = 0;

  @IsNumber()
  @Min(0)
  food: number = 0;

  @IsNumber()
  @Min(0)
  activities: number = 0;

  @IsNumber()
  @Min(0)
  misc: number = 0;
}

class BudgetDto {
  @IsNumber()
  @Min(0)
  total!: number;

  @IsString()
  @IsNotEmpty()
  currency: string = 'USD';

  @IsOptional()
  @ValidateNested()
  @Type(() => BudgetBreakdownDto)
  breakdown?: BudgetBreakdownDto;
}

class TripPreferencesDto {
  @IsIn(['relaxed', 'moderate', 'fast'])
  pace: 'relaxed' | 'moderate' | 'fast' = 'moderate';

  @IsArray()
  @IsString({ each: true })
  interests: string[] = [];

  @IsString()
  travelStyle: string = 'balanced';
}

class TripConstraintsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietary?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accessibility?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  other?: string[];
}

class ActivityDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  time!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  description: string = '';

  @IsIn(['sightseeing', 'food', 'transport', 'accommodation', 'activity', 'free'])
  type!: 'sightseeing' | 'food' | 'transport' | 'accommodation' | 'activity' | 'free';

  @IsNumber()
  @Min(0)
  estimatedCost: number = 0;

  @IsString()
  duration: string = '1h';

  @IsString()
  location: string = '';
}

class ItineraryDayDto {
  @IsNumber()
  @Min(1)
  day!: number;

  @IsString()
  @IsNotEmpty()
  date!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityDto)
  activities: ActivityDto[] = [];
}

export class CreateTripDto {
  @IsString()
  @IsNotEmpty({ message: 'Trip name is required' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Destination is required' })
  destination!: string;

  @IsString()
  @IsNotEmpty({ message: 'Start date is required' })
  startDate!: string;

  @IsString()
  @IsNotEmpty({ message: 'End date is required' })
  endDate!: string;

  @IsOptional()
  @IsIn(['planning', 'upcoming', 'active', 'completed'])
  status?: 'planning' | 'upcoming' | 'active' | 'completed';

  @IsOptional()
  @ValidateNested()
  @Type(() => BudgetDto)
  budget?: BudgetDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TripPreferencesDto)
  preferences?: TripPreferencesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TripConstraintsDto)
  constraints?: TripConstraintsDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItineraryDayDto)
  itinerary?: ItineraryDayDto[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  travelers?: number;
}
