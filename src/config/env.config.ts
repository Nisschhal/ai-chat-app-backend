import { getEnv } from "../utils/get-env"

export const ENV = {
  NODE_ENV: getEnv("NODE_ENV", "development"),

  PORT: getEnv("PORT", "8000"),

  DATABASE_URL: getEnv("DATABASE_URL"),

  JWT_SECRET: getEnv("JWT_SECRET", "your-secret-key"),
  JWT_EXPIRES_IN: getEnv("JWT_EXPIRES_IN", "15m"),

  FRONTEND_ORIGIN: getEnv("FRONTEND_ORIGIN", "http://localhost:5173"),

  CLOUDINARY_CLOUD_NAME: getEnv("CLOUDINARY_CLOUD_NAME", "your-cloud-name"),
} as const
