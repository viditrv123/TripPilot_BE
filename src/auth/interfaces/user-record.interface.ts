export interface UserRecord {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
  preferences: {
    currency: string;
    language: string;
    travelStyle: string;
  };
}
