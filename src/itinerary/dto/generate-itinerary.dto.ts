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

class GenerateBudgetDto {
  @IsNumber()
  @Min(0)
  total: number = 0;

  @IsOptional()
  @IsString()
  currency?: string = 'USD';
}

class GeneratePreferencesDto {
  @IsOptional()
  @IsIn(['relaxed', 'moderate', 'fast'])
  pace?: 'relaxed' | 'moderate' | 'fast';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsString()
  travelStyle?: string;
}

class GenerateConstraintsDto {
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

export class GenerateItineraryDto {
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
  @IsString()
  name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => GenerateBudgetDto)
  budget?: GenerateBudgetDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => GeneratePreferencesDto)
  preferences?: GeneratePreferencesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => GenerateConstraintsDto)
  constraints?: GenerateConstraintsDto;

  @IsOptional()
  @IsNumber()
  @Min(1)
  travelers?: number;
}
