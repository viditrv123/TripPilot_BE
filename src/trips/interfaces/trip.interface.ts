export interface Activity {
  id: string;
  time: string;
  title: string;
  description: string;
  type:
    | 'sightseeing'
    | 'food'
    | 'transport'
    | 'accommodation'
    | 'activity'
    | 'free';
  estimatedCost: number;
  duration: string;
  location: string;
}

export interface ItineraryDay {
  day: number;
  date: string;
  title: string;
  activities: Activity[];
}

export interface Trip {
  id: string;
  userId: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'upcoming' | 'active' | 'completed';
  budget: {
    total: number;
    currency: string;
    breakdown: {
      accommodation: number;
      transport: number;
      food: number;
      activities: number;
      misc: number;
    };
  };
  preferences: {
    pace: 'relaxed' | 'moderate' | 'fast';
    interests: string[];
    travelStyle: string;
  };
  constraints: {
    dietary: string[];
    accessibility: string[];
    other: string[];
  };
  itinerary: ItineraryDay[];
  coverPhotoUrl?: string | null;
  travelers: number;
  createdAt: Date;
  updatedAt: Date;
}
