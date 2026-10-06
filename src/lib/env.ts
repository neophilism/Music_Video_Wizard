import { z } from "zod";

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),
    ASSET_STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    ASSET_STORAGE_BUCKET: z.string().min(1),
    ASSET_STORAGE_ENDPOINT: z.string().url().optional().or(z.literal("")),
    ASSET_STORAGE_REGION: z.string().min(1).default("us-east-1"),
    ASSET_STORAGE_ACCESS_KEY_ID: z.string().optional().or(z.literal("")),
    ASSET_STORAGE_SECRET_ACCESS_KEY: z.string().optional().or(z.literal("")),
    ASSET_STORAGE_FORCE_PATH_STYLE: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    ASSET_STORAGE_LOCAL_ROOT: z.string().min(1).default(".data/assets"),
    MAX_AUDIO_UPLOAD_BYTES: z.coerce.number().int().positive().default(536870912)
  })
  .superRefine((env, ctx) => {
    const hasAccessKey = Boolean(env.ASSET_STORAGE_ACCESS_KEY_ID);
    const hasSecretKey = Boolean(env.ASSET_STORAGE_SECRET_ACCESS_KEY);
    if (hasAccessKey !== hasSecretKey) {
      ctx.addIssue({
        code: "custom",
        path: ["ASSET_STORAGE_ACCESS_KEY_ID"],
        message: "S3 access key and secret key must be supplied together"
      });
    }
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
