export interface GeneratedActivity {
  time: string;
  title: string;
  description: string;
  type: 'sightseeing' | 'food' | 'transport' | 'accommodation' | 'activity' | 'free';
  estimatedCost: number;
  duration: string;
  location: string;
}

export interface GeneratedDay {
  day: number;
  date: string;
  title: string;
  activities: GeneratedActivity[];
}

export interface GeneratedItinerary {
  name: string;
  days: GeneratedDay[];
  budgetBreakdown: {
    accommodation: number;
    transport: number;
    food: number;
    activities: number;
    misc: number;
  };
  travelTips: string[];
}
