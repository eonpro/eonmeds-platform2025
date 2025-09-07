import { Router } from "express";
const r = Router();

function mask(val?: string) {
  if (!val) return null;
  const v = String(val);
  if (v.length <= 12) return "****";
  return v.slice(0, 8) + "..." + v.slice(-4);
}

r.get("/", (_req, res) => {
  const mode = process.env.STRIPE_MODE || (process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ? "test" : "live");
  res.json({
    nodeEnv: process.env.NODE_ENV || null,
    stripeMode: mode,
    stripeKeyMasked: mask(process.env.STRIPE_SECRET_KEY),
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    buildId: process.env.BUILD_ID || process.env.RAILWAY_GIT_COMMIT_SHA || null,
  });
});

export default r;