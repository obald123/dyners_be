import "dotenv/config";
import { cleanEnv, str, port, num } from "envalid";

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ["development", "test", "production"], default: "development" }),
  PORT: port({ default: 4000 }),
  DATABASE_URL: str(),
  JWT_ACCESS_SECRET: str(),
  ACCESS_TOKEN_TTL_MIN: num({ default: 15 }),
  REFRESH_TOKEN_TTL_DAYS: num({ default: 30 }),
  CORS_ORIGINS: str({ default: "http://localhost:3000" }),
  CLOUDINARY_CLOUD_NAME: str({ default: "" }),
  CLOUDINARY_API_KEY: str({ default: "" }),
  CLOUDINARY_API_SECRET: str({ default: "" }),
  GMAIL_USER: str({ default: "" }),
  GMAIL_APP_PASSWORD: str({ default: "" }),
  RESEND_API_KEY: str({ default: "" }),
  CONTACT_TO_EMAIL: str({ default: "dyners@gmail.com" }),
});

export const corsOrigins = env.CORS_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
