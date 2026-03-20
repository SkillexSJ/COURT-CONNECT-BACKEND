import "dotenv/config";

const config = {
  port: Number(process.env.PORT) || 5000,
  node_env: process.env.NODE_ENV || "development",
  client_url: process.env.CLIENT_URL || "http://localhost:3000",
  database_url: process.env.DATABASE_URL!,
  better_auth_secret: process.env.BETTER_AUTH_SECRET || "court-connect-secret-key",
  better_auth_url: process.env.BETTER_AUTH_URL || "http://localhost:5000",
} as const;

export default config;
