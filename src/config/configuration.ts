export default () => ({
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  firebase: {
    projectId: process.env['FIREBASE_PROJECT_ID'] ?? '',
    clientEmail: process.env['FIREBASE_CLIENT_EMAIL'] ?? '',
    privateKey: (process.env['FIREBASE_PRIVATE_KEY'] ?? '').replace(/\\n/g, '\n'),
  },
  frontendUrl: process.env['FRONTEND_URL'] ?? 'http://localhost:5173',
  database: {
    url: process.env['DATABASE_URL'] ?? '',
  },
  redis: {
    host: process.env['REDIS_HOST'] ?? 'localhost',
    port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
    password: process.env['REDIS_PASSWORD'] ?? '',
  },
  jwtSecret: process.env['JWT_SECRET'] ?? 'trippilot-dev-secret-change-in-production',
  jwtExpiresIn: process.env['JWT_EXPIRES_IN'] ?? '7d',
  travelApi: {
    googlePlacesKey: process.env['GOOGLE_PLACES_API_KEY'] ?? '',
    openWeatherKey: process.env['OPENWEATHER_API_KEY'] ?? '',
  },
  ai: {
    geminiApiKey: process.env['GEMINI_API_KEY'] ?? '',
  },
});
