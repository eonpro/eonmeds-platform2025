import dotenv from "dotenv";
dotenv.config();

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 8080),
  STRIPE_SECRET_KEY: req("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "", // allow missing in dev
  BUILD_ID: process.env.BUILD_ID || process.env.RAILWAY_GIT_COMMIT_SHA || "unknown",
};
