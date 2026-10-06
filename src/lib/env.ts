import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  ASSET_STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  ASSET_STORAGE_BUCKET: z.string().min(1),
  ASSET_STORAGE_ENDPOINT: z.string().url().optional().or(z.literal(""))
});

export type AppEnvironment = z.infer<typeof environmentSchema>;

let cachedEnvironment: AppEnvironment | undefined;

export function getEnvironment(
  source: NodeJS.ProcessEnv = process.env
): AppEnvironment {
  if (source === process.env && cachedEnvironment) return cachedEnvironment;

  const parsed = environmentSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(
      "Invalid application environment: " +
        parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; ")
    );
  }

  if (source === process.env) cachedEnvironment = parsed.data;
  return parsed.data;
}
