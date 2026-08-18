import 'dotenv/config';

export const env = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI,
};

if (!env.mongoUri) {
  console.error('MONGODB_URI is missing in .env');
  process.exit(1);
}