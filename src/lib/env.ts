import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(86400),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(10),
  WORKER_POLL_MS: z.coerce.number().int().positive().default(5000),
  PAGESPEED_API_KEY: z.string().optional(),
  BROWSERLESS_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function env(): Env {
  if (_env) return _env;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${issues}`);
  }
  _env = parsed.data;
  return _env;
}
