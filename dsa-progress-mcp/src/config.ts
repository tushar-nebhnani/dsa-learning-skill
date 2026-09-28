import { z } from "zod";

const envSchema = z
  .object({
    DATABASE_URL: z.string().url(),
    HOST: z.string().default("127.0.0.1"),
    PORT: z.coerce.number().int().positive().default(3333),
    /** Public base URL of this server; the OAuth issuer and the base for /mcp and the Google callback. */
    PUBLIC_URL: z.string().url().optional(),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
  })
  .transform((env) => ({
    ...env,
    PUBLIC_URL: (env.PUBLIC_URL ?? `http://localhost:${env.PORT}`).replace(/\/+$/, ""),
  }));

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${issues}`);
  }
  return parsed.data;
}
