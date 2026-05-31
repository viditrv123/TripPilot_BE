export interface DailyWeather {
  date: string;
  description: string;
  tempMin: number;
  tempMax: number;
  precipitation: boolean;
}

export interface WeatherForecast {
  available: boolean;
  daily: DailyWeather[];
}
